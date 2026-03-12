import { useState, useMemo, Suspense, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hammer, Eye, ClipboardList, BarChart3, Download, RotateCcw,
  SlidersHorizontal, X, ChevronUp, Share2, Sparkles, Check, ArrowRight, Save,
} from 'lucide-react';
import { calculatePergola } from '@/utils/pergolaEngine';
import { calcTotalPrice, formatCurrency } from '@/utils/pergolaPrice';
import PergolaConfigurator from '@/components/pergola/PergolaConfigurator';
import CutList from '@/components/pergola/CutList';
import MaterialSummary from '@/components/pergola/MaterialSummary';
import PergolaViewer3D from '@/components/pergola/PergolaViewer3D';
import { useProjectStore } from '@/stores/projectStore';

const DEFAULT_PARAMS = {
  length: 4, width: 3, height: 2.7,
  material: 'pine', installType: 'wallMounted',
  roofType: 'openSlats', foundationType: 'surfaceMountBracket',
  windZone: 'inland_normal', finish: 'natural',
  overhangCM: 20, slopePercent: 2,
  lightingOption: 'none', gutterType: 'none',
  sides: { front: 'none', back: 'none', left: 'none', right: 'none' },
  columnProfile: null, mainBeamProfile: null,
  secBeamProfile: null, rafterProfile: null,
  manualRafterCount: 0, manualSecBeamCount: 0,
  manualRafterSpacingCM: 0, manualColsAlongLength: 0,
  wallType: 'concrete',
  desiredShadePct: 0,
  slatWidthCM: 10,
  floorNumber: 0,
  craneType: 'none',
};

