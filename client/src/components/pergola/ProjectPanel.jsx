import { useMemo, useState } from 'react';
import { Trash2, Package, Scissors, ChevronDown, AlertTriangle, Layers, ShoppingCart } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { generateProjectCutPlan, WOOD_STOCKS } from '@/utils/binPacking';
import { formatCurrency } from '@/utils/pergolaPrice';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';

// ── Small helpers ────────────────────────────────────────────────────────────

function Collapse({ title, badge, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full px-4 py-2.5 bg-neutral-50 hover:bg-neutral-100 text-xs font-semibold text-right"
      >
        <span>{title}</span>
        <div className="flex items-center gap-2">
          {badge && <Badge variant="outline" className="text-[10px]">{badge}</Badge>}
          <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && <div className="p-3">{children}</div>}
    </div>
  );
}

// ── Saved pergola card ───────────────────────────────────────────────────────

function PergolaCard({ project, onRemove }) {
  const { name, params, pricing, materialCategory, savedAt } = project;
  const date = new Date(savedAt).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });

  return (
    <div className="flex items-start gap-3 bg-white border border-neutral-200 rounded-xl p-3 shadow-sm">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-neutral-900 truncate">{name}</span>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {materialCategory === 'wood' ? 'עץ' : 'אלומיניום'}
          </Badge>
          <span className="text-[10px] text-neutral-400 mr-auto">{date}</span>
        </div>
        <p className="text-[11px] text-neutral-500 mt-0.5">
          {params.length} × {params.width} מ׳ | גובה {params.height} מ׳
        </p>
        {pricing && (
          <p className="text-xs font-bold text-emerald-700 mt-1">{formatCurrency(pricing.total)}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(project.id)}
        className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-colors shrink-0"
        aria-label={`מחק ${name}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Stock length controls ────────────────────────────────────────────────────

function StockSettings({ stockLengths, setStockLength }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-3">
      <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
        <ShoppingCart className="w-3.5 h-3.5" />
        אורכי סחורה לחישוב הזמנה
      </p>

      {/* Aluminum */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] text-neutral-600 w-24 shrink-0">אלומיניום / מתכת</span>
        <div className="flex items-center gap-1.5 flex-1">
          {[4, 5, 6, 7, 8].map((len) => (
            <button
              key={len}
              onClick={() => setStockLength('aluminum', len)}
              className={`flex-1 py-1 rounded-lg text-[11px] font-semibold border transition ${
                stockLengths.aluminum === len
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-amber-400'
              }`}
            >
              {len}מ׳
            </button>
          ))}
          <input
            type="number"
            min={1} max={15} step={0.5}
            value={stockLengths.aluminum}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v > 0) setStockLength('aluminum', v);
            }}
            className="w-14 h-7 rounded-lg border border-neutral-200 px-1.5 text-[11px] text-center bg-white outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>
      </div>

      {/* Wood */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] text-neutral-600 w-24 shrink-0">עץ</span>
        <div className="flex items-center gap-1.5 flex-1">
          <button
            onClick={() => setStockLength('wood', null)}
            className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition ${
              stockLengths.wood === null
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white text-neutral-600 border-neutral-200 hover:border-amber-400'
            }`}
          >
            אוטו
          </button>
          {WOOD_STOCKS.filter((s) => s >= 3.0).map((len) => (
            <button
              key={len}
              onClick={() => setStockLength('wood', len)}
              className={`flex-1 py-1 rounded-lg text-[11px] font-semibold border transition ${
                stockLengths.wood === len
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-amber-400'
              }`}
            >
              {len}מ׳
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Combined cut plan ────────────────────────────────────────────────────────

function CombinedCutPlan({ plan }) {
  if (!plan.length) return null;

  const totalBars = plan.reduce((s, p) => s + p.packResult.totalBars, 0);
  const totalWaste = plan.reduce((s, p) => s + p.packResult.totalWasteM, 0).toFixed(2);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Scissors className="w-4 h-4 text-purple-600" />
        <span className="text-sm font-bold">תוכנית חיתוך מאוחדת</span>
        <Badge variant="outline" className="text-[10px]">{totalBars} יחידות חומר גלם</Badge>
        <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">
          {totalWaste} מ׳ פחת
        </Badge>
      </div>

      {plan.map(({ profile, materialCategory, packResult }) => {
        const matLabel = materialCategory === 'wood' ? 'עץ' : 'אלומיניום';
        const stockLabel = `${packResult.stockLength} מ׳`;
        const title = `${profile} (${matLabel}) — ${packResult.totalBars} יחידות × ${stockLabel}`;

        return (
          <Collapse
            key={`${profile}||${materialCategory}`}
            title={title}
            badge={`${packResult.efficiencyPct}% יעילות`}
            defaultOpen={false}
          >
            <div className="space-y-1.5">
              {packResult.warnings?.map((w, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[10px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                  {w}
                </div>
              ))}
              {packResult.bars.map((bar) => (
                <div key={bar.barIndex} className={`text-[11px] rounded-lg px-2.5 py-1.5 ${bar.overflow ? 'bg-red-50 text-red-700' : 'bg-neutral-50'}`}>
                  <span className="font-semibold">יחידה {bar.barIndex}:</span>{' '}
                  {bar.cuts.map((c, i) => (
                    <span key={i} className="inline-block ml-1 bg-white border border-neutral-200 rounded px-1 py-0.5 text-[10px]">
                      {c.toFixed(2)} מ׳
                    </span>
                  ))}
                  {bar.waste > 0 && (
                    <span className="text-neutral-400 mr-1">| שארית: {bar.waste.toFixed(2)} מ׳</span>
                  )}
                </div>
              ))}
            </div>
          </Collapse>
        );
      })}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ProjectPanel() {
  const { projects, removeProject, clearProjects, stockLengths, setStockLength } = useProjectStore();

  const combinedPlan = useMemo(() => {
    if (!projects.length) return [];
    const inputs = projects.map((p) => ({
      cutList: p.result?.cutList || [],
      materialCategory: p.materialCategory,
    }));
    return generateProjectCutPlan(inputs, stockLengths);
  }, [projects, stockLengths]);

  const totalCost = useMemo(
    () => projects.reduce((s, p) => s + (p.pricing?.total || 0), 0),
    [projects]
  );

  const totalBarsAll = combinedPlan.reduce((s, p) => s + p.packResult.totalBars, 0);

  if (!projects.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-neutral-400">
        <Layers className="w-10 h-10 opacity-30" />
        <p className="text-sm font-semibold">אין פרגולות שמורות</p>
        <p className="text-xs max-w-xs">
          הגדר פרגולה ולחץ <strong>"שמור לפרויקט"</strong> כדי לצרף אותה להזמנה המאוחדת.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-emerald-600 font-semibold">פרגולות</p>
          <p className="text-xl font-black text-emerald-700">{projects.length}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-blue-600 font-semibold">יחידות חומר</p>
          <p className="text-xl font-black text-blue-700">{totalBarsAll}</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-purple-600 font-semibold">עלות כוללת</p>
          <p className="text-lg font-black text-purple-700">{formatCurrency(totalCost)}</p>
        </div>
      </div>

      {/* Saved pergolas list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Package className="w-4 h-4 text-neutral-500" />
            <span className="text-sm font-bold">פרגולות בפרויקט</span>
          </div>
          <button
            onClick={() => { if (window.confirm('למחוק את כל הפרגולות?')) clearProjects(); }}
            className="text-[11px] text-red-400 hover:text-red-600 transition-colors"
          >
            נקה הכל
          </button>
        </div>
        {projects.map((p) => (
          <PergolaCard key={p.id} project={p} onRemove={removeProject} />
        ))}
      </div>

      {/* Stock length settings */}
      <StockSettings stockLengths={stockLengths} setStockLength={setStockLength} />

      {/* Combined cut plan */}
      <CombinedCutPlan plan={combinedPlan} />
    </div>
  );
}
