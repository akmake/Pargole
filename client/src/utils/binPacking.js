/**
 * ════════════════════════════════════════════════════════════════════
 *  1D Bin Packing — Pergola Cut Optimization
 * ════════════════════════════════════════════════════════════════════
 *
 * Algorithm: First Fit Decreasing (FFD)
 *   1. Sort required pieces descending by length.
 *   2. For each piece, place it in the first open bar where it fits.
 *   3. If no existing bar fits, open a new one.
 *
 * Material-specific rules:
 *   Aluminum / Steel : fixed stock = 6.00 m
 *   Wood             : variable stock from WOOD_STOCKS array;
 *                      choose the stock length that minimises total waste.
 */

// ── Constants ────────────────────────────────────────────────────────
const ALUMINUM_STOCK_M = 6.0;

// Wood available in steps of 30 cm from 3.0 m to 6.0 m
export const WOOD_STOCKS = [3.0, 3.3, 3.6, 3.9, 4.2, 4.5, 4.8, 5.1, 5.4, 5.7, 6.0];

// ── Core FFD ─────────────────────────────────────────────────────────
/**
 * Run First Fit Decreasing on `pieces` against a fixed `stockLength`.
 * Returns an array of bar objects { cuts[], remaining }.
 */
function firstFitDecreasing(pieces, stockLength) {
  const sorted = [...pieces].sort((a, b) => b - a);
  const bars = []; // { cuts: number[], remaining: number }

  for (const piece of sorted) {
    if (piece > stockLength) {
      // This piece is longer than any available bar — cannot pack.
      // Caller should warn the user to request a custom length.
      bars.push({ cuts: [piece], remaining: 0, overflow: true });
      continue;
    }
    let placed = false;
    for (const bar of bars) {
      if (!bar.overflow && bar.remaining >= piece - 1e-9) {
        bar.cuts.push(piece);
        bar.remaining = +(bar.remaining - piece).toFixed(4);
        placed = true;
        break;
      }
    }
    if (!placed) {
      bars.push({ cuts: [piece], remaining: +(stockLength - piece).toFixed(4) });
    }
  }
  return bars;
}

// ── Human-readable instruction string ────────────────────────────────
function barInstruction(barIndex, stockLen, cuts, remaining) {
  const cutStr = cuts
    .map((c, i) => `חתיכה ${i + 1}: ${c.toFixed(2)} מ'`)
    .join(' | ');
  const wasteStr = remaining > 0 ? `שארית: ${remaining.toFixed(2)} מ'` : 'שארית: 0 (ללא פחת)';
  return `קורה ${barIndex} (${stockLen.toFixed(1)} מ'): ${cutStr}. ${wasteStr}`;
}

// ── Public: pack aluminum or steel (fixed 6 m) ────────────────────────
export function packAluminum(pieces) {
  if (!pieces || pieces.length === 0) return emptyResult(ALUMINUM_STOCK_M);

  const bars = firstFitDecreasing(pieces, ALUMINUM_STOCK_M);
  const overflows = bars.filter(b => b.overflow);
  const normal    = bars.filter(b => !b.overflow);
  const totalWaste = +(normal.reduce((s, b) => s + b.remaining, 0)).toFixed(3);
  const totalUsed  = +(pieces.reduce((s, p) => s + p, 0)).toFixed(3);

  return {
    stockLength: ALUMINUM_STOCK_M,
    bars: bars.map((b, i) => ({
      barIndex: i + 1,
      cuts: b.cuts.map(c => +c.toFixed(3)),
      waste: +(b.remaining).toFixed(3),
      overflow: !!b.overflow,
      instruction: barInstruction(i + 1, ALUMINUM_STOCK_M, b.cuts, b.remaining),
    })),
    totalBars: bars.length,
    totalWasteM: totalWaste,
    totalUsedM: totalUsed,
    efficiencyPct: bars.length > 0
      ? +(totalUsed / (bars.length * ALUMINUM_STOCK_M) * 100).toFixed(1)
      : 0,
    overflowPieces: overflows.flatMap(b => b.cuts),
    warnings: overflows.length > 0
      ? [`⚠ ${overflows.length} חתיכה/ות ארוכות מ-${ALUMINUM_STOCK_M} מ' — נדרש חומר מיוחד!`]
      : [],
  };
}

// ── Public: pack wood (choose optimal stock from WOOD_STOCKS) ─────────
export function packWood(pieces) {
  if (!pieces || pieces.length === 0) return emptyResult(6.0);

  const maxPiece = Math.max(...pieces);
  const eligibleStocks = WOOD_STOCKS.filter(s => s >= maxPiece - 1e-9);

  if (eligibleStocks.length === 0) {
    // All available stock sizes are too short — use 6.0m and mark overflow
    return packWithStock(pieces, 6.0, true);
  }

  // Evaluate each eligible stock length and pick minimum waste
  let best = null;

  for (const stockLen of eligibleStocks) {
    const bars     = firstFitDecreasing(pieces, stockLen);
    const waste    = bars.reduce((s, b) => s + (b.overflow ? 0 : b.remaining), 0);
    const numBars  = bars.length;
    // Score: minimise waste first; break ties by fewest bars
    const score    = waste + numBars * 0.001;

    if (best === null || score < best.score) {
      best = { stockLen, bars, waste, numBars, score };
    }
  }

  const result  = packWithStock(pieces, best.stockLen, false, best.bars);
  result.allOptions = eligibleStocks.map(sl => {
    const b2 = firstFitDecreasing(pieces, sl);
    return {
      stockLength: sl,
      numBars: b2.length,
      totalWasteM: +(b2.reduce((s, b) => s + (b.overflow ? 0 : b.remaining), 0)).toFixed(3),
    };
  });
  return result;
}

