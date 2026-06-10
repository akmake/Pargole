import { describe, it, expect } from 'vitest';
import {
  calculatePergola, MATERIALS, INSTALLATION_TYPES, ROOF_TYPES,
} from '../pergolaEngine.js';
import { detectClashes, buildElementBoxes } from '../clashDetection.js';

const SIZES = [
  { length: 2,  width: 2, height: 2.2 },  // tiny
  { length: 4,  width: 3, height: 2.7 },  // typical
  { length: 8,  width: 5, height: 3.5 },  // large (forces multiple column rows)
  { length: 12, width: 6, height: 4.0 },  // extreme
];

describe('clash sweep — no element collisions in any standard configuration', () => {
  for (const matKey of Object.keys(MATERIALS)) {
    for (const installType of Object.keys(INSTALLATION_TYPES)) {
      for (const roofType of Object.keys(ROOF_TYPES)) {
        for (const size of SIZES) {
          const name = `${matKey} / ${installType} / ${roofType} / ${size.length}x${size.width}x${size.height}`;
          it(name, () => {
            const result = calculatePergola({
              ...size,
              material: matKey,
              installType,
              roofType,
              foundationType: 'earthBore',
              overhangCM: 20,
              slopePercent: 2,
            });
            const report = result.clashReport;
            expect(report.ok,
              `clashes in ${name}:\n` +
              report.clashes.slice(0, 5).map(c => `  ${c.a} ↔ ${c.b} pen=${c.penetrationCM}cm`).join('\n')
            ).toBe(true);
          });
        }
      }
    }
  }
});

describe('wall-mounted geometry', () => {
  it('wide wall-mounted pergola has no column row inside the wall', () => {
    // width 5 m with pine (maxMainSpan 3.5 m) → 2 column rows
    const r = calculatePergola({
      length: 6, width: 5, height: 2.7,
      material: 'pine', installType: 'wallMounted', roofType: 'openSlats',
    });
    expect(r.structure.colRowsWidth).toBeGreaterThanOrEqual(2);
    for (const col of r.layout3D.columns) {
      expect(col.z).toBeGreaterThan(0.5);
    }
  });

  it('only the ledger sits at the wall line — no duplicate main beam', () => {
    const r = calculatePergola({
      length: 6, width: 5, height: 2.7,
      material: 'pine', installType: 'wallMounted', roofType: 'openSlats',
    });
    const beamsAtWall = r.layout3D.mainBeams.filter(b => b.z < 0.2);
    expect(beamsAtWall).toHaveLength(1);
    expect(beamsAtWall[0].isLedger).toBe(true);
  });

  it('ledger is offset off the wall face by half its width', () => {
    const r = calculatePergola({
      length: 4, width: 3, height: 2.7,
      material: 'pine', installType: 'wallMounted', roofType: 'openSlats',
    });
    const ledger = r.layout3D.mainBeams.find(b => b.isLedger);
    expect(ledger.z).toBeCloseTo(r.profiles.mainBeam.w / 200, 5);
  });

  it('first rafter clears the wall face', () => {
    const r = calculatePergola({
      length: 4, width: 3, height: 2.7,
      material: 'pine', installType: 'wallMounted', roofType: 'openSlats',
    });
    const halfW = r.profiles.rafter.w / 200;
    for (const raft of r.layout3D.rafters) {
      expect(raft.z - halfW).toBeGreaterThanOrEqual(-1e-9);
    }
  });
});

describe('BOM consistency', () => {
  it('wall-mounted BOM does not double-count the ledger', () => {
    const r = calculatePergola({
      length: 4, width: 3, height: 2.7,
      material: 'pine', installType: 'wallMounted', roofType: 'openSlats',
    });
    const mainRow   = r.cutList.find(c => c.part === 'קורה ראשית');
    const ledgerRow = r.cutList.find(c => c.part.includes('Ledger'));
    expect(ledgerRow.qty).toBe(1);
    // main beams in BOM must equal the rendered non-ledger beams
    const rendered = r.layout3D.mainBeams.filter(b => !b.isLedger).length;
    expect(mainRow.qty).toBe(rendered);
  });

  it('total cut-list beam count matches the 3D scene', () => {
    for (const installType of ['freestanding', 'wallMounted', 'cornerMounted']) {
      const r = calculatePergola({
        length: 5, width: 4, height: 2.8,
        material: 'aluminum', installType, roofType: 'openSlats',
      });
      const mainQty   = r.cutList.find(c => c.part === 'קורה ראשית')?.qty ?? 0;
      const ledgerQty = r.cutList.find(c => c.part.includes('Ledger'))?.qty ?? 0;
      expect(mainQty + ledgerQty).toBe(r.layout3D.mainBeams.length);
    }
  });
});

