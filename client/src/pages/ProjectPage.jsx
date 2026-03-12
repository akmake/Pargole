import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Hammer, ArrowRight, Plus, Pencil, Check, Trash2,
  Scissors, ShoppingCart, Package, ChevronDown, AlertTriangle,
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { formatCurrency } from '@/utils/pergolaPrice';
import { generateProjectCutPlan, WOOD_STOCKS } from '@/utils/binPacking';

// ── Collapse helper ───────────────────────────────────────────────────────────
function Collapse({ title, badge, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-right transition-colors"
      >
        <span>{title}</span>
        <div className="flex items-center gap-2">
          {badge && (
            <span className="text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5 text-gray-500">
              {badge}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

// ── Stock settings ────────────────────────────────────────────────────────────
function StockSettings({ stockLengths, setStockLength }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
      <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
        <ShoppingCart className="w-3.5 h-3.5" />
        אורכי סחורה לחישוב הזמנה
      </p>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-600 w-28 shrink-0">אלומיניום / מתכת</span>
        <div className="flex items-center gap-1.5 flex-1 flex-wrap">
          {[4, 5, 6, 7, 8].map((len) => (
            <button
              key={len}
              onClick={() => setStockLength('aluminum', len)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                stockLengths.aluminum === len
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-amber-400'
              }`}
            >
              {len}מ׳
            </button>
          ))}
          <input
            type="number" min={1} max={15} step={0.5}
            value={stockLengths.aluminum}
            onChange={(e) => { const v = parseFloat(e.target.value); if (v > 0) setStockLength('aluminum', v); }}
            className="w-14 h-7 rounded-lg border border-gray-200 px-1.5 text-xs text-center bg-white outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-600 w-28 shrink-0">עץ</span>
        <div className="flex items-center gap-1.5 flex-1 flex-wrap">
          <button
            onClick={() => setStockLength('wood', null)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
              stockLengths.wood === null
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-amber-400'
            }`}
          >
            אוטו
          </button>
          {WOOD_STOCKS.filter((s) => s >= 3.0).map((len) => (
            <button
              key={len}
              onClick={() => setStockLength('wood', len)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                stockLengths.wood === len
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-amber-400'
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

// ── Combined cut plan ─────────────────────────────────────────────────────────
function CombinedCutPlan({ plan }) {
  if (!plan.length) return null;
  const totalBars = plan.reduce((s, p) => s + p.packResult.totalBars, 0);
  const totalWaste = plan.reduce((s, p) => s + p.packResult.totalWasteM, 0).toFixed(2);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Scissors className="w-4 h-4 text-purple-600" />
        <span className="text-sm font-bold">תוכנית חיתוך מאוחדת</span>
        <span className="text-xs bg-purple-100 text-purple-700 rounded-full px-2 py-0.5 font-semibold">
          {totalBars} יחידות חומר גלם
        </span>
        <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-semibold">
          {totalWaste} מ׳ פחת
        </span>
      </div>
      {plan.map(({ profile, materialCategory, packResult }) => (
        <Collapse
          key={`${profile}||${materialCategory}`}
          title={`${profile} (${materialCategory === 'wood' ? 'עץ' : 'אלומיניום'}) — ${packResult.totalBars} יחידות × ${packResult.stockLength}מ׳`}
          badge={`${packResult.efficiencyPct}% יעילות`}
        >
          <div className="space-y-1.5">
            {packResult.warnings?.map((w, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {w}
              </div>
            ))}
            {packResult.bars.map((bar) => (
              <div key={bar.barIndex} className={`text-xs rounded-lg px-3 py-2 ${bar.overflow ? 'bg-red-50 text-red-700' : 'bg-gray-50'}`}>
                <span className="font-semibold">יחידה {bar.barIndex}:</span>{' '}
                {bar.cuts.map((c, i) => (
                  <span key={i} className="inline-block ml-1 bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[11px]">
                    {c.toFixed(2)} מ׳
                  </span>
                ))}
                {bar.waste > 0 && (
                  <span className="text-gray-400 mr-1">| שארית: {bar.waste.toFixed(2)} מ׳</span>
                )}
              </div>
            ))}
          </div>
        </Collapse>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { projects, renameProject, deletePergola, stockLengths, setStockLength } = useProjectStore();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const project = projects.find((p) => p.id === projectId);

  useEffect(() => {
    if (project) {
      document.title = `${project.name} | PergoCalc`;
      setNameInput(project.name);
    }
  }, [project?.name]);

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400" dir="rtl">
        <div className="text-center">
          <p className="text-lg font-bold mb-2">הפרויקט לא נמצא</p>
          <button onClick={() => navigate('/')} className="text-emerald-600 text-sm hover:underline">
            חזור לדף הבית
          </button>
        </div>
      </div>
    );
  }

  const totalCost = project.pergolas.reduce((s, g) => s + (g.pricing?.total || 0), 0);

  const combinedPlan = useMemo(() => {
    if (!project.pergolas.length) return [];
    return generateProjectCutPlan(
      project.pergolas.map((g) => ({ cutList: g.result?.cutList || [], materialCategory: g.materialCategory })),
      stockLengths
    );
  }, [project.pergolas, stockLengths]);

  const totalBars = combinedPlan.reduce((s, p) => s + p.packResult.totalBars, 0);

  const saveName = () => {
    if (nameInput.trim()) renameProject(projectId, nameInput.trim());
    setEditingName(false);
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center gap-4">

          {/* Back */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors shrink-0"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="hidden sm:inline">הפרויקטים שלי</span>
          </button>

          <div className="w-px h-5 bg-gray-200 shrink-0" />

          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Hammer className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          {/* Project name (editable) */}
          {editingName ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                className="flex-1 border border-emerald-400 rounded-xl px-3 py-1.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button onClick={saveName} className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="flex items-center gap-2 hover:text-emerald-700 group flex-1 min-w-0"
            >
              <span className="text-base font-bold text-gray-900 truncate">{project.name}</span>
              <Pencil className="w-3.5 h-3.5 text-gray-300 group-hover:text-emerald-500 shrink-0" />
            </button>
          )}

          {/* Stats */}
          <div className="flex items-center gap-3 shrink-0 mr-auto">
            <span className="text-xs text-gray-400 hidden sm:inline">
              {project.pergolas.length} פרגולות
            </span>
            {totalCost > 0 && (
              <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold">
                {formatCurrency(totalCost)}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8 space-y-10">

        {/* ── Section: Pergola cards ──────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold text-gray-900">הפרגולות בפרויקט</h2>
            <button
              onClick={() => navigate(`/project/${projectId}/pergola/new`)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              פרגולה חדשה
            </button>
          </div>

          {project.pergolas.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
              <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500 mb-1">אין פרגולות עדיין</p>
              <p className="text-xs text-gray-400 mb-5">לחץ על "פרגולה חדשה" כדי להתחיל לתכנן</p>
              <button
                onClick={() => navigate(`/project/${projectId}/pergola/new`)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                פרגולה חדשה
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.pergolas.map((pergola) => (
                <div
                  key={pergola.id}
                  className="group bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{pergola.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {pergola.params?.length} × {pergola.params?.width} × {pergola.params?.height} מ׳
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm(`למחוק "${pergola.name}"?`)) {
                          deletePergola(projectId, pergola.id);
                        }
                      }}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all shrink-0"
                      aria-label="מחק פרגולה"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    {pergola.pricing?.total ? (
                      <span className="text-sm font-extrabold text-emerald-700">
                        {formatCurrency(pergola.pricing.total)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">אין תמחור</span>
                    )}
                    <button
                      onClick={() => navigate(`/project/${projectId}/pergola/${pergola.id}`)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-emerald-100 text-gray-600 hover:text-emerald-700 text-xs font-semibold transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      ערוך
                    </button>
                  </div>
                </div>
              ))}

              {/* Add pergola card */}
              <button
                onClick={() => navigate(`/project/${projectId}/pergola/new`)}
                className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-4 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-emerald-600 min-h-[120px]"
              >
                <Plus className="w-5 h-5" />
                <span className="text-xs font-semibold">פרגולה חדשה</span>
              </button>
            </div>
          )}
        </section>

        {/* ── Section: Combined order ─────────────────────────────────── */}
        {project.pergolas.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-extrabold text-gray-900">הזמנה כוללת</h2>
              {totalCost > 0 && (
                <span className="text-sm font-extrabold text-emerald-600 mr-auto">
                  {formatCurrency(totalCost)}
                </span>
              )}
            </div>

            {/* Summary pills */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-emerald-600 font-semibold mb-0.5">פרגולות</p>
                <p className="text-2xl font-black text-emerald-700">{project.pergolas.length}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-blue-600 font-semibold mb-0.5">יחידות חומר</p>
                <p className="text-2xl font-black text-blue-700">{totalBars}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-purple-600 font-semibold mb-0.5">עלות כוללת</p>
                <p className="text-xl font-black text-purple-700">{formatCurrency(totalCost)}</p>
              </div>
            </div>

            <div className="space-y-5">
              <StockSettings stockLengths={stockLengths} setStockLength={setStockLength} />
              {combinedPlan.length > 0 ? (
                <CombinedCutPlan plan={combinedPlan} />
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-sm text-gray-400">
                  הוסף פרגולות כדי לחשב הזמנה מאוחדת
                </div>
              )}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