// ── Bottom Sheet ──────────────────────────────────────────────────────────────
function BottomSheet({ open, onClose, title, children }) {
  const sheetRef = useRef(null);
  const [startY, setStartY] = useState(null);

  const handleTouchStart = (e) => setStartY(e.touches[0].clientY);
  const handleTouchEnd = (e) => {
    if (startY !== null && e.changedTouches[0].clientY - startY > 80) onClose();
    setStartY(null);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[88vh] flex flex-col"
            onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3">
              <h2 className="text-base font-bold">{title}</h2>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-8 overscroll-contain">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Mobile tab button ─────────────────────────────────────────────────────────
function TabBtn({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
        active ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px]">{label}</span>
    </button>
  );
}

// ── Stat Pill ─────────────────────────────────────────────────────────────────
function StatPill({ label, value }) {
  return (
    <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur rounded-full px-3 py-1.5 shadow-sm">
      <span className="text-[10px] text-gray-500">{label}</span>
      <span className="text-xs font-bold">{value}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PergolaPlannerPage() {
  const { projectId, pergolaId } = useParams();
  const navigate = useNavigate();
  const isNew = pergolaId === 'new';

  const { projects, addPergola, updatePergola } = useProjectStore();

  // Load existing pergola params on mount
  const initialPergola = useMemo(() => {
    if (isNew) return null;
    const proj = projects.find((p) => p.id === projectId);
    return proj?.pergolas.find((g) => g.id === pergolaId) || null;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [params, setParams] = useState(() => initialPergola?.params || DEFAULT_PARAMS);
  const [pergolaName, setPergolaName] = useState(() => initialPergola?.name || '');
  const [activeView, setActiveView] = useState('3d');
  const [configOpen, setConfigOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const project = projects.find((p) => p.id === projectId);

  useEffect(() => {
    document.title = isNew ? 'פרגולה חדשה | PergoCalc' : `${initialPergola?.name || 'ערוך פרגולה'} | PergoCalc`;
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const result = useMemo(() => {
    try { return calculatePergola(params); }
    catch { return null; }
  }, [params]);

  const pricingParams = useMemo(() => ({
    floorNumber: params.floorNumber ?? 0,
    craneType: params.craneType ?? 'none',
  }), [params.floorNumber, params.craneType]);

  const pricing = useMemo(
    () => result ? calcTotalPrice(result, pricingParams) : null,
    [result, pricingParams]
  );

  const handleReset = useCallback(() => setParams(DEFAULT_PARAMS), []);

  const handleSave = useCallback(() => {
    if (!result) return;
    const name = pergolaName.trim() || `פרגולה ${params.length}×${params.width}`;
    const materialCategory =
      params.material === 'aluminum' ? 'aluminum' :
      params.material === 'steel'    ? 'steel'    : 'wood';
    const data = { name, params, result, pricing, materialCategory };

    if (isNew) {
      addPergola(projectId, data);
    } else {
      updatePergola(projectId, pergolaId, data);
    }

    setSavedFlash(true);
    setTimeout(() => {
      setSavedFlash(false);
      navigate(`/project/${projectId}`);
    }, 600);
  }, [result, pricing, params, pergolaName, isNew, projectId, pergolaId, addPergola, updatePergola, navigate]);

  const handleExportCSV = useCallback(() => {
    if (!result || !pricing) return;
    const rows = [
      ['סוג', 'פרופיל', 'אורך (מ\')', 'כמות', 'סה"כ מ\'', 'עלות כוללת ₪'],
      ...result.cutList.map(r => [r.part, r.profile, r.lengthM, r.qty, r.totalM, r.totalPrice]),
      [], ['מחיר סופי ללקוח', '', '', '', '', pricing.total],
    ];
    const csv = '\uFEFF' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pergola-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [result, pricing]);

  const handleExportPDF = useCallback(async () => {
    if (!result || !pricing) return;
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const ltr = (s) => String(s ?? '');
      let y = 15;
      const line = (text, x = 15, size = 10, bold = false) => {
        doc.setFontSize(size); doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.text(ltr(text), x, y); y += size * 0.5 + 2;
      };
      const hr = () => { doc.setDrawColor(200); doc.line(15, y, 195, y); y += 4; };

      line(`${pergolaName || 'Pergola'} – Design Report`, 15, 14, true);
      line(`${result.input.length}m × ${result.input.width}m × ${result.input.height}m | ${result.material.label}`, 15, 10);
      hr();
      line('Structure', 15, 12, true);
      line(`Columns: ${result.structure.totalColumns} | Rafters: ${result.structure.numRafters}`);
      line(`Main beams: ${result.structure.mainBeamCount} × ${result.structure.mainBeamLength}m`);
      hr();
      line('Cut List', 15, 12, true);
      for (const r of result.cutList) {
        if (y > 260) { doc.addPage(); y = 15; }
        doc.setFontSize(8);
        doc.text(`${r.part} | ${r.profile} | ${r.lengthM}m × ${r.qty} = ${r.totalM}m`, 15, y);
        y += 4.5;
      }
      hr();
      line(`TOTAL PRICE: NIS ${pricing.total.toFixed(0)}`, 15, 13, true);
      doc.save(`pergola-${Date.now()}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  }, [result, pricing, pergolaName]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: pergolaName || 'הפרגולה שלי',
          text: `פרגולה ${params.length}×${params.width}m — ${pricing ? formatCurrency(pricing.total) : ''}`,
          url: window.location.href,
        });
      } catch (_) { /* cancelled */ }
    }
  }, [params, pricing, pergolaName]);

  // ── DESKTOP ───────────────────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <div className="h-screen flex flex-col bg-gray-50 overflow-hidden" dir="rtl">

        {/* Header */}
        <header className="shrink-0 bg-white border-b border-gray-200 z-30">
          <div className="px-5 h-14 flex items-center gap-3">

            {/* Back to project */}
            <button
              onClick={() => navigate(`/project/${projectId}`)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors shrink-0"
            >
              <ArrowRight className="w-4 h-4" />
              {project?.name || 'הפרויקט'}
            </button>

            <div className="w-px h-5 bg-gray-200 shrink-0" />

            <div className="flex items-center gap-2 shrink-0">
              <div className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center">
                <Hammer className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-extrabold text-gray-900">
                Pergo<span className="text-emerald-600">Calc</span>
              </span>
            </div>

            <div className="w-px h-5 bg-gray-200 shrink-0" />

            {/* Pergola name input */}
            <input
              type="text"
              placeholder={`פרגולה ${params.length}×${params.width}`}
              value={pergolaName}
              onChange={(e) => setPergolaName(e.target.value)}
              className="text-sm font-semibold border-0 outline-none bg-transparent placeholder:text-gray-300 text-gray-900 w-48"
            />

            {/* Right actions */}
            <div className="flex items-center gap-1.5 mr-auto">
              <button onClick={handleReset} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="איפוס">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button onClick={handleExportCSV} disabled={!result} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-colors">
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button onClick={handleExportPDF} disabled={!result} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-colors">
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
              <button
                onClick={handleSave}
                disabled={!result}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40 ${
                  savedFlash
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {savedFlash ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {savedFlash ? 'נשמר!' : (isNew ? 'שמור לפרויקט' : 'שמור שינויים')}
              </button>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left sidebar – configurator */}
          <aside className="w-[320px] shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-4 pb-2 shrink-0">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">הגדרות פרגולה</span>
              {pricing && (
                <span className="mr-auto text-sm font-extrabold text-emerald-600">{formatCurrency(pricing.total)}</span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
              <PergolaConfigurator params={params} onChange={setParams} result={result} />
            </div>
          </aside>

          {/* Right main area – analysis */}
          <main className="flex-1 flex flex-col overflow-hidden min-w-0">

            {/* Tab bar */}
            <div className="shrink-0 px-5 pt-4 pb-0">
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                {[
                  { id: '3d',      label: 'תצוגה 3D',      icon: Eye },
                  { id: 'cutlist', label: 'רשימת חיתוך',   icon: ClipboardList },
                  { id: 'summary', label: 'סיכום ותמחור',  icon: BarChart3 },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveView(t.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeView === t.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <t.icon className="w-4 h-4" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeView === '3d' && (
                <div className="space-y-4 h-full flex flex-col">
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex-1 min-h-0">
                    <Suspense fallback={
                      <div className="w-full h-full min-h-[500px] animate-pulse bg-gray-50 flex items-center justify-center text-gray-400">
                        <Sparkles className="w-6 h-6 animate-spin" />
                      </div>
                    }>
                      <PergolaViewer3D result={result} />
                    </Suspense>
                  </div>
                  {result && (
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <StatPill label="עמודים"      value={result.structure.totalColumns} />
                      <StatPill label="שלבי גג"     value={result.structure.numRafters} />
                      <StatPill label="שטח"         value={`${result.coverage.area} מ"ר`} />
                      <StatPill label="צל"          value={`${result.coverage.shadePercent}%`} />
                      <StatPill label="משקל"        value={`${result.loads.totalWeight} kg`} />
                    </div>
                  )}
                </div>
              )}
              {activeView === 'cutlist' && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <CutList result={result} />
                </div>
              )}
              {activeView === 'summary' && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <MaterialSummary result={result} pricingParams={pricingParams} />
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ── MOBILE ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-24" dir="rtl">

      {/* Mobile header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2 px-4 h-14">
          <button
            onClick={() => navigate(`/project/${projectId}`)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 shrink-0"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <input
            type="text"
            placeholder={`פרגולה ${params.length}×${params.width}`}
            value={pergolaName}
            onChange={(e) => setPergolaName(e.target.value)}
            className="flex-1 text-sm font-semibold border-0 outline-none bg-transparent placeholder:text-gray-300"
          />
          {pricing && (
            <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold shrink-0">
              {formatCurrency(pricing.total)}
            </span>
          )}
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={handleShare} className="p-2 rounded-lg hover:bg-gray-100">
              <Share2 className="w-4 h-4 text-gray-400" />
            </button>
            <button onClick={handleExportPDF} disabled={!result} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40">
              <Download className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-3 pt-3 space-y-3">
        {activeView === '3d' && (
          <>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <Suspense fallback={
                <div className="w-full h-[50vh] animate-pulse bg-gray-100 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-gray-300 animate-spin" />
                </div>
              }>
                <PergolaViewer3D result={result} mobile />
              </Suspense>
            </div>
            {result && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { l: 'עמודים', v: result.structure.totalColumns },
                  { l: 'שלבי גג', v: result.structure.numRafters },
                  { l: 'שטח', v: `${result.coverage.area} מ"ר` },
                ].map((s, i) => (
                  <div key={i} className="bg-white rounded-xl p-2.5 text-center shadow-sm">
                    <p className="text-[10px] text-gray-400">{s.l}</p>
                    <p className="text-sm font-bold mt-0.5">{s.v}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeView === 'cutlist' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <CutList result={result} />
          </div>
        )}

        {activeView === 'summary' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <MaterialSummary result={result} pricingParams={pricingParams} />
          </div>
        )}
      </div>

      {/* Save FAB */}
      <div className="fixed bottom-[72px] inset-x-0 px-3 z-20">
        <button
          onClick={handleSave}
          disabled={!result}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold shadow-lg transition-all disabled:opacity-40 ${
            savedFlash ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-600 text-white shadow-emerald-200'
          }`}
        >
          {savedFlash ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {savedFlash ? 'נשמר!' : (isNew ? 'שמור לפרויקט' : 'שמור שינויים')}
        </button>
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200">
        <div className="flex items-center justify-around px-2 py-1">
          <TabBtn icon={Eye}           label="3D"      active={activeView === '3d'}      onClick={() => setActiveView('3d')} />
          <TabBtn icon={ClipboardList} label="חיתוך"  active={activeView === 'cutlist'} onClick={() => setActiveView('cutlist')} />
          <TabBtn icon={BarChart3}     label="סיכום"   active={activeView === 'summary'} onClick={() => setActiveView('summary')} />
          <div className="h-8 w-px bg-gray-200" />
          <TabBtn
            icon={SlidersHorizontal} label="הגדרות"
            active={configOpen}
            onClick={() => setConfigOpen(true)}
          />
        </div>
      </nav>

      {/* Config bottom sheet */}
      <BottomSheet open={configOpen} onClose={() => setConfigOpen(false)} title="הגדרות פרגולה">
        <PergolaConfigurator params={params} onChange={setParams} result={result} />
        <div className="mt-4 flex gap-2">
          <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => setConfigOpen(false)}>
            סגור והחל
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
