import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/pergolaPrice';
import { generateCutPlan } from '@/utils/binPacking';
import { Wrench, Package, AlertTriangle, Scissors, ChevronDown } from 'lucide-react';

// ── Helpers ─────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, badge, color = 'blue' }) {
  const cls = { blue: 'text-blue-600', green: 'text-emerald-600', purple: 'text-purple-600', amber: 'text-amber-600' };
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className={`w-4 h-4 ${cls[color] ?? cls.blue}`} />
      <h3 className="font-bold text-sm">{title}</h3>
      {badge && <Badge variant="outline" className="text-[10px] mr-auto">{badge}</Badge>}
    </div>
  );
}

function Collapse({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-4 py-2.5 bg-neutral-50 hover:bg-neutral-100 text-xs font-semibold text-right"
      >
        <span>{title}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="p-3">{children}</div>}
    </div>
  );
}

// ── Bin Packing section ──────────────────────────────────────────────
function BinPackingSection({ cutList, materialCategory }) {
  const plan = useMemo(
    () => (cutList?.length ? generateCutPlan(cutList, materialCategory) : []),
    [cutList, materialCategory]
  );
  if (!plan.length) return null;

  const totalBars = plan.reduce((s, p) => s + p.packResult.totalBars, 0);

  return (
    <div className="space-y-3">
      <SectionHeader
        icon={Scissors}
        title="הוראות חיתוך — אופטימיזציית 1D Bin Packing"
        badge={`${totalBars} יחידות חומר גלם`}
        color="purple"
      />
      {plan.map(({ profile, packResult }) => {
        const stockLabel = packResult.stockLength
          ? `יחידות ${packResult.stockLength}מ'`
          : 'יחידות';
        return (
          <Collapse
            key={profile}
            title={`${profile} — ${packResult.totalBars} ${stockLabel} | פחת: ${packResult.totalWasteM}מ' | יעילות: ${packResult.efficiencyPct}%`}
          >
            {/* Wood: show all stock-length options */}
            {packResult.allOptions && (
              <div className="mb-3">
                <p className="text-[10px] text-neutral-500 mb-1.5">השוואת מידות עץ גלם — הבחירה המיטבית מסומנת:</p>
                <div className="flex flex-wrap gap-1.5">
                  {packResult.allOptions.map(opt => (
                    <span
                      key={opt.stockLength}
                      className={`px-2 py-0.5 rounded text-[10px] border ${
                        opt.stockLength === packResult.stockLength
                          ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                          : 'bg-white text-neutral-600 border-neutral-200'
                      }`}
                    >
                      {opt.stockLength}מ' · {opt.numBars} יחידות · פחת {opt.totalWasteM}מ'
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Per-bar instructions */}
            <div className="space-y-1.5">
              {packResult.bars.map(bar => (
                <div
                  key={bar.barIndex}
                  className={`rounded-lg border px-3 py-2 font-mono text-[10px] ${
                    bar.overflow ? 'border-red-300 bg-red-50 text-red-800' : 'border-neutral-200 bg-white'
                  }`}
                >
                  {bar.instruction}
                  {bar.overflow && <span className="block text-red-600 font-sans mt-0.5">⚠ חתיכה ארוכה מחומר הגלם!</span>}
                </div>
              ))}
            </div>

            {packResult.warnings.length > 0 && (
              <div className="mt-2 p-2 bg-amber-50 rounded text-[10px] text-amber-700">
                {packResult.warnings.join(' · ')}
              </div>
            )}
          </Collapse>
        );
      })}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────
export default function CutList({ result }) {
  if (!result?.cutList?.length) return null;
  const {
    cutList, hardware, summary, loads, material,
    foundationDetails, roofDetails, electricalDetails,
    ledger, bracing, suspension, warnings = [],
  } = result;

  return (
    <div className="space-y-8 text-right" dir="rtl">

      {/* ── Warnings ─────────────────────────────────────────────── */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h4 className="text-xs font-bold text-amber-800">אזהרות</h4>
          </div>
          {warnings.map((w, i) => <p key={i} className="text-[11px] text-amber-900">{w}</p>)}
        </div>
      )}

      {/* ── Ledger info ──────────────────────────────────────────── */}
      {ledger && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900 space-y-0.5">
          <p className="font-bold text-xs">קורת קשר (Ledger) — {ledger.lengthM} מ'</p>
          <p>עוגנים: {ledger.anchors} × {ledger.anchorType} | מרווח: כל {ledger.anchorSpacingCM} ס"מ</p>
          <p>סוג בורג: {ledger.boltType}</p>
        </div>
      )}

      {/* ── Bracing info ──────────────────────────────────────────── */}
      {bracing?.required && (
        <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-[11px] text-purple-900 space-y-0.5">
          <p className="font-bold text-xs">חיזוק Bracing (45°) — {bracing.count} יחידות</p>
          <p>רגל: {bracing.legCM} ס"מ | אורך חלק: {bracing.pieceLengthM} מ' | סה"כ: {bracing.totalM} מ'</p>
        </div>
      )}

      {/* ── Suspension info ───────────────────────────────────────── */}
      {suspension && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[11px] text-red-900 space-y-0.5">
          <p className="font-bold text-xs">כבלי מתיחה (פרגולה תלויה)</p>
          <p>{suspension.numCables} כבלים | זווית: {suspension.cableAngleDeg}° | אורך כבל: {suspension.cableLenEach} מ' | סה"כ: {suspension.totalCableM} מ'</p>
          <p className="text-red-700 font-bold">כוח מתיחה: ~{suspension.tensionKg} kg — חיזוק קיר חובה!</p>
        </div>
      )}

      {/* ── Foundation details ────────────────────────────────────── */}
      {(foundationDetails?.concreteM3 > 0 || foundationDetails?.deckBlocking) && (
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-[11px] text-stone-900 space-y-0.5">
          <p className="font-bold text-xs">פרטי יסודות</p>
          {foundationDetails.concreteM3 > 0 && (
            <>
              <p>עומק בור: {foundationDetails.boreDepthM * 100} ס"מ | קוטר: {foundationDetails.boreDiameterCM} ס"מ</p>
              <p>נפח בטון: {foundationDetails.concreteM3} מ"ק | שקי 50 ק"ג: <b>{foundationDetails.concreteBags50kg}</b> שקים</p>
            </>
          )}
          {foundationDetails.deckBlocking && <p>{foundationDetails.deckBlocking.note}</p>}
        </div>
      )}

      {/* ── Roof panels ───────────────────────────────────────────── */}
      {roofDetails?.panels && (
        <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-[11px] text-sky-900 space-y-0.5">
          <p className="font-bold text-xs">לוחות גג</p>
          <p>{roofDetails.panels.note}</p>
          {!roofDetails.slopeOk && (
            <p className="text-red-600 font-bold">⚠ שיפוע מינימלי: {roofDetails.minRequiredSlope}% — הגדל שיפוע!</p>
          )}
        </div>
      )}

      {/* ── Cut list table ────────────────────────────────────────── */}
      <div>
        <SectionHeader icon={Package} title="רשימת חיתוך" badge="מקדם בזבוז 10%" color="blue" />
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-neutral-50">
                <TableHead className="text-right text-xs w-28">חלק</TableHead>
                <TableHead className="text-right text-xs">פרופיל</TableHead>
                <TableHead className="text-center text-xs w-16">אורך (מ')</TableHead>
                <TableHead className="text-center text-xs w-12">כמות</TableHead>
                <TableHead className="text-center text-xs w-20">סה"כ (מ')</TableHead>
                <TableHead className="text-center text-xs w-20">משקל/יח'</TableHead>
                <TableHead className="text-center text-xs w-20">משקל כולל</TableHead>
                <TableHead className="text-left text-xs w-24">עלות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cutList.map((row, i) => (
                <TableRow key={i} className="hover:bg-blue-50/40">
                  <TableCell className="text-xs font-medium">{row.part}</TableCell>
                  <TableCell className="text-xs text-neutral-600">{row.profile}</TableCell>
                  <TableCell className="text-center text-xs">{row.lengthM}</TableCell>
                  <TableCell className="text-center text-xs font-bold">{row.qty}</TableCell>
                  <TableCell className="text-center text-xs">{row.totalM}</TableCell>
                  <TableCell className="text-center text-xs">{row.weightPerUnit} kg</TableCell>
                  <TableCell className="text-center text-xs">{row.totalWeight} kg</TableCell>
                  <TableCell className="text-left text-xs font-semibold">{formatCurrency(row.totalPrice)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-neutral-100 font-bold">
                <TableCell colSpan={4} className="text-xs">סה"כ</TableCell>
                <TableCell className="text-center text-xs">{summary.totalMaterials} מ'</TableCell>
                <TableCell />
                <TableCell className="text-center text-xs">{summary.totalWeight} kg</TableCell>
                <TableCell className="text-left text-xs">{formatCurrency(summary.materialCost)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── 1D Bin Packing (spec §5.1) ────────────────────────────── */}
      <BinPackingSection cutList={cutList} materialCategory={material?.category} />

      {/* ── Hardware BOM (spec §5.2) ──────────────────────────────── */}
      <div>
        <SectionHeader icon={Wrench} title="רשימת מכולת — חומרי חיבור ואביזרים" color="green" />
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-neutral-50">
                <TableHead className="text-right text-xs">פריט</TableHead>
                <TableHead className="text-center text-xs w-14">כמות</TableHead>
                <TableHead className="text-center text-xs w-20">מחיר/יח'</TableHead>
                <TableHead className="text-left text-xs w-24">סה"כ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.values(hardware).filter(h => h.qty > 0).map((h, i) => (
                <TableRow key={i} className="hover:bg-emerald-50/40">
                  <TableCell className="text-xs">{h.label}</TableCell>
                  <TableCell className="text-center text-xs font-bold">{h.qty}</TableCell>
                  <TableCell className="text-center text-xs">{formatCurrency(h.priceEach)}</TableCell>
                  <TableCell className="text-left text-xs font-semibold">{formatCurrency(h.qty * h.priceEach)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Electrical (spec §4) ──────────────────────────────────── */}
      {electricalDetails?.cableM > 0 && (
        <div className="p-3 rounded-xl bg-yellow-50 border border-yellow-200 text-[11px] text-yellow-900 space-y-0.5">
          <p className="font-bold text-xs">חיווט חשמל</p>
          <p>{electricalDetails.note}</p>
          {electricalDetails.lightingPoints > 0 && <p>נקודות תאורה: {electricalDetails.lightingPoints}</p>}
        </div>
      )}

      {/* ── Structural loads ──────────────────────────────────────── */}
      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <h4 className="text-xs font-bold text-amber-800">נתוני עומסים</h4>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-amber-900">
          <span>משקל מבנה: {loads.structuralWeight} kg</span>
          <span>משקל חומר גג: {loads.roofMaterialWeight} kg</span>
          <span>עומס חי (50 kg/m²): {loads.totalLiveLoad} kg</span>
          <span>עומס תכנון (×1.25): {loads.totalDesignLoad} kg</span>
          <span>עומס ליסוד: {loads.designLoadPerFooting} kg</span>
          <span>כוח רוח (uplift): {loads.windUpliftForceN} N</span>
        </div>
        <p className="text-[10px] mt-2 text-amber-700">* נתונים להערכה בלבד — נדרש אישור מהנדס מבנים</p>
      </div>
    </div>
  );
}
