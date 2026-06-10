import { useMemo, useRef, useCallback } from 'react';
import { Download, Printer } from 'lucide-react';

/**
 * Pergola2DPlan — top-view (מבט-על) technical drawing, generated from the
 * same layout3D data the 3D viewer renders, so the two always match.
 *
 * Engine coords: x = length, z = width (wall at z=0 for wall-mounted).
 * Drawing coords: x → x, z → y (wall at the top of the sheet).
 */

const PX_PER_M = 80; // drawing scale before fit — viewBox handles final fit

function DimH({ x1, x2, y, label }) {
  return (
    <g className="dim">
      <line x1={x1} y1={y} x2={x2} y2={y} stroke="#DC2626" strokeWidth="1" />
      <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} stroke="#DC2626" strokeWidth="1" />
      <line x1={x2} y1={y - 4} x2={x2} y2={y + 4} stroke="#DC2626" strokeWidth="1" />
      <text x={(x1 + x2) / 2} y={y - 5} textAnchor="middle" fontSize="11" fill="#DC2626" fontWeight="600">
        {label}
      </text>
    </g>
  );
}

function DimV({ y1, y2, x, label }) {
  return (
    <g className="dim">
      <line x1={x} y1={y1} x2={x} y2={y2} stroke="#DC2626" strokeWidth="1" />
      <line x1={x - 4} y1={y1} x2={x + 4} y2={y1} stroke="#DC2626" strokeWidth="1" />
      <line x1={x - 4} y1={y2} x2={x + 4} y2={y2} stroke="#DC2626" strokeWidth="1" />
      <text
        x={x + 5} y={(y1 + y2) / 2} fontSize="11" fill="#DC2626" fontWeight="600"
        textAnchor="start" dominantBaseline="middle"
      >
        {label}
      </text>
    </g>
  );
}

