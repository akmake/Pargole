/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  Pergola Engineering Calculation Engine — v2 (Full-Spec Edition)
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Implements every module from the technical specification document:
 *   Module 1 — Geometry & Structure (wall-mounted ledger, freestanding bracing,
 *               suspended cables, shade-% slat algorithm, max span table)
 *   Module 2 — Foundations (earth bore concrete volume, deck blocking)
 *   Module 3 — Roofing & Drainage (overlap rules, min slope, santaf vs sandwich)
 *   Module 4 — Electrical (cable routing with 15% contingency, deflection flag)
 *   Module 5 — BOM (end-caps, sealant/silicone tubes, full hardware by type)
 *
 * All dimensions:  input METRES → internal CM where noted → output METRES.
 * Span / deflection tables: data-driven from profilesData.json (stub).
 *   When max_span_m is null the engine emits a warning instead of blocking.
 */

import profilesData from '@/data/profilesData.json';

// ═══════════════════════════════════════════════════════════════════════════════
// MATERIAL DATABASE
// ═══════════════════════════════════════════════════════════════════════════════

export const MATERIALS = {
  pine: {
    key: 'pine', label: 'עץ אורן מוקצע (CLS)', category: 'wood',
    description: 'עץ אורן מוקצע ומיובש בתנור, נפוץ ומשתלם',
    durabilityClass: 4, treatmentRequired: true,
    profiles: {
      '9x9':   { w: 9,  h: 9,  label: '9×9 ס"מ',    weightPerMeter: 4.4,  pricePerMeter: 32, momentOfInertia: 547,  bendingStrength: 24 },
      '7x15':  { w: 7,  h: 15, label: '7×15 ס"מ',    weightPerMeter: 5.8,  pricePerMeter: 42, momentOfInertia: 1969, bendingStrength: 24 },
      '7x20':  { w: 7,  h: 20, label: '7×20 ס"מ',    weightPerMeter: 7.7,  pricePerMeter: 55, momentOfInertia: 4667, bendingStrength: 24 },
      '5x10':  { w: 5,  h: 10, label: '5×10 ס"מ',    weightPerMeter: 2.8,  pricePerMeter: 20, momentOfInertia: 417,  bendingStrength: 24 },
      '5x15':  { w: 5,  h: 15, label: '5×15 ס"מ',    weightPerMeter: 4.1,  pricePerMeter: 30, momentOfInertia: 1406, bendingStrength: 24 },
      '5x20':  { w: 5,  h: 20, label: '5×20 ס"מ',    weightPerMeter: 5.5,  pricePerMeter: 40, momentOfInertia: 3333, bendingStrength: 24 },
      '5x25':  { w: 5,  h: 25, label: '5×25 ס"מ',    weightPerMeter: 6.9,  pricePerMeter: 50, momentOfInertia: 6510, bendingStrength: 24 },
      '10x10': { w: 10, h: 10, label: '10×10 ס"מ',   weightPerMeter: 5.5,  pricePerMeter: 45, momentOfInertia: 833,  bendingStrength: 24 },
      '10x15': { w: 10, h: 15, label: '10×15 ס"מ',   weightPerMeter: 8.3,  pricePerMeter: 62, momentOfInertia: 2813, bendingStrength: 24 },
      '10x20': { w: 10, h: 20, label: '10×20 ס"מ',   weightPerMeter: 11.0, pricePerMeter: 80, momentOfInertia: 6667, bendingStrength: 24 },
      '12x12': { w: 12, h: 12, label: '12×12 ס"מ',   weightPerMeter: 7.9,  pricePerMeter: 58, momentOfInertia: 1728, bendingStrength: 24 },
      '15x15': { w: 15, h: 15, label: '15×15 ס"מ',   weightPerMeter: 12.4, pricePerMeter: 85, momentOfInertia: 4219, bendingStrength: 24 },
    },
    // spec: wood max column spacing = 350 cm
    maxMainSpan: 350, maxSecSpan: 120, maxRafterSpan: 50,
    defaultColumnProfile: '10x10', defaultMainBeamProfile: '10x15',
    defaultSecBeamProfile: '5x20', defaultRafterProfile: '5x15',
    color: '#8B6914', colorLight: '#C49A3C', densityKgM3: 550, elasticModulus: 11000,
  },

  hardwood: {
    key: 'hardwood', label: 'עץ קשה (איפה/טיק)', category: 'wood',
    description: 'עץ טרופי קשה, עמיד במיוחד בתנאי חוץ',
    durabilityClass: 1, treatmentRequired: false,
    profiles: {
      '7x7':   { w: 7,  h: 7,  label: '7×7 ס"מ',    weightPerMeter: 4.3,  pricePerMeter: 85,  momentOfInertia: 200,  bendingStrength: 42 },
      '9x9':   { w: 9,  h: 9,  label: '9×9 ס"מ',    weightPerMeter: 7.1,  pricePerMeter: 120, momentOfInertia: 547,  bendingStrength: 42 },
      '7x14':  { w: 7,  h: 14, label: '7×14 ס"מ',    weightPerMeter: 8.6,  pricePerMeter: 140, momentOfInertia: 1601, bendingStrength: 42 },
      '7x20':  { w: 7,  h: 20, label: '7×20 ס"מ',    weightPerMeter: 12.3, pricePerMeter: 195, momentOfInertia: 4667, bendingStrength: 42 },
      '5x10':  { w: 5,  h: 10, label: '5×10 ס"מ',    weightPerMeter: 4.4,  pricePerMeter: 72,  momentOfInertia: 417,  bendingStrength: 42 },
      '5x15':  { w: 5,  h: 15, label: '5×15 ס"מ',    weightPerMeter: 6.6,  pricePerMeter: 105, momentOfInertia: 1406, bendingStrength: 42 },
      '10x10': { w: 10, h: 10, label: '10×10 ס"מ',   weightPerMeter: 8.8,  pricePerMeter: 150, momentOfInertia: 833,  bendingStrength: 42 },
      '12x12': { w: 12, h: 12, label: '12×12 ס"מ',   weightPerMeter: 12.7, pricePerMeter: 195, momentOfInertia: 1728, bendingStrength: 42 },
    },
    maxMainSpan: 350, maxSecSpan: 140, maxRafterSpan: 60,
    defaultColumnProfile: '9x9', defaultMainBeamProfile: '7x14',
    defaultSecBeamProfile: '5x10', defaultRafterProfile: '5x15',
    color: '#5C3317', colorLight: '#8B5E3C', densityKgM3: 880, elasticModulus: 15000,
  },

  aluminum: {
    key: 'aluminum', label: 'אלומיניום (6063-T5)', category: 'aluminum',
    description: 'פרופילי אלומיניום אנודייז/אלקטרוסטטי, קל וחזק',
    durabilityClass: 0, treatmentRequired: false,
    profiles: {
      '60x60':   { w: 6,  h: 6,  label: '60×60 מ"מ',          weightPerMeter: 1.5, pricePerMeter: 55,  momentOfInertia: 108,  bendingStrength: 160 },
      '80x80':   { w: 8,  h: 8,  label: '80×80 מ"מ',          weightPerMeter: 2.8, pricePerMeter: 75,  momentOfInertia: 341,  bendingStrength: 160 },
      '100x100': { w: 10, h: 10, label: '100×100 מ"מ',        weightPerMeter: 3.6, pricePerMeter: 95,  momentOfInertia: 833,  bendingStrength: 160 },
      '120x120': { w: 12, h: 12, label: '120×120 מ"מ',        weightPerMeter: 4.8, pricePerMeter: 120, momentOfInertia: 1728, bendingStrength: 160 },
      '150x150': { w: 15, h: 15, label: '150×150 מ"מ',        weightPerMeter: 7.2, pricePerMeter: 175, momentOfInertia: 4219, bendingStrength: 160 },
      '50x100':  { w: 5,  h: 10, label: '50×100 מ"מ',         weightPerMeter: 2.4, pricePerMeter: 68,  momentOfInertia: 417,  bendingStrength: 160 },
      '50x150':  { w: 5,  h: 15, label: '50×150 מ"מ',         weightPerMeter: 3.2, pricePerMeter: 88,  momentOfInertia: 1406, bendingStrength: 160 },
      '50x200':  { w: 5,  h: 20, label: '50×200 מ"מ',         weightPerMeter: 4.5, pricePerMeter: 115, momentOfInertia: 3333, bendingStrength: 160 },
      '40x100':  { w: 4,  h: 10, label: '40×100 מ"מ',         weightPerMeter: 1.9, pricePerMeter: 52,  momentOfInertia: 333,  bendingStrength: 160 },
      '40x80':   { w: 4,  h: 8,  label: '40×80 מ"מ',          weightPerMeter: 1.5, pricePerMeter: 42,  momentOfInertia: 171,  bendingStrength: 160 },
      '30x80':   { w: 3,  h: 8,  label: '30×80 מ"מ',          weightPerMeter: 1.2, pricePerMeter: 38,  momentOfInertia: 128,  bendingStrength: 160 },
      '20x80':   { w: 2,  h: 8,  label: '20×80 מ"מ',          weightPerMeter: 0.8, pricePerMeter: 28,  momentOfInertia: 85,   bendingStrength: 160 },
      '30x160':  { w: 3,  h: 16, label: '30×160 מ"מ (לוברים)', weightPerMeter: 2.1, pricePerMeter: 65,  momentOfInertia: 1024, bendingStrength: 160 },
    },
    // spec: aluminum max column spacing = 400 cm
    maxMainSpan: 400, maxSecSpan: 160, maxRafterSpan: 70,
    defaultColumnProfile: '100x100', defaultMainBeamProfile: '50x150',
    defaultSecBeamProfile: '40x100', defaultRafterProfile: '30x80',
    color: '#A8A8A8', colorLight: '#D0D0D0', densityKgM3: 2700, elasticModulus: 69000,
  },

  steel: {
    key: 'steel', label: 'פלדה (מגולוון)', category: 'steel',
    description: 'צינורות פלדה מגולוונים, חזק ביותר, דורש ציפוי',
    durabilityClass: 2, treatmentRequired: true,
    profiles: {
      '60x60':   { w: 6,  h: 6,  label: '60×60×3 מ"מ',   weightPerMeter: 5.4,  pricePerMeter: 42, momentOfInertia: 108,  bendingStrength: 250 },
      '80x80':   { w: 8,  h: 8,  label: '80×80×3 מ"מ',   weightPerMeter: 7.2,  pricePerMeter: 55, momentOfInertia: 341,  bendingStrength: 250 },
      '100x100': { w: 10, h: 10, label: '100×100×3 מ"מ', weightPerMeter: 9.0,  pricePerMeter: 68, momentOfInertia: 833,  bendingStrength: 250 },
      '120x120': { w: 12, h: 12, label: '120×120×4 מ"מ', weightPerMeter: 13.8, pricePerMeter: 95, momentOfInertia: 1728, bendingStrength: 250 },
      '50x100':  { w: 5,  h: 10, label: '50×100×3 מ"מ',  weightPerMeter: 6.7,  pricePerMeter: 48, momentOfInertia: 417,  bendingStrength: 250 },
      '40x80':   { w: 4,  h: 8,  label: '40×80×2.5 מ"מ', weightPerMeter: 4.4,  pricePerMeter: 35, momentOfInertia: 171,  bendingStrength: 250 },
      '30x60':   { w: 3,  h: 6,  label: '30×60×2 מ"מ',   weightPerMeter: 2.7,  pricePerMeter: 25, momentOfInertia: 54,   bendingStrength: 250 },
    },
    maxMainSpan: 600, maxSecSpan: 200, maxRafterSpan: 80,
    defaultColumnProfile: '80x80', defaultMainBeamProfile: '50x100',
    defaultSecBeamProfile: '40x80', defaultRafterProfile: '30x60',
    color: '#4A4A4A', colorLight: '#707070', densityKgM3: 7850, elasticModulus: 200000,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOOKUP TABLES
// ═══════════════════════════════════════════════════════════════════════════════

export const INSTALLATION_TYPES = {
  freestanding:  { label: 'עומד חופשי',        description: 'ארבע פינות ומעלה, ללא חיבור לקיר' },
  wallMounted:   { label: 'צמוד קיר',          description: 'צד אחד מחובר לקיר הבניין' },
  cornerMounted: { label: 'צמוד פינה',         description: 'שני צדדים מחוברים לקירות' },
  suspended:     { label: 'תלויה (ללא עמודים)', description: 'מחוברת לקיר עם כבלי מתיחה — נדרש חיזוק קיר ייעודי' },
};

/**
 * Wall types for ledger anchor selection (spec §1.1)
 * Anchor spacing: every 40 cm, 2 rows (top + bottom of ledger).
 */
export const WALL_TYPES = {
  concrete: {
    label: 'בטון מוצק',
    anchorType: 'כימי (Chemical Anchor)',
    anchorSpacingCM: 40,
    anchorPriceEach: 35,
    anchorsPerRow: 2,
    ledgerBoltType: 'M12 כימי',
  },
  block: {
    label: "בלוק/לבנה",
    anchorType: "ג'מבו (Jumbo Anchor)",
    anchorSpacingCM: 40,
    anchorPriceEach: 25,
    anchorsPerRow: 2,
    ledgerBoltType: "ג'מבו M12",
  },
  wood: {
    label: 'קיר עץ/גבס',
    anchorType: 'בורג עץ (Lag Bolt)',
    anchorSpacingCM: 40,
    anchorPriceEach: 18,
    anchorsPerRow: 2,
    ledgerBoltType: 'Lag Bolt 8×120',
  },
};

export const ROOF_TYPES = {
  openSlats:           { label: 'שלבים פתוחים (קלאסי)',        shadeFactor: 0.55, needsDrainage: false, pricePerSqM: 0,   weightPerSqM: 0,   minSlopePercent: 0,  overlapCM: 0 },
  denseSlats:          { label: 'שלבים צפופים',                shadeFactor: 0.80, needsDrainage: false, pricePerSqM: 0,   weightPerSqM: 0,   minSlopePercent: 0,  overlapCM: 0 },
  santaf:              { label: 'סנטף / פוליקרבונט גלי',       shadeFactor: 0.40, needsDrainage: true,  pricePerSqM: 95,  weightPerSqM: 1.2, minSlopePercent: 8,  overlapCM: 15 },
  polycarbonate:       { label: 'פוליקרבונט שקוף/חלבי',        shadeFactor: 0.40, needsDrainage: true,  pricePerSqM: 95,  weightPerSqM: 1.2, minSlopePercent: 8,  overlapCM: 15 },
  polycarbonateOpaque: { label: 'פוליקרבונט אטום',             shadeFactor: 0.95, needsDrainage: true,  pricePerSqM: 110, weightPerSqM: 1.5, minSlopePercent: 8,  overlapCM: 15 },
  sandwich:            { label: 'פאנל מבודד (סנדוויץ)',         shadeFactor: 0.98, needsDrainage: true,  pricePerSqM: 260, weightPerSqM: 8,   minSlopePercent: 5,  overlapCM: 0 },
  louvers:             { label: 'לוברים מתכווננים (ביוקלימטי)', shadeFactor: 0.90, needsDrainage: true,  pricePerSqM: 450, weightPerSqM: 12,  minSlopePercent: 0,  overlapCM: 0 },
  fabricRetractable:   { label: 'בד נשלף (פרגוזה)',            shadeFactor: 0.85, needsDrainage: false, pricePerSqM: 180, weightPerSqM: 2.5, minSlopePercent: 0,  overlapCM: 0 },
  none:                { label: 'ללא כיסוי (מסגרת בלבד)',      shadeFactor: 0,    needsDrainage: false, pricePerSqM: 0,   weightPerSqM: 0,   minSlopePercent: 0,  overlapCM: 0 },
};

export const FOUNDATION_TYPES = {
  concretePad:         { label: 'בסיס בטון (פלטה)',         pricePerColumn: 180, depthCM: 50,  widthCM: 50, inGround: false },
  earthBore:           { label: 'יציקה באדמה (בור קידוח)',  pricePerColumn: 250, depthCM: 60,  widthCM: 30, inGround: true  },
  helicalScrew:        { label: 'בורג יסוד (הליקלי)',       pricePerColumn: 350, depthCM: 120, widthCM: 8,  inGround: true  },
  surfaceMountBracket: { label: 'עוגן משטח (בסיס קיים)',    pricePerColumn: 85,  depthCM: 0,   widthCM: 15, inGround: false },
  deckMount:           { label: 'על דק קיים',               pricePerColumn: 120, depthCM: 0,   widthCM: 15, inGround: false },
  wallBracket:         { label: 'עוגן קיר',                 pricePerColumn: 95,  depthCM: 0,   widthCM: 0,  inGround: false },
};

export const WIND_ZONES = {
  inland_low:    { label: 'מוגן (עירוני)',          windPressure: 0.50 },
  inland_normal: { label: 'רגיל (שפלה/הרים)',      windPressure: 0.75 },
  coastal:       { label: 'חופי (עד 5 ק"מ מהים)',  windPressure: 1.05 },
  exposed:       { label: 'חשוף (גבעה פתוחה)',     windPressure: 1.40 },
};

export const FINISHES = {
  natural:       { label: 'טבעי',                    priceAdd: 0,  hex: '#C49A3C' },
  stainLight:    { label: 'לכה בהירה',               priceAdd: 15, hex: '#D4B06A' },
  stainDark:     { label: 'לכה כהה',                 priceAdd: 15, hex: '#5C3317' },
  paintWhite:    { label: 'צבע לבן',                 priceAdd: 22, hex: '#F5F5F0' },
  paintBlack:    { label: 'צבע שחור',                priceAdd: 22, hex: '#2A2A2A' },
  paintGray:     { label: 'צבע אפור',                priceAdd: 22, hex: '#808080' },
  woodLook:      { label: 'אפקט עץ (לאלומיניום)',    priceAdd: 35, hex: '#A0724A' },
  anodized:      { label: 'אנודייז כסוף',            priceAdd: 28, hex: '#C0C0C0' },
  electrostatic: { label: 'ציפוי אלקטרוסטטי',       priceAdd: 30, hex: '#B0B0B0' },
};

export const LIGHTING_OPTIONS = {
  none:         { label: 'ללא תאורה',            pricePerMeter: 0,  pricePerPoint: 0 },
  ledStrip:     { label: 'פס LED מובנה',          pricePerMeter: 45, pricePerPoint: 0 },
  spotlights:   { label: 'ספוטים שקועים',         pricePerMeter: 0,  pricePerPoint: 120 },
  pendants:     { label: 'מנורות תלויות',         pricePerMeter: 0,  pricePerPoint: 250 },
  stringLights: { label: 'גרלנדה (שרשרת אורות)', pricePerMeter: 35, pricePerPoint: 0 },
};

export const SIDE_OPTIONS = {
  none:             { label: 'פתוח (ללא)',           pricePerSqM: 0 },
  fixedGlass:       { label: 'זכוכית קבועה',         pricePerSqM: 650 },
  slidingGlass:     { label: 'זכוכית הזזה',          pricePerSqM: 850 },
  perforatedScreen: { label: 'מסך מחורר',            pricePerSqM: 180 },
  woodScreen:       { label: 'מחיצת עץ/במבוק',      pricePerSqM: 250 },
  fabricRollDown:   { label: 'סוכך בד',              pricePerSqM: 120 },
  lattice:          { label: 'סבכה (שבכה)',          pricePerSqM: 95 },
};

export const GUTTER_TYPES = {
  none:       { label: 'ללא מרזב',            pricePerMeter: 0 },
  integrated: { label: 'מובנה בפרופיל',        pricePerMeter: 65 },
  external:   { label: 'חיצוני PVC',           pricePerMeter: 35 },
  hidden:     { label: 'סמוי בתוך עמוד',       pricePerMeter: 120 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SPEC CONSTANTS (all values confirmed by client — do not change without spec update)
// ═══════════════════════════════════════════════════════════════════════════════

const WASTE_FACTOR         = 1.10;   // 10% cut waste
const SAFETY_FACTOR        = 1.25;   // structural safety factor
const BOLT_SPACING_CM      = 40;     // anchor/bolt spacing (spec §1.1)
const BRACING_THRESHOLD_M  = 2.80;  // freestanding bracing required above this height (spec §1.2)
const BRACING_LEG_CM       = 40;    // each leg of the 45° Bracing triangle (spec §1.2)
const BORE_RADIUS_M        = 0.15;  // 30 cm bore diameter / 2 (spec §2.2)
const BORE_DEPTH_STANDARD  = 0.60;  // standard earth-bore depth (spec §2.1)
const BORE_DEPTH_TALL      = 0.80;  // depth when height > 3.20 m (spec §2.1)
const BORE_TALL_THRESHOLD  = 3.20;  // height threshold (spec §2.1)
const SEALANT_M_PER_TUBE   = 6.0;   // linear metres per 310 ml silicone tube
const CABLE_CONTINGENCY    = 1.15;  // electrical cable contingency (spec §4)
const LOUVER_BLADE_MM      = 160;   // louver blade width — collision clearance (spec §3)
const SUSPENSION_RISE_M    = 0.5;   // default cable anchor rise above beam (spec §1.1)

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Shade % → slat pitch calculation (spec §3.1)
 * Formula derivation:
 *   shadePct = slatWidth / pitch  →  pitch = slatWidth / (shadePct / 100)
 *   gap = pitch − slatWidth
 */
function slatPitchFromShade(slatWidthCM, shadePct) {
  if (shadePct <= 0 || shadePct >= 100) return { pitchCM: slatWidthCM, gapCM: 0 };
  const pitchCM = +(slatWidthCM / (shadePct / 100)).toFixed(2);
  return { pitchCM, gapCM: +(pitchCM - slatWidthCM).toFixed(2) };
}

/**
 * Count open profile ends for end-cap BOM (aluminium/steel only).
 * Spec §5.2: count every exposed open end of every hollow profile.
 */
function countOpenEnds({ totalCols, mainBeamCount, numSec, numRaft, isWall }) {
  const colEnds  = totalCols * 2;
  const mbEnds   = mainBeamCount * (isWall ? 1 : 2); // one wall-end is flush → no cap
  const sbEnds   = numSec * 2;
  const rfEnds   = numRaft * 2;
  return colEnds + mbEnds + sbEnds + rfEnds;
}

/**
 * Estimate installation labour hours.
 * Used in the pricing formula: (materials + hours×250) × 1.15 × 1.30
 * Method: component-based additive estimate (reasonable internal heuristic;
 * not a spec constant, but required to drive the confirmed pricing formula).
 */
function estimateLaborHours({ totalCols, mainBeamCount, numSecBeams, numRafters,
  foundationType, installType, hasSides, hasLighting }) {
  let h = 4; // base: site setup + cleanup

  if (foundationType === 'earthBore')      h += totalCols * 3.0;
  else if (foundationType === 'concretePad') h += totalCols * 2.0;
  else if (foundationType === 'helicalScrew') h += totalCols * 1.5;
  else                                      h += totalCols * 1.0;

  if (installType === 'wallMounted' || installType === 'cornerMounted') h += 4;
  if (installType === 'suspended')  h += 8;

  h += mainBeamCount * 2.0;
  h += numSecBeams   * 0.75;

  const r = numRafters || 0;
  h += Math.min(r, 10) * 0.5 + Math.max(0, r - 10) * 0.3;

  if (hasSides)    h += 6;
  if (hasLighting) h += 3;

  return Math.round(h);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CALCULATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export function calculatePergola(params) {
  const {
    length: lengthM = 4,
    width:  widthM  = 3,
    height: heightM = 2.7,
    material: matKey   = 'pine',
    installType        = 'wallMounted',
    roofType           = 'openSlats',
    foundationType     = 'surfaceMountBracket',
    windZone           = 'inland_normal',
    finish             = 'natural',
    overhangCM         = 20,
    slopePercent       = 2,
    lightingOption     = 'none',
    gutterType         = 'none',
    sides = { front: 'none', back: 'none', left: 'none', right: 'none' },
    columnProfile, mainBeamProfile, secBeamProfile, rafterProfile,
    // New in v2
    wallType           = 'concrete',
    desiredShadePct    = 0,     // 0 = auto (use roof type default)
    slatWidthCM        = 10,    // cm
    cableSuspendRiseM  = SUSPENSION_RISE_M,
    // Manual overrides
    manualRafterCount      = 0,
    manualSecBeamCount     = 0,
    manualRafterSpacingCM  = 0,
    manualColsAlongLength  = 0,
  } = params;

  const mat       = MATERIALS[matKey];
  if (!mat) throw new Error(`Unknown material: ${matKey}`);

  const L = lengthM * 100, W = widthM * 100;
  const roof       = ROOF_TYPES[roofType]       || ROOF_TYPES.openSlats;
  const foundation = FOUNDATION_TYPES[foundationType] || FOUNDATION_TYPES.surfaceMountBracket;
  const wind       = WIND_ZONES[windZone]       || WIND_ZONES.inland_normal;
  const finishData = FINISHES[finish]            || FINISHES.natural;
  const gutter     = GUTTER_TYPES[gutterType]   || GUTTER_TYPES.none;
  const wallData   = WALL_TYPES[wallType]        || WALL_TYPES.concrete;

  const colProf  = mat.profiles[columnProfile   || mat.defaultColumnProfile];
  const mainProf = mat.profiles[mainBeamProfile  || mat.defaultMainBeamProfile];
  const secProf  = mat.profiles[secBeamProfile   || mat.defaultSecBeamProfile];
  const raftProf = mat.profiles[rafterProfile    || mat.defaultRafterProfile];

  const isSuspended = installType === 'suspended';
  const isWall      = installType === 'wallMounted';
  const isCorner    = installType === 'cornerMounted';

  const overhangM  = overhangCM / 100;
  const area       = +(lengthM * widthM).toFixed(2);
  const perimeterM = 2 * (lengthM + widthM);
  const totalRoofL = lengthM + overhangM * 2;
  const totalRoofW = widthM + (isWall || isCorner ? overhangM : overhangM * 2);
  const roofArea   = +(totalRoofL * totalRoofW).toFixed(2);

  // ── Slope / drainage (spec §1.3 + §3.1) ──────────────────────────────
  const effectiveSlope  = roof.needsDrainage
    ? Math.max(slopePercent, roof.minSlopePercent)
    : 0;
  const slopeHeightDiff = +(widthM * effectiveSlope / 100).toFixed(3);
  const slopeAngleDeg   = +(Math.atan(effectiveSlope / 100) * 180 / Math.PI).toFixed(2);

  // ── Wind uplift ────────────────────────────────────────────────────────
  const windUpliftN = +(wind.windPressure * 1000 * roofArea * 0.7).toFixed(0);

  // ── Columns (spec §1.1) ────────────────────────────────────────────────
  // maxMainSpan already set per spec: aluminum = 400 cm, wood = 350 cm
  let totalCols = 0, colsL = 0, colRowsW = 0, colSpacingL = 0;

  if (!isSuspended) {
    const autoSpansL = Math.max(1, Math.ceil(L / mat.maxMainSpan));
    colsL = manualColsAlongLength > 1 ? manualColsAlongLength : (autoSpansL + 1);
    const spansL = colsL - 1;

    if (isCorner)    colRowsW = 1;
    else if (isWall) colRowsW = Math.max(1, Math.ceil(W / mat.maxMainSpan));
    else             colRowsW = Math.max(1, Math.ceil(W / mat.maxMainSpan)) + 1;

    totalCols   = colsL * colRowsW;
    colSpacingL = +(L / Math.max(1, spansL) / 100).toFixed(2);
  }

  // ── Span warnings (data-driven: profilesData.json, spec §1.4) ─────────
  const warnings = [];
  if (!isSuspended && colSpacingL > mat.maxMainSpan / 100) {
    warnings.push(
      `⚠ מרווח עמודים (${colSpacingL} מ') עולה על הסף (${(mat.maxMainSpan / 100).toFixed(1)} מ') — יש לבחור קורה עבה יותר`
    );
  }
  // Check profilesData if populated
  const pd = profilesData?.aluminum_6063_T5 || profilesData?.pine_C24 || {};
  const pdKey = Object.values(pd).find(
    p => p.height_mm === mainProf.h * 10 && p.width_mm === mainProf.w * 10
  );
  if (pdKey?.max_span_m !== null && pdKey?.max_span_m !== undefined) {
    if (colSpacingL > pdKey.max_span_m) {
      warnings.push(
        `⚠ מפתח (${colSpacingL} מ') עולה על הסף המאושר (${pdKey.max_span_m} מ') לפי טבלת יצרן`
      );
    }
  } else if (mat.category === 'aluminum' || mat.category === 'steel') {
    warnings.push('ℹ טבלת עומסי פרופיל טרם נטענה — יש להעלות קובץ יצרן לבדיקת Deflection');
  }

  // ── Bracing (spec §1.2: freestanding + height > 2.80 m) ──────────────
  const needsBracing  = installType === 'freestanding' && heightM > BRACING_THRESHOLD_M;
  const bracingLegM   = BRACING_LEG_CM / 100;
  const bracingPieceM = +(Math.sqrt(bracingLegM ** 2 + bracingLegM ** 2)).toFixed(3); // √(0.4²+0.4²) ≈ 0.566 m
  const bracingCount  = needsBracing ? totalCols * 2 : 0;
  const totalBracingM = +(bracingCount * bracingPieceM).toFixed(2);

  // ── Ledger / wall anchors (spec §1.1 — wall-mounted) ──────────────────
  const ledgerLengthM = (isWall || isCorner) ? totalRoofL : 0;
  // anchors every 40 cm × 2 rows (top + bottom of ledger)
  const ledgerAnchors = ledgerLengthM > 0
    ? Math.ceil(ledgerLengthM / (wallData.anchorSpacingCM / 100)) * wallData.anchorsPerRow
    : 0;
  const ledgerCost = +(ledgerAnchors * wallData.anchorPriceEach).toFixed(2);

  // ── Suspended cables (spec §1.1 — תלויה) ─────────────────────────────
  let suspensionData = null;
  if (isSuspended) {
    const numCables     = Math.max(2, Math.ceil(L / mat.maxMainSpan) + 1);
    const cableAngleDeg = +(Math.atan(cableSuspendRiseM / widthM) * 180 / Math.PI).toFixed(1);
    const cableLenEach  = +(Math.sqrt(widthM ** 2 + cableSuspendRiseM ** 2) * CABLE_CONTINGENCY).toFixed(2);
    const totalCableM   = +(cableLenEach * numCables).toFixed(2);
    // Approx tension from live + dead load divided by sin(angle)
    const approxLoadKg  = 50 * area + (roof.weightPerSqM || 0) * roofArea;
    const tensionKg     = +(approxLoadKg / Math.sin(cableAngleDeg * Math.PI / 180)).toFixed(1);
    suspensionData = { numCables, cableAngleDeg, cableLenEach, totalCableM, tensionKg };
    warnings.push(`⚠ פרגולה תלויה: כוח מתיחה כבל משוער ${tensionKg} kg — נדרש חיזוק קיר ייעודי`);
    warnings.push(`ℹ זווית עיגון כבל: ${cableAngleDeg}° | אורך כבל כולל: ${totalCableM} מ'`);
  }

  // ── Main beams ─────────────────────────────────────────────────────────
  const mainBeamCount = isSuspended ? 2 : (colRowsW + (isWall ? 1 : 0));
  const mainBeamLen   = totalRoofL;

  // ── Secondary beams ────────────────────────────────────────────────────
  const autoNumSec = Math.max(2, Math.ceil(L / mat.maxSecSpan) + 1);
  const numSec     = manualSecBeamCount > 1 ? manualSecBeamCount : autoNumSec;
  const secSpacing = +(L / Math.max(1, numSec - 1) / 100).toFixed(2);
  const secLen     = totalRoofW;

  // ── Rafters / slats (spec §3.1 shade algorithm) ───────────────────────
  let numRaft = 0, raftSpacing = 0, raftLen = totalRoofL;
  let slatSpacingCM = 0, slatActualShadePct = roof.shadeFactor * 100;

  if (manualRafterCount > 0 && roofType !== 'none') {
    numRaft = manualRafterCount;
  } else if (manualRafterSpacingCM > 0 && roofType !== 'none') {
    numRaft = Math.max(2, Math.ceil(W / manualRafterSpacingCM) + 1);
  } else if (roofType === 'none') {
    numRaft = 0;
  } else if (roofType === 'louvers') {
    numRaft = Math.max(3, Math.ceil(W / 15) + 1);
  } else if (['santaf', 'polycarbonate', 'polycarbonateOpaque', 'sandwich', 'fabricRetractable'].includes(roofType)) {
    numRaft = Math.max(2, Math.ceil(W / (mat.maxRafterSpan * 1.5)) + 1);
  } else {
    // Open / dense slats — shade % algorithm (spec §3.1)
    const targetShade = desiredShadePct > 0 ? desiredShadePct : roof.shadeFactor * 100;
    const { pitchCM, gapCM } = slatPitchFromShade(slatWidthCM, targetShade);
    slatSpacingCM    = gapCM;
    numRaft          = Math.max(2, Math.ceil(W / pitchCM) + 1);
    slatActualShadePct = +(slatWidthCM / pitchCM * 100).toFixed(1);
  }
  if (numRaft > 1) raftSpacing = +(W / (numRaft - 1) / 100).toFixed(2);

  // ── Roofing panels — overlap calculation (spec §3.2) ──────────────────
  let roofPanelData = null;
  if (['santaf', 'polycarbonate', 'polycarbonateOpaque'].includes(roofType)) {
    // 2 waves = 15 cm deducted per panel (spec §3.2)
    const panelWidthGross = 1.06;
    const panelWidthNet   = panelWidthGross - (roof.overlapCM / 100);
    const numPanels       = Math.ceil(totalRoofL / panelWidthNet);
    roofPanelData = {
      panelWidthGross, panelWidthNet: +panelWidthNet.toFixed(3),
      numPanels, overlapCM: roof.overlapCM, overlapWaves: 2,
      note: `${numPanels} לוחות × ${panelWidthGross * 100} ס"מ ברוטו | חפיפה 2 גלים (${roof.overlapCM} ס"מ)`,
    };
  } else if (roofType === 'sandwich') {
    // Male-female interlock — no width deduction (spec §3.2)
    const panelWidthNet = 1.0;
    const numPanels     = Math.ceil(totalRoofL / panelWidthNet);
    roofPanelData = {
      panelWidthGross: 1.0, panelWidthNet, numPanels, overlapCM: 0, overlapWaves: 0,
      note: `${numPanels} פאנלים מבודדים × 1.00 מ' | חיבור זכר-נקבה (ללא הפחתה)`,
    };
  }

  // ── Bioclimatic collision detection (spec §3 — louvers near wall) ─────
  const bioclimaticWarnings = [];
  if (roofType === 'louvers' && (isWall || isCorner)) {
    bioclimaticWarnings.push(
      `⚠ לוברים: נדרש מרווח מינימלי ${LOUVER_BLADE_MM} מ"מ בין הקיר ללובר הראשון (פתיחה מלאה 90°)`
    );
    bioclimaticWarnings.push(
      `ℹ מנוע לוברים: התקן בקצה הרחוק מהקיר, גובה ${heightM.toFixed(2)} מ' (ברמת הקורה)`
    );
    warnings.push(...bioclimaticWarnings);
  }

  // ── Foundation details (spec §2) ──────────────────────────────────────
  const boreDepthM       = heightM > BORE_TALL_THRESHOLD ? BORE_DEPTH_TALL : BORE_DEPTH_STANDARD;
  const columnBuriedM    = foundation.inGround ? boreDepthM : 0;
  const columnTotalLenM  = +(heightM + columnBuriedM).toFixed(2);

  // Concrete volume: V = π × r² × depth × numBores (spec §2.1)
  let concreteM3 = 0, concreteBags50kg = 0;
  if (foundationType === 'earthBore' && totalCols > 0) {
    const volPerBore  = Math.PI * BORE_RADIUS_M ** 2 * boreDepthM;
    concreteM3        = +(volPerBore * totalCols).toFixed(3);
    concreteBags50kg  = Math.ceil(concreteM3 / 0.04); // 50 kg bag ≈ 0.04 m³
  }

  // Deck blocking (spec §2 — deckMount)
  let deckBlocking = null;
  if (foundationType === 'deckMount' && totalCols > 0) {
    const blockingPiece = 0.6; // 60 cm between joists
    const numPieces     = totalCols * 2;
    deckBlocking = {
      numPieces, pieceLengthM: blockingPiece,
      totalM: +(numPieces * blockingPiece).toFixed(2),
      note: `${numPieces} קורות חסימה (Blocking) × 60 ס"מ — מתחת לדק, בכל נקודת עמוד`,
    };
  }

  // ── Weights ────────────────────────────────────────────────────────────
  const cw = colProf.weightPerMeter  * columnTotalLenM;
  const mw = mainProf.weightPerMeter * mainBeamLen;
  const sw = secProf.weightPerMeter  * secLen;
  const rw = numRaft > 0 ? raftProf.weightPerMeter * raftLen : 0;
  const bw = needsBracing ? colProf.weightPerMeter * bracingPieceM * bracingCount : 0;

  const structWeight     = totalCols * cw + mainBeamCount * mw + numSec * sw + numRaft * rw + bw;
  const roofMatWeight    = roof.weightPerSqM * roofArea;
  const totalWeight      = +(structWeight + roofMatWeight).toFixed(1);
  const weightPerFooting = totalCols > 0 ? +(totalWeight / totalCols).toFixed(1) : totalWeight;
  const liveLoad         = 50 * area;
  const designLoad       = +((totalWeight + liveLoad) * SAFETY_FACTOR).toFixed(1);
  const designPerFooting = totalCols > 0 ? +(designLoad / totalCols).toFixed(1) : designLoad;

  // ── Hardware (spec §5.2) ───────────────────────────────────────────────
  const isW    = mat.category === 'wood';
  const isAlum = mat.category === 'aluminum' || mat.category === 'steel';

  const tBolts  = totalCols * 4
    + mainBeamCount * (Math.ceil(mainBeamLen * 100 / BOLT_SPACING_CM) * 2)
    + numSec * 4;
  const tScrews = numRaft * 4;

  // End caps — aluminium/steel only (spec §5.2)
  const numEndCaps = isAlum
    ? countOpenEnds({ totalCols, mainBeamCount, numSec, numRaft, isWall })
    : 0;

  // Sealant tubes (spec §5.2)
  // Wall seam: 2 linear runs along ledger (top + bottom edge)
  // Gutter joints: 2 linear runs along gutter length
  const sealantWallM    = ledgerLengthM > 0 ? ledgerLengthM * 2 : 0;
  const sealantGutterM  = gutterType !== 'none' ? lengthM * 2 : 0;
  const totalSealantM   = sealantWallM + sealantGutterM;
  const numSealantTubes = Math.ceil(totalSealantM / SEALANT_M_PER_TUBE);

  const hardware = {
    bolts:      { label: isW ? 'בורגי עגלה M12×150'         : 'בורגי נירוסטה M10×80', qty: tBolts,      priceEach: isW ? 4.5 : 6 },
    screws:     { label: 'ברגים עצמיים 6×60',                                           qty: tScrews,     priceEach: 1.2 },
    brackets:   { label: 'זוויתנים (L-brackets)',                                        qty: totalCols * 2 + mainBeamCount * 2, priceEach: isW ? 18 : 28 },
    postBases:  { label: 'בסיסי עמוד',                                                  qty: totalCols,   priceEach: ['surfaceMountBracket','deckMount'].includes(foundationType) ? 45 : 0 },
    washers:    { label: 'שייבות + אומים',                                              qty: tBolts,      priceEach: 1.5 },
    ...(ledgerAnchors > 0 && {
      ledgerAnchors: { label: `עוגני לדג'ר (${wallData.anchorType})`, qty: ledgerAnchors, priceEach: wallData.anchorPriceEach },
    }),
    ...(needsBracing && {
      bracketsBracing: { label: 'אוזני Bracing (L-bracket 90°)', qty: bracingCount * 2, priceEach: 22 },
    }),
    ...(numEndCaps > 0 && {
      endCaps: { label: 'פקקי קצה אלומיניום', qty: numEndCaps, priceEach: 4 },
    }),
    ...(numSealantTubes > 0 && {
      sealant: { label: 'שפופרות סיליקון/סופר7 (310 מ"ל)', qty: numSealantTubes, priceEach: 28 },
    }),
  };
  const hardwareCost = +Object.values(hardware).reduce((s, h) => s + h.qty * h.priceEach, 0).toFixed(2);

  // ── Cut list (spec §5.1) ───────────────────────────────────────────────
  const cutList = [];
  const addCut = (part, profObj, lenM, qty) => {
    cutList.push({
      part,
      profile: profObj.label,
      lengthM: +lenM.toFixed(3),
      qty,
      totalM:        +(qty * lenM * WASTE_FACTOR).toFixed(2),
      weightPerUnit: +(profObj.weightPerMeter * lenM).toFixed(2),
      totalWeight:   +(qty * profObj.weightPerMeter * lenM).toFixed(1),
      pricePerUnit:  +(profObj.pricePerMeter * lenM).toFixed(2),
      totalPrice:    +(profObj.pricePerMeter * lenM * qty * WASTE_FACTOR).toFixed(2),
    });
  };

  if (!isSuspended && totalCols > 0) addCut('עמוד',            colProf,  columnTotalLenM, totalCols);
  addCut('קורה ראשית',   mainProf, mainBeamLen,     mainBeamCount);
  addCut('קורה משנית',   secProf,  secLen,          numSec);
  if (numRaft > 0) addCut(roofType === 'louvers' ? 'לובר (להב)' : 'שלב (רפטר)', raftProf, raftLen, numRaft);
  if (needsBracing && bracingCount > 0) addCut('אלכסון Bracing (45°)', colProf, bracingPieceM, bracingCount);
  if (ledgerLengthM > 0) addCut("קורת קשר (Ledger)", mainProf, ledgerLengthM, 1);

  const materialCost    = +cutList.reduce((s, r) => s + r.totalPrice, 0).toFixed(2);
  const totalMaterialsM = +cutList.reduce((s, r) => s + r.totalM, 0).toFixed(2);

  // ── Extra costs ────────────────────────────────────────────────────────
  const roofMaterialCost = +(roof.pricePerSqM * roofArea).toFixed(2);
  const foundationCost   = +(foundation.pricePerColumn * totalCols).toFixed(2);
  const finishCost       = +(totalMaterialsM * finishData.priceAdd).toFixed(2);
  const gutterCost       = +(gutter.pricePerMeter * lengthM).toFixed(2);

  const sideCalc = (side, len) => {
    const opt = SIDE_OPTIONS[sides[side]] || SIDE_OPTIONS.none;
    const a   = len * heightM;
    return { side, label: opt.label, areaSqM: +a.toFixed(2), price: +(a * opt.pricePerSqM).toFixed(2) };
  };
  const sideCosts    = [
    sideCalc('front', lengthM), sideCalc('back', lengthM),
    sideCalc('left', widthM),   sideCalc('right', widthM),
  ];
  const totalSideCost = +sideCosts.reduce((s, c) => s + c.price, 0).toFixed(2);

  const lOpt = LIGHTING_OPTIONS[lightingOption] || LIGHTING_OPTIONS.none;
  let lightingCost = 0, lightingDetails = lOpt.label, numLightingPoints = 0;
  if (lOpt.pricePerMeter > 0) {
    lightingCost = +(lOpt.pricePerMeter * perimeterM * 1.5).toFixed(2);
  } else if (lOpt.pricePerPoint > 0) {
    numLightingPoints = Math.ceil(perimeterM / 0.8);
    lightingCost      = +(lOpt.pricePerPoint * numLightingPoints).toFixed(2);
    lightingDetails  += ` (${numLightingPoints} נקודות)`;
  }

  // ── Electrical cable routing (spec §4) ────────────────────────────────
  let electricalCableM = 0;
  if (lightingOption !== 'none') {
    const dropM          = numLightingPoints > 0 ? numLightingPoints * 0.5 : 2;
    electricalCableM     = +((perimeterM + dropM) * CABLE_CONTINGENCY).toFixed(1);
  }

  // ── Labour hours (feeds pricing formula) ──────────────────────────────
  const laborHours = estimateLaborHours({
    totalCols, mainBeamCount, numSecBeams: numSec, numRafters: numRaft,
    foundationType, installType,
    hasSides: totalSideCost > 0, hasLighting: lightingCost > 0,
  });

  // ── 3D layout ──────────────────────────────────────────────────────────
  const columns3D = [];
  if (!isSuspended) {
    for (let row = 0; row < colRowsW; row++) {
      const zFrac = colRowsW === 1 ? 1 : row / (colRowsW - 1);
      const zPos  = isWall && colRowsW === 1 ? widthM : zFrac * widthM;
      for (let c = 0; c < colsL; c++) {
        const xPos = colsL === 1 ? lengthM / 2 : (c / (colsL - 1)) * lengthM;
        columns3D.push({ x: xPos, y: 0, z: zPos, height: heightM });
      }
    }
  }

  const mainBeams3D = [];
  if (isWall || isCorner) {
    mainBeams3D.push({ x: -overhangM, y: heightM + slopeHeightDiff, z: 0, length: totalRoofL, direction: 'x', isLedger: true });
  }
  for (let row = 0; row < (isSuspended ? 2 : colRowsW); row++) {
    const zPos = isSuspended
      ? (row === 0 ? 0 : widthM)
      : (isWall && colRowsW === 1 ? widthM : (colRowsW === 1 ? 1 : row / (colRowsW - 1)) * widthM);
    mainBeams3D.push({ x: -overhangM, y: heightM, z: zPos, length: totalRoofL, direction: 'x' });
  }

  const secBeams3D = [];
  for (let i = 0; i < numSec; i++) {
    const xFrac = numSec === 1 ? 0.5 : i / (numSec - 1);
    secBeams3D.push({ x: xFrac * lengthM, y: heightM, z: 0, length: widthM, direction: 'z' });
  }

  const rafters3D = [];
  for (let i = 0; i < numRaft; i++) {
    const zFrac = numRaft === 1 ? 0.5 : i / (numRaft - 1);
    rafters3D.push({
      x: -overhangM, y: heightM + mainProf.h / 100 + secProf.h / 100,
      z: zFrac * widthM, length: totalRoofL, direction: 'x',
    });
  }

  const wall3D = isWall ? { x: 0, y: 0, z: 0, width: lengthM, height: heightM + 0.5 } : null;

  // ── Final result object ────────────────────────────────────────────────
  return {
    input: { ...params, length: lengthM, width: widthM, height: heightM },
    material: mat, roof, foundation, wind, finishData, wallData, gutter,

    structure: {
      totalColumns: totalCols, colsAlongLength: colsL, colRowsWidth: colRowsW,
      columnSpacingLength: colSpacingL,
      columnVisibleM: heightM, columnBuriedM, columnTotalLenM,
      mainBeamCount, mainBeamLength: +mainBeamLen.toFixed(2),
      numSecBeams: numSec, secBeamSpacing: secSpacing, secBeamLength: +secLen.toFixed(2),
      numRafters: numRaft, rafterSpacing: raftSpacing, rafterLength: +raftLen.toFixed(2),
      overhangM, slopePercent: effectiveSlope, slopeHeightDiff, slopeAngleDeg,
      isSuspended, isWall, isCorner,
    },

    // Module 1 — extras
    bracing: needsBracing
      ? { required: true, count: bracingCount, legCM: BRACING_LEG_CM, angleDeg: 45, pieceLengthM: bracingPieceM, totalM: totalBracingM }
      : { required: false },

    ledger: ledgerLengthM > 0
      ? { lengthM: +ledgerLengthM.toFixed(2), anchors: ledgerAnchors, anchorType: wallData.anchorType, anchorSpacingCM: wallData.anchorSpacingCM, boltType: wallData.ledgerBoltType, cost: ledgerCost }
      : null,

    suspension: suspensionData,

    // Module 2 — foundations
    foundationDetails: {
      type: foundationType, boreDepthM: foundation.inGround ? boreDepthM : 0,
      boreDiameterCM: 30, concreteM3, concreteBags50kg, deckBlocking,
    },

    // Module 3 — roofing
    roofDetails: {
      effectiveSlopePercent: effectiveSlope, minRequiredSlope: roof.minSlopePercent,
      slopeOk: effectiveSlope >= roof.minSlopePercent,
      panels: roofPanelData,
      slatSpacingCM: slatSpacingCM > 0 ? +slatSpacingCM.toFixed(1) : null,
      slatActualShadePct,
      slatWidthCM: ['openSlats','denseSlats'].includes(roofType) ? slatWidthCM : null,
    },

    // Module 4 — electrical
    electricalDetails: {
      cableM: electricalCableM, contingencyPct: 15,
      lightingPoints: numLightingPoints,
      note: electricalCableM > 0
        ? `כבל חשמל: ${electricalCableM} מ' (כולל 15% ספר בלת"ם)`
        : 'ללא תאורה',
    },

    profiles: { column: colProf, mainBeam: mainProf, secBeam: secProf, rafter: raftProf },

    coverage: {
      area, roofArea,
      shadePercent: slatActualShadePct || roof.shadeFactor * 100,
      shadedArea: +(area * (slatActualShadePct || roof.shadeFactor * 100) / 100).toFixed(1),
      perimeterM: +perimeterM.toFixed(2),
    },

    loads: {
      structuralWeight: +structWeight.toFixed(1), roofMaterialWeight: +roofMatWeight.toFixed(1),
      totalWeight, weightPerFooting, liveLoadPerSqM: 50, totalLiveLoad: +liveLoad.toFixed(1),
      totalDesignLoad: designLoad, designLoadPerFooting: designPerFooting,
      windPressureKPa: wind.windPressure, windUpliftForceN: windUpliftN,
    },

    // Module 5 — BOM
    cutList, hardware, hardwareCost,
    sideCosts, totalSideCost, finishCost, roofMaterialCost,
    lightingCost, lightingDetails, gutterCost, foundationCost, ledgerCost,
    summary: {
      totalMaterials: totalMaterialsM,
      totalWeight: +(cutList.reduce((s, r) => s + r.totalWeight, 0)).toFixed(1),
      materialCost,
    },

    laborHours,
    warnings,

    layout3D: { columns: columns3D, mainBeams: mainBeams3D, secBeams: secBeams3D, rafters: rafters3D, wall: wall3D },
  };
}
