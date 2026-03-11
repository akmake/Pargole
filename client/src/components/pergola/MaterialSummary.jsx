import { calcTotalPrice, formatCurrency } from '@/utils/pergolaPrice';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  ShieldCheck, Ruler, Sun, Wind, Droplets, Weight, DollarSign,
  TrendingUp, Info, Clock, Wrench, ArrowRight,
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
    green:  'bg-green-50 text-green-700 border-green-200',
    amber:  'bg-amber-50 text-amber-700 border-amber-200',
    red:    'bg-red-50 text-red-700 border-red-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
  };
  return (
    <div className={`rounded-lg border p-3 ${colors[color] ?? colors.blue}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold leading-tight">{value}</p>
      {sub && <p className="text-[10px] mt-0.5 opacity-75">{sub}</p>}
    </div>
  );
}

export default function MaterialSummary({ result, pricingParams = {} }) {
  if (!result) return null;

  const pricing = calcTotalPrice(result, pricingParams);
  const { structure, coverage, loads, material, roof, foundation, wind, finishData, sideCosts } = result;
  const maxCost = Math.max(...pricing.breakdown.map(r => r.cost), 1);

  return (
    <div className="space-y-5 text-right" dir="rtl">

      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        <StatCard icon={DollarSign} label='מחיר סופי ללקוח' value={formatCurrency(pricing.total)} sub={`${formatCurrency(pricing.pricePerSqM)} / מ"ר`} color="green" />
        <StatCard icon={Ruler}      label='שטח כיסוי'        value={`${coverage.roofArea} מ"ר`} sub={`${coverage.area} מ"ר רצפה`} />
        <StatCard icon={Sun}        label='צל'               value={`${coverage.shadePercent}%`} sub={`${coverage.shadedArea} מ"ר מוצלים`} color="amber" />
        <StatCard icon={Weight}     label='משקל מבנה'        value={`${loads.totalWeight} kg`} sub={`${loads.weightPerFooting} kg ליסוד`} color="red" />
        <StatCard icon={Wind}       label='לחץ רוח'          value={`${loads.windPressureKPa} kPa`} sub={wind.label ?? ''} color="violet" />
        <StatCard icon={ShieldCheck} label='עומס תכנון'      value={`${loads.totalDesignLoad} kg`} sub={`${loads.designLoadPerFooting} kg/יסוד`} />
        <StatCard icon={Clock}      label='שעות עבודה'       value={`${result.laborHours ?? 0} שע'`} sub={`× ₪250/שעה`} color="violet" />
      </div>

      <Separator />

      {/* ── Structure Summary ──────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-bold mb-2">סיכום מבנה</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-neutral-700">
          <span>חומר: <b>{material.label}</b></span>
          <span>סוג גג: <b>{roof.label}</b></span>
          <span>עמודים: <b>{structure.totalColumns}</b> ({structure.colsAlongLength}×{structure.colRowsWidth})</span>
          <span>קורות ראשיות: <b>{structure.mainBeamCount}</b> × {structure.mainBeamLength} מ'</span>
          <span>קורות משניות: <b>{structure.numSecBeams}</b> × {structure.secBeamLength} מ' (כל {structure.secBeamSpacing} מ')</span>
          <span>שלבים/רפטרים: <b>{structure.numRafters}</b> × {structure.rafterLength} מ' (כל {structure.rafterSpacing} מ')</span>
          <span>שליפה: <b>{structure.overhangM} מ'</b></span>
          {structure.slopePercent > 0 && <span>שיפוע: <b>{structure.slopePercent}%</b> | זווית: {structure.slopeAngleDeg}°</span>}
          {structure.columnBuriedM > 0 && <span>עמוד קבור: <b>{structure.columnBuriedM * 100} ס"מ</b> | גלוי: {structure.columnVisibleM} מ'</span>}
          <span>יסוד: <b>{foundation.label}</b></span>
          <span>גימור: <b>{finishData.label}</b></span>
        </div>
      </div>

      <Separator />

      {/* ── Pricing formula trace (spec §5.3) ─────────────────────── */}
      <div>
        <h3 className="text-sm font-bold mb-3">פירוט מחיר — נוסחת תמחור (מפרט §5.3)</h3>

        {/* Breakdown bars */}
        <div className="space-y-2 mb-4">
          {pricing.breakdown.map((item, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-neutral-600">{item.label}</span>
                <span className="font-semibold">{formatCurrency(item.cost)}</span>
              </div>
              <Progress value={(item.cost / maxCost) * 100} className="h-1.5" />
            </div>
          ))}
        </div>

        {/* Formula steps */}
        <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3 space-y-1.5 text-xs text-neutral-700">
          <p className="font-bold text-neutral-800 mb-1">שלבי החישוב:</p>
          {[
            { label: 'שלב 1 — חומרים + עבודה', value: pricing.formulaTrace.step1 },
            { label: 'שלב 2 — × 1.15 בלת"מ',    value: pricing.formulaTrace.step2 },
            { label: 'שלב 3 — × 1.30 רווח קבלני', value: pricing.formulaTrace.step3 },
            { label: 'שלב 4 — תוספות',          value: pricing.formulaTrace.step4 },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <ArrowRight className="w-3 h-3 mt-0.5 text-emerald-500 shrink-0" />
              <div>
                <span className="text-neutral-500">{step.label}: </span>
                <span className="font-mono font-semibold">{step.value}</span>
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-3" />

        {/* Surcharge / crane */}
        {(pricing.floorSurcharge > 0 || pricing.craneCost > 0) && (
          <div className="space-y-1 text-xs mb-3">
            {pricing.floorSurcharge > 0 && (
              <div className="flex justify-between">
                <span className="text-neutral-600">{pricing.floorNote}</span>
                <span className="font-semibold">{formatCurrency(pricing.floorSurcharge)}</span>
              </div>
            )}
            {pricing.craneCost > 0 && (
              <div className="flex justify-between">
                <span className="text-neutral-600">{pricing.craneNote}</span>
                <span className="font-semibold">{formatCurrency(pricing.craneCost)}</span>
              </div>
            )}
            {pricing.craneForced && (
              <p className="text-red-600 text-[10px] font-semibold">⚠ מנוף חובה מעל קומה 4</p>
            )}
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between text-base font-bold text-green-700">
          <span>מחיר סופי ללקוח</span>
          <span>{formatCurrency(pricing.total)}</span>
        </div>
        <p className="text-[10px] text-neutral-400 mt-0.5">
          {formatCurrency(pricing.pricePerSqM)} / מ"ר · {pricing.laborHours} שעות עבודה
        </p>
      </div>

      {/* ── Side costs detail ──────────────────────────────────────── */}
      {result.totalSideCost > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-bold mb-2">חיפויי צד</h3>
            <div className="space-y-1 text-xs">
              {sideCosts.filter(s => s.price > 0).map((s, i) => (
                <div key={i} className="flex justify-between">
                  <span>
                    {s.side === 'front' ? 'חזית' : s.side === 'back' ? 'גב' : s.side === 'left' ? 'שמאל' : 'ימין'}
                    {' '}— {s.label} ({s.areaSqM} מ"ר)
                  </span>
                  <span className="font-semibold">{formatCurrency(s.price)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Disclaimer ─────────────────────────────────────────────── */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-neutral-50 border text-[11px] text-neutral-500">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          המחירים הם הערכה בלבד. הנוסחה המלאה: (חומרים+עבודה)×1.15×1.30.
          נדרש אישור מהנדס מבנים לכל מבנה מעל 20 מ"ר.
        </span>
      </div>
    </div>
  );
}