describe('manual overrides — overlaps are detected, not silently rendered', () => {
  it('absurd rafter count produces a clash report + warning', () => {
    const r = calculatePergola({
      length: 4, width: 3, height: 2.7,
      material: 'pine', installType: 'freestanding', roofType: 'openSlats',
      manualRafterCount: 200,
    });
    expect(r.clashReport.ok).toBe(false);
    expect(r.warnings.some(w => w.includes('חפיפה'))).toBe(true);
  });

  it('absurd column count produces an overlap warning', () => {
    const r = calculatePergola({
      length: 2, width: 2, height: 2.5,
      material: 'pine', installType: 'freestanding', roofType: 'openSlats',
      manualColsAlongLength: 50,
    });
    expect(r.warnings.some(w => w.includes('עמודים') && w.includes('חפיפה'))).toBe(true);
  });
});

describe('deflection checks', () => {
  it('returns a check per structural member with sane values', () => {
    const r = calculatePergola({
      length: 4, width: 3, height: 2.7,
      material: 'pine', installType: 'freestanding', roofType: 'openSlats',
    });
    expect(r.deflectionChecks.length).toBeGreaterThanOrEqual(2);
    for (const dc of r.deflectionChecks) {
      expect(dc.deflectionMM).toBeGreaterThanOrEqual(0);
      expect(dc.limitMM).toBeCloseTo(dc.spanM * 5, 1); // L/200 in mm
      expect(typeof dc.ok).toBe('boolean');
    }
  });

  it('default profiles pass on a typical pergola', () => {
    const r = calculatePergola({
      length: 4, width: 3, height: 2.7,
      material: 'aluminum', installType: 'wallMounted', roofType: 'openSlats',
    });
    expect(r.deflectionChecks.every(dc => dc.ok)).toBe(true);
  });

  it('an undersized main beam over a huge span fails and warns', () => {
    const r = calculatePergola({
      length: 8, width: 3, height: 2.7,
      material: 'pine', installType: 'freestanding', roofType: 'denseSlats',
      mainBeamProfile: '5x10',
      manualColsAlongLength: 2, // force a single 8 m span
    });
    const main = r.deflectionChecks.find(dc => dc.element === 'קורה ראשית');
    expect(main.ok).toBe(false);
    expect(r.warnings.some(w => w.includes('שקיעה'))).toBe(true);
  });
});

describe('clash detector primitives', () => {
  it('builds boxes for every rendered element', () => {
    const r = calculatePergola({
      length: 4, width: 3, height: 2.7,
      material: 'pine', installType: 'wallMounted', roofType: 'openSlats',
    });
    const boxes = buildElementBoxes(r);
    const expected =
      r.layout3D.columns.length + r.layout3D.mainBeams.length +
      r.layout3D.secBeams.length + r.layout3D.rafters.length + 1; // +wall
    expect(boxes).toHaveLength(expected);
  });

  it('touching faces are not clashes; real overlap is', () => {
    const fake = {
      input: { height: 2.7, roofType: 'openSlats' },
      profiles: {
        column: { w: 10, h: 10 }, mainBeam: { w: 10, h: 15 },
        secBeam: { w: 5, h: 20 }, rafter: { w: 5, h: 15 },
      },
      layout3D: {
        // column top (y=2.7) touches beam bottom (y=2.7) → no clash
        columns: [{ x: 0, y: 0, z: 0, height: 2.7 }],
        mainBeams: [{ x: -0.2, y: 2.7, z: 0, length: 4.4, direction: 'x' }],
        secBeams: [], rafters: [], wall: null,
      },
    };
    expect(detectClashes(fake).ok).toBe(true);

    // two identical overlapping beams → clash
    fake.layout3D.mainBeams.push({ x: -0.2, y: 2.7, z: 0, length: 4.4, direction: 'x' });
    const report = detectClashes(fake);
    expect(report.ok).toBe(false);
    expect(report.clashes[0].penetrationCM).toBeGreaterThan(0);
  });
});