function packWithStock(pieces, stockLen, forceOverflow = false, precomputedBars = null) {
  const bars      = precomputedBars || firstFitDecreasing(pieces, stockLen);
  const overflows = bars.filter(b => b.overflow);
  const totalWaste = +(bars.filter(b => !b.overflow).reduce((s, b) => s + b.remaining, 0)).toFixed(3);
  const totalUsed  = +(pieces.reduce((s, p) => s + p, 0)).toFixed(3);

  return {
    stockLength: stockLen,
    bars: bars.map((b, i) => ({
      barIndex: i + 1,
      cuts: b.cuts.map(c => +c.toFixed(3)),
      waste: +b.remaining.toFixed(3),
      overflow: !!b.overflow,
      instruction: barInstruction(i + 1, stockLen, b.cuts, b.remaining),
    })),
    totalBars: bars.length,
    totalWasteM: totalWaste,
    totalUsedM: totalUsed,
    efficiencyPct: bars.length > 0
      ? +(totalUsed / (bars.length * stockLen) * 100).toFixed(1)
      : 0,
    overflowPieces: overflows.flatMap(b => b.cuts),
    warnings: overflows.length > 0
      ? [`⚠ ${overflows.length} חתיכה/ות ארוכות מ-${stockLen} מ'`]
      : [],
  };
}

function emptyResult(stockLen) {
  return {
    stockLength: stockLen,
    bars: [],
    totalBars: 0,
    totalWasteM: 0,
    totalUsedM: 0,
    efficiencyPct: 100,
    overflowPieces: [],
    warnings: [],
  };
}

// ── Public: pack with any custom stock length ─────────────────────────
export function packCustom(pieces, stockLength) {
  if (!pieces || pieces.length === 0) return emptyResult(stockLength);
  return packWithStock(pieces, stockLength);
}

// ── Public: generate full cut plan from cutList ───────────────────────
/**
 * Groups cut-list rows by profile, runs bin packing per profile,
 * and returns an array of {profileLabel, packResult} objects.
 *
 * @param {Array}  cutList          - from pergolaEngine result.cutList
 * @param {string} materialCategory - 'wood'|'aluminum'|'steel'
 */
export function generateCutPlan(cutList, materialCategory) {
  if (!cutList || cutList.length === 0) return [];

  // Group by profile
  const byProfile = {};
  for (const item of cutList) {
    if (!byProfile[item.profile]) byProfile[item.profile] = [];
    for (let i = 0; i < item.qty; i++) {
      byProfile[item.profile].push(item.lengthM);
    }
  }

  const packFn = (materialCategory === 'aluminum' || materialCategory === 'steel')
    ? packAluminum
    : packWood;

  return Object.entries(byProfile).map(([profile, pieces]) => ({
    profile,
    pieces: pieces.map(p => +p.toFixed(3)),
    packResult: packFn(pieces),
  }));
}

// ── Public: generate combined cut plan for multiple pergolas ──────────
/**
 * Merges cut lists from multiple saved pergolas, groups by profile,
 * and runs bin packing with optional custom stock lengths.
 *
 * @param {Array}  projects        - [{ cutList, materialCategory }]
 * @param {Object} stockOverrides  - { aluminum: number|null, wood: number|null }
 *                                   null = use default/auto logic
 * @returns {Array}                - [{ profile, materialCategory, pieces, packResult }]
 */
export function generateProjectCutPlan(projects, stockOverrides = {}) {
  if (!projects || projects.length === 0) return [];

  // Merge all cuts grouped by profile + materialCategory
  const byKey = {};
  for (const { cutList, materialCategory } of projects) {
    if (!cutList) continue;
    for (const item of cutList) {
      const key = `${item.profile}||${materialCategory}`;
      if (!byKey[key]) byKey[key] = { profile: item.profile, materialCategory, pieces: [] };
      for (let i = 0; i < item.qty; i++) {
        byKey[key].pieces.push(item.lengthM);
      }
    }
  }

  return Object.values(byKey).map(({ profile, materialCategory, pieces }) => {
    const isWood = materialCategory === 'wood';
    let packResult;

    if (isWood) {
      const override = stockOverrides.wood;
      packResult = override ? packCustom(pieces, override) : packWood(pieces);
    } else {
      const stockLen = stockOverrides.aluminum || ALUMINUM_STOCK_M;
      packResult = packCustom(pieces, stockLen);
    }

    return { profile, materialCategory, pieces: pieces.map(p => +p.toFixed(3)), packResult };
  });
}