export default function Pergola2DPlan({ result, name }) {
  const svgRef = useRef(null);

  const drawing = useMemo(() => {
    if (!result?.layout3D) return null;
    const { layout3D, profiles, structure, input } = result;
    const L = input.length, W = input.width;
    const over = structure.overhangM;

    const m = (v) => v * PX_PER_M; // metres → px
    // Sheet margins: room for dimensions on bottom/right, wall on top
    const pad = 70;
    const minX = -over, maxX = L + over;
    const minZ = structure.isWall ? -0.3 : -over;
    const maxZ = W + (structure.isWall ? 0 : over);
    const vbW = m(maxX - minX) + pad * 2;
    const vbH = m(maxZ - minZ) + pad * 2;
    const X = (x) => pad + m(x - minX);
    const Y = (z) => pad + m(z - minZ);

    const colW = (profiles.column?.w ?? 10) / 100;
    const mbW  = (profiles.mainBeam?.w ?? 5) / 100;
    const sbW  = (profiles.secBeam?.w ?? 4) / 100;
    const rfW  = (profiles.rafter?.w ?? 3) / 100;

    return { layout3D, structure, input, L, W, over, m, X, Y, vbW, vbH, colW, mbW, sbW, rfW };
  }, [result]);

  const handleExportSVG = useCallback(() => {
    if (!svgRef.current) return;
    const src = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + src], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${name || 'pergola'}-plan.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [name]);

  const handlePrint = useCallback(() => {
    if (!svgRef.current) return;
    const src = new XMLSerializer().serializeToString(svgRef.current);
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><title>תוכנית פרגולה</title>
      <style>body{margin:0;display:flex;justify-content:center}svg{max-width:100%;height:auto}</style>
      </head><body>${src}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }, []);

  if (!drawing) {
    return <div className="p-8 text-center text-sm text-gray-400">אין נתונים להצגה</div>;
  }

  const { layout3D, structure, input, L, W, over, m, X, Y, vbW, vbH, colW, mbW, sbW, rfW } = drawing;
  const today = new Date().toLocaleDateString('he-IL');

  return (
    <div className="space-y-3" dir="rtl">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800">תוכנית עבודה — מבט-על</h3>
        <div className="flex gap-1.5">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> הדפסה
          </button>
          <button
            onClick={handleExportSVG}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> SVG
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${vbW} ${vbH + 70}`}
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
          style={{ background: '#fff', maxHeight: '70vh' }}
        >
          <defs>
            <pattern id="wallHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="8" height="8" fill="#F3F4F6" />
              <line x1="0" y1="0" x2="0" y2="8" stroke="#9CA3AF" strokeWidth="1.5" />
            </pattern>
          </defs>

          {/* Wall (wall-mounted) */}
          {structure.isWall && (
            <g>
              <rect x={X(-over) - 10} y={Y(-0.3)} width={m(L + over * 2) + 20} height={m(0.3)} fill="url(#wallHatch)" stroke="#6B7280" strokeWidth="1.5" />
              <text x={X(L / 2)} y={Y(-0.3) - 5} textAnchor="middle" fontSize="11" fill="#6B7280">קיר קיים</text>
            </g>
          )}

          {/* Floor footprint */}
          <rect x={X(0)} y={Y(0)} width={m(L)} height={m(W)} fill="#FAFAF9" stroke="#D6D3D1" strokeWidth="1" strokeDasharray="6 4" />

          {/* Rafters (thin, drawn first = lowest layer on sheet) */}
          {layout3D.rafters.map((r, i) => (
            <rect
              key={`rf-${i}`}
              x={X(r.x)} y={Y(r.z - rfW / 2)}
              width={m(r.length)} height={Math.max(2, m(rfW))}
              fill="#E7E5E4" stroke="#A8A29E" strokeWidth="0.75"
            />
          ))}

          {/* Secondary beams */}
          {layout3D.secBeams.map((b, i) => (
            <rect
              key={`sb-${i}`}
              x={X(b.x - sbW / 2)} y={Y(b.z)}
              width={Math.max(3, m(sbW))} height={m(b.length)}
              fill="#A8A29E" stroke="#78716C" strokeWidth="0.75"
            />
          ))}

          {/* Main beams + ledger */}
          {layout3D.mainBeams.map((b, i) => (
            <rect
              key={`mb-${i}`}
              x={X(b.x)} y={Y(b.z - mbW / 2)}
              width={m(b.length)} height={Math.max(4, m(mbW))}
              fill={b.isLedger ? '#6B7280' : '#57534E'} stroke="#292524" strokeWidth="1"
            />
          ))}

          {/* Columns */}
          {layout3D.columns.map((c, i) => (
            <g key={`col-${i}`}>
              <rect
                x={X(c.x - colW / 2)} y={Y(c.z - colW / 2)}
                width={m(colW)} height={m(colW)}
                fill="#1C1917" stroke="#000" strokeWidth="1"
              />
              <text x={X(c.x)} y={Y(c.z - colW / 2) - 4} textAnchor="middle" fontSize="10" fill="#1C1917" fontWeight="700">
                {`ע${i + 1}`}
              </text>
            </g>
          ))}

          {/* Dimensions */}
          <DimH x1={X(0)} x2={X(L)} y={Y(W) + (structure.isWall ? 0 : m(over)) + 30} label={`${L.toFixed(2)} מ'`} />
          <DimV y1={Y(0)} y2={Y(W)} x={X(L) + (structure.isWall ? m(over) : m(over)) + 30} label={`${W.toFixed(2)} מ'`} />
          {structure.columnSpacingLength > 0 && layout3D.columns.length >= 2 && (
            <DimH
              x1={X(layout3D.columns[0].x)} x2={X(layout3D.columns[1].x)}
              y={Y(layout3D.columns[0].z) + 26}
              label={`${structure.columnSpacingLength} מ'`}
            />
          )}
          {structure.rafterSpacing > 0 && (
            <text x={X(L / 2)} y={Y(W / 2)} textAnchor="middle" fontSize="11" fill="#78716C">
              {`שלבים כל ${(structure.rafterSpacing * 100).toFixed(0)} ס"מ`}
            </text>
          )}

          {/* Title block */}
          <g transform={`translate(${vbW / 2}, ${vbH + 8})`}>
            <rect x={-vbW / 2 + 10} y={0} width={vbW - 20} height={54} fill="#FAFAF9" stroke="#D6D3D1" strokeWidth="1" rx="4" />
            <text x={-vbW / 2 + 22} y={20} fontSize="13" fontWeight="700" fill="#1C1917" textAnchor="start">
              {name || 'פרגולה'} — תוכנית מבט-על
            </text>
            <text x={-vbW / 2 + 22} y={40} fontSize="10" fill="#57534E" textAnchor="start">
              {`${L}×${W}×${input.height} מ' | ${result.material.label} | ${result.roof.label} | עמודים: ${structure.totalColumns} | שלבים: ${structure.numRafters} | ${today} | PergoCalc`}
            </text>
          </g>
        </svg>
      </div>

      <p className="text-[10px] text-gray-400">
        השרטוט נגזר ישירות ממודל החישוב — תואם אחד-לאחד לתצוגת ה-3D ולרשימת החיתוך. לאישור סטטוטורי נדרש מהנדס.
      </p>
    </div>
  );
}
