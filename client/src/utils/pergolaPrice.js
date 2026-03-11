/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  Pergola Pricing Module — v2
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Pricing formula (spec §5.3 — exact, confirmed by client):
 *
 *   finalPrice = (materialCost + laborHours × HOURLY_RATE) × BLT_AM × PROFIT_MARKUP
 *
 * Where:
 *   HOURLY_RATE   = 250 ₪/hr                 (spec §5.1)
 *   BLT_AM        = 1.15  (15% contingency)  (spec §5.2)
 *   PROFIT_MARKUP = 1.30  (30% profit)       (spec §5.3)
 *
 * Floor surcharge (spec §5.4):
 *   Floor 0  → 0 ₪
 *   Floor 1–4 → 150 ₪ per floor (manual carry)
 *   Floor 5+  → crane required; manual surcharge blocked
 *
 * Crane cost (spec §5.5):
 *   standard arm (≤ floor 4) → 800 ₪
 *   heavy / basket (floor 5+) → 1,500 ₪
 *   none → 0 ₪
 */

// ── Spec constants ────────────────────────────────────────────────────
const HOURLY_RATE       = 250;   // ₪/hr  (spec §5.1)
const BLT_AM            = 1.15;  //        (spec §5.2)
const PROFIT_MARKUP     = 1.30;  //        (spec §5.3)
const FLOOR_RATE        = 150;   // ₪/floor (spec §5.4)
const MAX_MANUAL_FLOORS = 4;     //         (spec §5.4)
const CRANE_STANDARD    = 800;   // ₪       (spec §5.5)
const CRANE_HEAVY       = 1500;  // ₪       (spec §5.5)

/**
 * Calculate full pricing from engine result.
 *
 * @param {Object} result        - calculatePergola() return value
 * @param {Object} pricingParams - { floorNumber: number, craneType: 'none'|'standard'|'heavy' }
 */
export function calcTotalPrice(result, pricingParams = {}) {
  const { floorNumber = 0, craneType = 'none' } = pricingParams;

  // ── Raw costs from engine ──────────────────────────────────────────────
  const matCost    = result.summary?.materialCost ?? 0;
  const hwCost     = result.hardwareCost           ?? 0;
  const roofCost   = result.roofMaterialCost       ?? 0;
  const foundCost  = result.foundationCost         ?? 0;
  const fnCost     = result.finishCost             ?? 0;
  const sideCost   = result.totalSideCost          ?? 0;
  const lightCost  = result.lightingCost           ?? 0;
  const gutCost    = result.gutterCost             ?? 0;
  const ledgCost   = result.ledgerCost             ?? 0;

  const totalMaterialCost = matCost + hwCost + roofCost + foundCost
                          + fnCost + sideCost + lightCost + gutCost + ledgCost;

  // ── Labour ────────────────────────────────────────────────────────────
  const laborHours = result.laborHours ?? 0;
  const laborCost  = laborHours * HOURLY_RATE;

  // ── Core formula (spec §5.3) ──────────────────────────────────────────
  const baseCost      = totalMaterialCost + laborCost;
  const withBltAm     = +(baseCost * BLT_AM).toFixed(2);
  const contractorNet = +(withBltAm * PROFIT_MARKUP).toFixed(2);

  // ── Floor surcharge (spec §5.4) ───────────────────────────────────────
  let floorSurcharge = 0;
  let craneForced    = false;
  let floorNote      = '';

  if (floorNumber <= 0) {
    floorNote = 'קומת קרקע — ללא תוספת סבלות';
  } else if (floorNumber <= MAX_MANUAL_FLOORS) {
    floorSurcharge = floorNumber * FLOOR_RATE;
    floorNote = `קומה ${floorNumber} × ₪${FLOOR_RATE} = ₪${floorSurcharge} סבלות ידנית`;
  } else {
    craneForced = true;
    floorNote   = `קומה ${floorNumber} — מנוף חובה (סבלות ידנית לא אפשרית מעל קומה ${MAX_MANUAL_FLOORS})`;
  }

  // ── Crane (spec §5.5) ─────────────────────────────────────────────────
  const effectiveCrane = craneForced ? 'heavy' : craneType;
  const craneCost = effectiveCrane === 'heavy'    ? CRANE_HEAVY
                  : effectiveCrane === 'standard' ? CRANE_STANDARD
                  : 0;
  const craneNote = effectiveCrane === 'heavy'    ? `מנוף סל/משא כבד — ₪${CRANE_HEAVY}`
                  : effectiveCrane === 'standard' ? `מנוף זרוע סטנדרטי — ₪${CRANE_STANDARD}`
                  : 'ללא מנוף';

  // ── Grand total ───────────────────────────────────────────────────────
  const total       = +(contractorNet + floorSurcharge + craneCost).toFixed(2);
  const pricePerSqM = result.coverage?.area > 0
    ? +(total / result.coverage.area).toFixed(0)
    : 0;

  // ── Breakdown ─────────────────────────────────────────────────────────
  const breakdown = [
    { label: 'חומרי מבנה (פרופילים)', cost: +matCost.toFixed(2) },
    { label: 'חומרי גג',             cost: +roofCost.toFixed(2) },
    { label: 'ברגים ואביזרים',        cost: +hwCost.toFixed(2) },
    { label: 'יסודות',               cost: +foundCost.toFixed(2) },
    { label: "עוגני לדג'ר",          cost: +ledgCost.toFixed(2) },
    { label: 'גימור/צבע',           cost: +fnCost.toFixed(2) },
    { label: 'חיפויי צד',           cost: +sideCost.toFixed(2) },
    { label: 'תאורה',               cost: +lightCost.toFixed(2) },
    { label: 'מרזבים',              cost: +gutCost.toFixed(2) },
    { label: `עבודה (${laborHours} שע' × ₪${HOURLY_RATE})`, cost: +laborCost.toFixed(2) },
  ].filter(r => r.cost > 0);

  return {
    breakdown,
    totalMaterialCost:  +totalMaterialCost.toFixed(2),
    laborHours,
    laborCost:          +laborCost.toFixed(2),
    baseCost:           +baseCost.toFixed(2),
    withBltAm,
    contractorNet,
    floorSurcharge,
    floorNote,
    craneCost,
    craneNote,
    craneForced,
    total,
    pricePerSqM,
    formulaTrace: {
      step1: `(₪${totalMaterialCost.toFixed(0)} + ₪${laborCost.toFixed(0)}) = ₪${baseCost.toFixed(0)}`,
      step2: `₪${baseCost.toFixed(0)} × ${BLT_AM} בלת"מ = ₪${withBltAm.toFixed(0)}`,
      step3: `₪${withBltAm.toFixed(0)} × ${PROFIT_MARKUP} רווח = ₪${contractorNet.toFixed(0)}`,
      step4: floorSurcharge + craneCost > 0
        ? `+ ₪${floorSurcharge} + ₪${craneCost} = ₪${total.toFixed(0)}`
        : `סה"כ = ₪${total.toFixed(0)}`,
    },
  };
}

export function formatCurrency(n) {
  if (typeof n !== 'number' || isNaN(n)) return '₪0';
  return '₪' + n.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
