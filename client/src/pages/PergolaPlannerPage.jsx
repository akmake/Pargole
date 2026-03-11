import { useState, useMemo, Suspense, useCallback, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hammer, Eye, ClipboardList, BarChart3, Download, RotateCcw,
  SlidersHorizontal, X, ChevronUp, Share2, Sparkles,
} from 'lucide-react';
import { MATERIALS, calculatePergola } from '@/utils/pergolaEngine';
import { calcTotalPrice, formatCurrency } from '@/utils/pergolaPrice';
import PergolaConfigurator from '@/components/pergola/PergolaConfigurator';
import CutList from '@/components/pergola/CutList';
import MaterialSummary from '@/components/pergola/MaterialSummary';
import PergolaViewer3D from '@/components/pergola/PergolaViewer3D';

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
  // v2 additions
  wallType: 'concrete',
  desiredShadePct: 0,
  slatWidthCM: 10,
  floorNumber: 0,
  craneType: 'none',
};

// ── Bottom Sheet ─────────────────────────────────────────────────────────
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
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-neutral-300" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3">
              <h2 className="text-base font-bold">{title}</h2>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-neutral-100">
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

// ── Tab Button ───────────────────────────────────────────────────────────
function TabBtn({ icon: Icon, label, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-medium transition-all relative ${
        active
          ? 'bg-white text-emerald-700 shadow-sm'
          : 'text-neutral-500 hover:text-neutral-700'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px]">{label}</span>
      {badge && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white text-[8px] flex items-center justify-center font-bold">
          {badge}
        </span>
      )}
    </button>
  );
}

// ── Stat Pill ────────────────────────────────────────────────────────────
function StatPill({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur rounded-full px-3 py-1.5 shadow-sm">
      {Icon && <Icon className="w-3 h-3 text-emerald-600" />}
      <span className="text-[10px] text-neutral-500">{label}</span>
      <span className="text-xs font-bold">{value}</span>
    </div>
  );
}

