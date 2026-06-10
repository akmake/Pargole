/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  Clash Detection — geometric collision validator for pergola elements
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Mirrors the exact placement math of PergolaViewer3D:
 *   - Beam:   y = bottom face, box spans [y, y+h], cross-width centred on axis
 *   - Column: centred on (x, z), spans [0, height]
 *   - Y stacking: yMain = height → ySecB = yMain + mbH → yRaft = ySecB + sbH
 *
 * Touching faces (column top ↔ beam bottom, sec-beam resting on main beam,
 * elements flush against the wall) are NOT clashes — an overlap must exceed
 * EPS metres on ALL three axes to be reported.
 *
 * Intentionally skipped:
 *   - louver ↔ louver overlap (blades overlap by design when closed)
 *   - bracing diagonals & solid roof plane (rotated boxes, joint contacts)
 */

const EPS = 0.005; // 5 mm tolerance — below this, contact is considered a joint

const TYPE_LABELS = {
  column:   'עמוד',
  mainBeam: 'קורה ראשית',
  ledger:   "קורת קשר (לדג'ר)",
  secBeam:  'קורה משנית',
  rafter:   'שלב (רפטר)',
  louver:   'לובר',
  wall:     'קיר',
};

/** Axis-aligned box: { type, label, min:[x,y,z], max:[x,y,z] } */
function box(type, index, min, max) {
  return { type, label: `${TYPE_LABELS[type]} #${index + 1}`, min, max };
}

/**
 * Build AABBs for every rendered structural element from an engine result.
 */
export function buildElementBoxes(result) {
  const { layout3D, profiles, input } = result;
  if (!layout3D) return [];

  const height = input.height;
  const colW = (profiles.column?.w   ?? 10) / 100;
  const colH = (profiles.column?.h   ?? 10) / 100;
  const mbW  = (profiles.mainBeam?.w ?? 5)  / 100;
  const mbH  = (profiles.mainBeam?.h ?? 15) / 100;
  const sbW  = (profiles.secBeam?.w  ?? 4)  / 100;
  const sbH  = (profiles.secBeam?.h  ?? 10) / 100;
  const rfW  = (profiles.rafter?.w   ?? 3)  / 100;
  const rfH  = (profiles.rafter?.h   ?? 8)  / 100;

  const yMain = height;
  const ySecB = yMain + mbH;
  const yRaft = ySecB + sbH;

  const isLouvers = input.roofType === 'louvers';
  const boxes = [];

  (layout3D.columns ?? []).forEach((c, i) =>
    boxes.push(box('column', i,
      [c.x - colW / 2, 0, c.z - colH / 2],
      [c.x + colW / 2, c.height ?? height, c.z + colH / 2]))
  );

  (layout3D.mainBeams ?? []).forEach((b, i) =>
    boxes.push(box(b.isLedger ? 'ledger' : 'mainBeam', i,
      [b.x, yMain, b.z - mbW / 2],
      [b.x + b.length, yMain + mbH, b.z + mbW / 2]))
  );

  (layout3D.secBeams ?? []).forEach((b, i) =>
    boxes.push(box('secBeam', i,
      [b.x - sbW / 2, ySecB, b.z],
      [b.x + sbW / 2, ySecB + sbH, b.z + b.length]))
  );

  (layout3D.rafters ?? []).forEach((r, i) => {
    const w = isLouvers ? 0.16 : rfW; // closed louver blade = 160 mm
    boxes.push(box(isLouvers ? 'louver' : 'rafter', i,
      [r.x, yRaft, r.z - w / 2],
      [r.x + r.length, yRaft + (isLouvers ? 0.01 : rfH), r.z + w / 2]));
  });

  if (layout3D.wall) {
    const w = layout3D.wall;
    boxes.push(box('wall', 0,
      [-0.25, 0, -0.26],
      [w.width + 0.25, w.height, 0]));
  }

  return boxes;
}

/** Overlap of [aMin,aMax] and [bMin,bMax] (negative = gap). */
function axisOverlap(aMin, aMax, bMin, bMax) {
  return Math.min(aMax, bMax) - Math.max(aMin, bMin);
}

function isSkippedPair(a, b) {
  // Closed louver blades overlap each other by design
  if (a.type === 'louver' && b.type === 'louver') return true;
  return false;
}

/**
 * Detect unintended overlaps between all element pairs.
 * Returns { ok, clashes: [{a, b, overlap, penetrationCM}], warnings: [string] }
 */
export function detectClashes(result, eps = EPS) {
  const boxes = buildElementBoxes(result);
  const clashes = [];

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (isSkippedPair(a, b)) continue;

      const ox = axisOverlap(a.min[0], a.max[0], b.min[0], b.max[0]);
      const oy = axisOverlap(a.min[1], a.max[1], b.min[1], b.max[1]);
      const oz = axisOverlap(a.min[2], a.max[2], b.min[2], b.max[2]);

      if (ox > eps && oy > eps && oz > eps) {
        const penetration = Math.min(ox, oy, oz);
        clashes.push({
          a: a.label, b: b.label,
          aType: a.type, bType: b.type,
          overlap: [+ox.toFixed(4), +oy.toFixed(4), +oz.toFixed(4)],
          penetrationCM: +(penetration * 100).toFixed(1),
        });
      }
    }
  }

  // Compact human-readable summary (grouped by pair type, capped)
  const seen = new Map();
  for (const c of clashes) {
    const key = `${c.aType}|${c.bType}`;
    const e = seen.get(key) ?? { count: 0, maxPen: 0, sample: c };
    e.count += 1;
    if (c.penetrationCM > e.maxPen) { e.maxPen = c.penetrationCM; e.sample = c; }
    seen.set(key, e);
  }
  const warnings = [...seen.values()].map(({ count, maxPen, sample }) =>
    `⚠ התנגשות גיאומטרית: ${TYPE_LABELS[sample.aType]} ↔ ${TYPE_LABELS[sample.bType]}` +
    (count > 1 ? ` (${count} מופעים, ` : ' (') +
    `חדירה עד ${maxPen} ס"מ) — יש לעדכן מידות/כמויות`
  );

  return { ok: clashes.length === 0, clashes, warnings };
}