export default function PergolaPlannerPage() {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [activeView, setActiveView] = useState('3d');
  const [configOpen, setConfigOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  // ── CSV/Excel export (BOM) ────────────────────────────────────────
  const handleExportCSV = useCallback(() => {
    if (!result || !pricing) return;
    const rows = [
      ['סוג', 'פרופיל / תיאור', 'אורך (מ\')', 'כמות', 'סה"כ מ\'', 'משקל/יח\' kg', 'משקל כולל kg', 'מחיר/יח\' ₪', 'עלות כוללת ₪'],
      ...result.cutList.map(r => [r.part, r.profile, r.lengthM, r.qty, r.totalM, r.weightPerUnit, r.totalWeight, r.pricePerUnit, r.totalPrice]),
      [],
      ['חומרי חיבור', 'תיאור', '', 'כמות', '', '', '', 'מחיר/יח\'', 'עלות כוללת'],
      ...Object.values(result.hardware).filter(h => h.qty > 0).map(h => ['', h.label, '', h.qty, '', '', '', h.priceEach, h.qty * h.priceEach]),
      [],
      ['תמחור', '', '', '', '', '', '', '', ''],
      ...pricing.breakdown.map(r => ['', r.label, '', '', '', '', '', '', r.cost]),
      ['', `עבודה (${pricing.laborHours} שע')`, '', '', '', '', '', '', pricing.laborCost],
      ['', 'סה"כ חומרים+עבודה', '', '', '', '', '', '', pricing.baseCost],
      ['', '× 1.15 בלת"מ', '', '', '', '', '', '', pricing.withBltAm],
      ['', '× 1.30 רווח קבלני', '', '', '', '', '', '', pricing.contractorNet],
      ...(pricing.floorSurcharge > 0 ? [['', 'סבלות', '', '', '', '', '', '', pricing.floorSurcharge]] : []),
      ...(pricing.craneCost > 0 ? [['', 'מנוף', '', '', '', '', '', '', pricing.craneCost]] : []),
      ['', 'מחיר סופי ללקוח', '', '', '', '', '', '', pricing.total],
    ];
    const csv = '\uFEFF' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pergola-bom-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [result, pricing]);

  // ── PDF export (cut list + layout) ───────────────────────────────
  const handleExportPDF = useCallback(async () => {
    if (!result || !pricing) return;
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const ltr = (s) => String(s ?? ''); // jsPDF has limited RTL — use LTR layout

      let y = 15;
      const line = (text, x = 15, size = 10, bold = false) => {
        doc.setFontSize(size);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.text(ltr(text), x, y);
        y += size * 0.5 + 2;
      };
      const hr = () => { doc.setDrawColor(200); doc.line(15, y, 195, y); y += 4; };

      // Header
      line('Pergola Design Report', 15, 16, true);
      line(`${result.input.length}m x ${result.input.width}m x ${result.input.height}m | ${result.material.label}`, 15, 11);
      line(`Roof: ${result.roof.label} | Install: ${result.input.installType}`, 15, 10);
      hr();

      // Structure summary
      line('Structure Summary', 15, 12, true); y += 1;
      line(`Columns: ${result.structure.totalColumns} (${result.structure.colsAlongLength} x ${result.structure.colRowsWidth}) | Spacing: ${result.structure.columnSpacingLength}m`);
      line(`Main Beams: ${result.structure.mainBeamCount} x ${result.structure.mainBeamLength}m`);
      line(`Secondary Beams: ${result.structure.numSecBeams} x ${result.structure.secBeamLength}m @ ${result.structure.secBeamSpacing}m`);
      line(`Rafters/Slats: ${result.structure.numRafters} x ${result.structure.rafterLength}m @ ${result.structure.rafterSpacing}m`);
      if (result.structure.slopePercent > 0) line(`Slope: ${result.structure.slopePercent}% (${result.structure.slopeAngleDeg}deg) | Rise: ${(result.structure.slopeHeightDiff * 100).toFixed(1)}cm`);
      if (result.bracing?.required) line(`Bracing: ${result.bracing.count} pieces x ${result.bracing.pieceLengthM}m (45deg)`);
      if (result.ledger) line(`Ledger: ${result.ledger.lengthM}m | Anchors: ${result.ledger.anchors} x ${result.ledger.anchorType}`);
      hr();

      // Cut list
      line('Cut List (10% waste factor included)', 15, 12, true); y += 1;
      const cols = [15, 65, 105, 125, 145, 175];
      doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      ['Part', 'Profile', 'Length(m)', 'Qty', 'Total(m)', 'Price'].forEach((h, i) => doc.text(h, cols[i], y));
      y += 5; doc.setFont('helvetica', 'normal');
      for (const r of result.cutList) {
        if (y > 260) { doc.addPage(); y = 15; }
        doc.setFontSize(8);
        [r.part, r.profile, String(r.lengthM), String(r.qty), String(r.totalM), `NIS ${r.totalPrice}`]
          .forEach((v, i) => doc.text(ltr(v), cols[i], y));
        y += 4.5;
      }
      hr();

      // Hardware BOM
      if (y > 230) { doc.addPage(); y = 15; }
      line('Hardware BOM', 15, 12, true); y += 1;
      for (const h of Object.values(result.hardware).filter(h => h.qty > 0)) {
        if (y > 265) { doc.addPage(); y = 15; }
        doc.setFontSize(8);
        doc.text(ltr(h.label), 15, y);
        doc.text(`x${h.qty}`, 130, y);
        doc.text(`NIS ${(h.qty * h.priceEach).toFixed(0)}`, 175, y);
        y += 4.5;
      }
      hr();

      // Pricing
      if (y > 220) { doc.addPage(); y = 15; }
      line('Pricing (Formula: (Mat+Labor) x 1.15 x 1.30)', 15, 12, true); y += 1;
      line(`Materials total: NIS ${pricing.totalMaterialCost.toFixed(0)}`);
      line(`Labor (${pricing.laborHours}h x 250): NIS ${pricing.laborCost.toFixed(0)}`);
      line(`x 1.15 contingency: NIS ${pricing.withBltAm.toFixed(0)}`);
      line(`x 1.30 profit: NIS ${pricing.contractorNet.toFixed(0)}`);
      if (pricing.floorSurcharge > 0) line(`Floor surcharge: NIS ${pricing.floorSurcharge}`);
      if (pricing.craneCost > 0) line(`Crane: NIS ${pricing.craneCost}`);
      y += 2;
      doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL PRICE: NIS ${pricing.total.toFixed(0)}`, 15, y);
      y += 8;

      // Warnings
      if (result.warnings?.length) {
        if (y > 230) { doc.addPage(); y = 15; }
        line('Warnings & Notes', 15, 12, true); y += 1;
        for (const w of result.warnings) {
          doc.setFontSize(8); doc.setFont('helvetica', 'normal');
          const wrapped = doc.splitTextToSize(ltr(w), 175);
          doc.text(wrapped, 15, y);
          y += wrapped.length * 4.5;
        }
      }

      doc.save(`pergola-report-${Date.now()}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  }, [result, pricing]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'הפרגולה שלי',
          text: `פרגולה ${params.length}×${params.width}m — ${pricing ? formatCurrency(pricing.total) : ''}`,
          url: window.location.href,
        });
      } catch (_) { /* cancelled */ }
    }
  }, [params, pricing]);

  // Desktop layout
  if (!isMobile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-stone-100" dir="rtl">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-neutral-200/60">
          <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Hammer className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-neutral-900 leading-tight">מתכנן פרגולות</h1>
                <p className="text-[11px] text-neutral-400">תכנון · הנדסה · תמחור · 3D</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pricing && (
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg shadow-emerald-200">
                  {formatCurrency(pricing.total)}
                </div>
              )}
              <Button variant="ghost" size="sm" className="text-neutral-500" onClick={handleReset}>
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-neutral-500" onClick={handleExportCSV} title="ייצוא BOM ל-CSV">
                <Download className="w-4 h-4" />
                <span className="text-[10px] mr-1">CSV</span>
              </Button>
              <Button variant="ghost" size="sm" className="text-neutral-500" onClick={handleExportPDF} title="ייצוא PDF">
                <Download className="w-4 h-4" />
                <span className="text-[10px] mr-1">PDF</span>
              </Button>
            </div>
          </div>
        </header>

        <div className="max-w-[1600px] mx-auto px-6 py-5 grid grid-cols-12 gap-5">
          {/* Sidebar */}
          <div className="col-span-3 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200/60 p-4 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin">
              <PergolaConfigurator params={params} onChange={setParams} result={result} />
            </div>
          </div>

          {/* Main area */}
          <div className="col-span-9 space-y-4">
            {/* View switcher */}
            <div className="flex items-center gap-2 bg-neutral-100/80 rounded-2xl p-1.5">
              {[
                { id: '3d', label: 'תצוגה 3D', icon: Eye },
                { id: 'cutlist', label: 'רשימת חיתוך', icon: ClipboardList },
                { id: 'summary', label: 'סיכום ותמחור', icon: BarChart3 },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveView(t.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeView === t.id ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>

            {activeView === '3d' && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl shadow-sm border border-neutral-200/60 overflow-hidden">
                  <Suspense fallback={
                    <div className="w-full h-[600px] animate-pulse bg-neutral-100 flex items-center justify-center text-neutral-400">
                      <Sparkles className="w-6 h-6 animate-spin" />
                    </div>
                  }>
                    <PergolaViewer3D result={result} />
                  </Suspense>
                </div>
                {result && (
                  <div className="flex flex-wrap gap-2">
                    <StatPill label="עמודים" value={result.structure.totalColumns} />
                    <StatPill label="שלבי גג" value={result.structure.numRafters} />
                    <StatPill label='שטח' value={`${result.coverage.area} מ"ר`} />
                    <StatPill label="צל" value={`${result.coverage.shadePercent}%`} />
                    <StatPill label="משקל" value={`${result.loads.totalWeight} kg`} />
                    <StatPill label='מ"ר מוצלים' value={result.coverage.shadedArea} />
                  </div>
                )}
              </div>
            )}

            {activeView === 'cutlist' && (
              <div className="bg-white rounded-2xl shadow-sm border border-neutral-200/60 p-5">
                <CutList result={result} />
              </div>
            )}

            {activeView === 'summary' && (
              <div className="bg-white rounded-2xl shadow-sm border border-neutral-200/60 p-5">
                <MaterialSummary result={result} pricingParams={pricingParams} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MOBILE LAYOUT
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-neutral-50 pb-24" dir="rtl">
      {/* Mobile Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-neutral-100">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Hammer className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold">מתכנן פרגולות</span>
          </div>
          <div className="flex items-center gap-1.5">
            {pricing && (
              <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                {formatCurrency(pricing.total)}
              </span>
            )}
            <button onClick={handleShare} className="p-2 rounded-full hover:bg-neutral-100">
              <Share2 className="w-4 h-4 text-neutral-500" />
            </button>
            <button onClick={handleExportCSV} className="p-2 rounded-full hover:bg-neutral-100" title="CSV">
              <Download className="w-4 h-4 text-neutral-500" />
            </button>
            <button onClick={handleExportPDF} className="p-2 rounded-full hover:bg-neutral-100" title="PDF">
              <Download className="w-4 h-4 text-emerald-600" />
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
                <div className="w-full h-[50vh] animate-pulse bg-neutral-100 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-neutral-300 animate-spin" />
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
                  { l: 'שטח', v: `${result.coverage.area}m²` },
                ].map((s, i) => (
                  <div key={i} className="bg-white rounded-xl p-2.5 text-center shadow-sm">
                    <p className="text-[10px] text-neutral-400">{s.l}</p>
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

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/90 backdrop-blur-xl border-t border-neutral-200/60 safe-area-pb">
        <div className="flex items-center justify-around px-2 py-1">
          <TabBtn icon={Eye} label="3D" active={activeView === '3d'} onClick={() => setActiveView('3d')} />
          <TabBtn icon={ClipboardList} label="חיתוך" active={activeView === 'cutlist'} onClick={() => setActiveView('cutlist')} />
          <TabBtn icon={BarChart3} label="סיכום" active={activeView === 'summary'} onClick={() => setActiveView('summary')} />
          <div className="h-8 w-px bg-neutral-200" />
          <TabBtn
            icon={SlidersHorizontal} label="הגדרות"
            active={configOpen}
            onClick={() => setConfigOpen(true)}
            badge={params.material !== 'pine' ? '!' : null}
          />
        </div>
      </nav>

      {/* Config Bottom Sheet */}
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
