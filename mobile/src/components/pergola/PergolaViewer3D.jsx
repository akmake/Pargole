import { useMemo, useState, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import {
  OrbitControls, Text, Grid, ContactShadows,
  PerspectiveCamera, Sky, AdaptiveDpr,
} from '@react-three/drei';
import * as THREE from 'three';

// ─── Colour helper ───────────────────────────────────────────────────────────
function resolveColor(material, finishData) {
  if (finishData?.hex && finishData.hex !== '#C49A3C') return finishData.hex;
  return material?.color ?? '#8B6914';
}

// ─── Shared material hook ────────────────────────────────────────────────────
function useMat(color, category) {
  return useMemo(() => {
    if (category === 'aluminum' || category === 'steel') {
      return new THREE.MeshStandardMaterial({ color, roughness: 0.22, metalness: 0.9, envMapIntensity: 0.8 });
    }
    return new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.01 });
  }, [color, category]);
}

// ─── Box beam (no rounding — avoids RoundedBox issues) ───────────────────────
function Beam({ x, y, z, length, dir = 'x', sw, sh, color, category }) {
  const mat  = useMat(color, category);
  const w    = sw ?? 0.10;  // cross-section width (m)
  const h    = sh ?? 0.10;  // cross-section height (m)
  const geo  = useMemo(
    () => dir === 'x'
      ? new THREE.BoxGeometry(length, h, w)
      : new THREE.BoxGeometry(w, h, length),
    [length, dir, w, h]
  );
  const pos = dir === 'x'
    ? [x + length / 2, y + h / 2, z]
    : [x,              y + h / 2, z + length / 2];

  return (
    <mesh position={pos} geometry={geo} material={mat} castShadow receiveShadow />
  );
}

// ─── Column ──────────────────────────────────────────────────────────────────
function Column({ x, y, z, height, sw, sh, color, category }) {
  const mat = useMat(color, category);
  const w   = sw ?? 0.10;
  const h   = sh ?? 0.10;
  return (
    <group>
      <mesh position={[x, height / 2 + y, z]} castShadow receiveShadow material={mat}>
        <boxGeometry args={[w, height, h]} />
      </mesh>
      {/* base plate */}
      <mesh position={[x, 0.01, z]} receiveShadow>
        <boxGeometry args={[w * 1.9, 0.02, h * 1.9]} />
        <meshStandardMaterial color="#555" roughness={0.5} metalness={0.85} />
      </mesh>
    </group>
  );
}

// ─── Roof plane (solid types) ─────────────────────────────────────────────────
function RoofPlane({ x, z, rWidth, rLength, yNear, yFar, roofType }) {
  const mat = useMemo(() => {
    const common = { side: THREE.DoubleSide, transparent: true };
    if (roofType === 'polycarbonate')       return new THREE.MeshPhysicalMaterial({ ...common, color: '#DCEFFA', opacity: 0.35, roughness: 0.05, transmission: 0.55 });
    if (roofType === 'polycarbonateOpaque') return new THREE.MeshStandardMaterial({ ...common, color: '#C0CDD8', opacity: 0.85, roughness: 0.25 });
    if (roofType === 'santaf')              return new THREE.MeshStandardMaterial({ ...common, color: '#B0C4CE', opacity: 0.90, roughness: 0.45 });
    if (roofType === 'sandwich')            return new THREE.MeshStandardMaterial({ color: '#D4E2E8', roughness: 0.6 });
    if (roofType === 'fabricRetractable')   return new THREE.MeshStandardMaterial({ ...common, color: '#F2E0C0', opacity: 0.70, roughness: 0.85 });
    return new THREE.MeshStandardMaterial({ color: '#A0B0B8', roughness: 0.5 });
  }, [roofType]);

  // Build a tilted quad from 4 corners
  const slopeAngle = Math.atan2(yNear - yFar, rWidth); // rotation around X
  const yMid  = (yNear + yFar) / 2;
  const zMid  = z + rWidth / 2;
  const thick = roofType === 'sandwich' ? 0.06 : 0.008;

  return (
    <mesh
      position={[x + rLength / 2, yMid, zMid]}
      rotation={[slopeAngle, 0, 0]}
      castShadow receiveShadow material={mat}
    >
      <boxGeometry args={[rLength, thick, rWidth / Math.cos(slopeAngle)]} />
    </mesh>
  );
}

// ─── Louver slat ─────────────────────────────────────────────────────────────
function LouverSlat({ x, y, z, length, openPct = 0.5, color, category }) {
  const mat  = useMat(color, category);
  const tilt = openPct * Math.PI * 0.45; // max ~80° open
  return (
    <mesh
      position={[x + length / 2, y + 0.08, z]}
      rotation={[tilt, 0, 0]}
      castShadow material={mat}
    >
      <boxGeometry args={[length, 0.004, 0.16]} />
    </mesh>
  );
}

// ─── Bracing diagonals ───────────────────────────────────────────────────────
// Knee braces: lower end on the column face, upper end on the beam underside.
// X braces stay inside the beam extents; the Z brace rises to a secondary
// beam and is drawn only when one actually passes over this column.
function BracingPair({ col, height, ySecB, beamMinX, beamMaxX, secXs, width, sw, color, category }) {
  const mat  = useMat(color, category);
  const leg  = 0.40;
  const len  = Math.sqrt(leg * leg + leg * leg);
  const ang  = Math.PI / 4;
  const w    = sw ?? 0.08;

  const xDirs = [];
  if (col.x + leg <= beamMaxX + 1e-6) xDirs.push(1);
  if (col.x - leg >= beamMinX - 1e-6) xDirs.push(-1);

  const hasSecAbove = secXs.some((x) => Math.abs(x - col.x) < 0.05);
  const zDir = col.z < width / 2 ? 1 : -1;

  return (
    <group>
      {xDirs.map((d) => (
        <mesh
          key={`x${d}`}
          position={[col.x + d * leg / 2, height - leg / 2, col.z]}
          rotation={[0, 0, ang * d]}
          material={mat}
          castShadow
        >
          <boxGeometry args={[len, w, w]} />
        </mesh>
      ))}
      {hasSecAbove && (
        <mesh
          position={[col.x, ySecB - leg / 2, col.z + zDir * leg / 2]}
          rotation={[-ang * zDir, 0, 0]}
          material={mat}
          castShadow
        >
          <boxGeometry args={[w, w, len]} />
        </mesh>
      )}
    </group>
  );
}

// ─── Side covering panel (glass / screen / lattice) ──────────────────────────
const SIDE_STYLES = {
  fixedGlass:       { color: '#BFE3F2', opacity: 0.22, metalness: 0.1, roughness: 0.05 },
  slidingGlass:     { color: '#BFE3F2', opacity: 0.25, metalness: 0.1, roughness: 0.05 },
  perforatedScreen: { color: '#6B7280', opacity: 0.55, metalness: 0.3, roughness: 0.6 },
  woodScreen:       { color: '#9A7245', opacity: 0.90, metalness: 0.0, roughness: 0.8 },
  fabricRollDown:   { color: '#E8DCC4', opacity: 0.85, metalness: 0.0, roughness: 0.9 },
  lattice:          { color: '#8B6914', opacity: 0.45, metalness: 0.0, roughness: 0.8 },
};

function SidePanel({ side, type, length, width, height }) {
  const style = SIDE_STYLES[type];
  const mat = useMemo(() => style && new THREE.MeshPhysicalMaterial({
    color: style.color, transparent: true, opacity: style.opacity,
    metalness: style.metalness, roughness: style.roughness, side: THREE.DoubleSide,
  }), [style]);
  if (!style) return null;

  const t = 0.02, h = height - 0.05;
  // side planes sit just inside the column lines
  const cfg = {
    back:  { pos: [length / 2, h / 2, t],          size: [length - 0.1, h, t] },
    front: { pos: [length / 2, h / 2, width - t],  size: [length - 0.1, h, t] },
    left:  { pos: [t, h / 2, width / 2],           size: [t, h, width - 0.1] },
    right: { pos: [length - t, h / 2, width / 2],  size: [t, h, width - 0.1] },
  }[side];
  if (!cfg) return null;

  return (
    <mesh position={cfg.pos} material={mat} castShadow>
      <boxGeometry args={cfg.size} />
    </mesh>
  );
}

// ─── Gutter (drainage channel along the low edge) ────────────────────────────
function Gutter({ x, z, length, y }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7A7A7A', metalness: 0.7, roughness: 0.35 }), []);
  return (
    <group>
      <mesh position={[x + length / 2, y, z + 0.07]} material={mat} castShadow>
        <boxGeometry args={[length, 0.09, 0.11]} />
      </mesh>
      {/* downspout at the far corner */}
      <mesh position={[x + length - 0.06, y / 2, z + 0.07]} material={mat}>
        <cylinderGeometry args={[0.035, 0.035, y, 10]} />
      </mesh>
    </group>
  );
}

// ─── Lighting fixtures ───────────────────────────────────────────────────────
function LightFixtures({ type, length, width, yMain }) {
  const bulbMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#FFF3C4', emissive: '#FFD966', emissiveIntensity: 1.6,
  }), []);
  const cordMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#222' }), []);
  const stripMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#FFF8E1', emissive: '#FFE082', emissiveIntensity: 2.2,
  }), []);

  if (!type || type === 'none') return null;

  if (type === 'ledStrip') {
    return (
      <group>
        {[0.08, width - 0.08].map((z, i) => (
          <mesh key={i} position={[length / 2, yMain - 0.015, z]} material={stripMat}>
            <boxGeometry args={[length - 0.2, 0.012, 0.03]} />
          </mesh>
        ))}
      </group>
    );
  }

  if (type === 'spotlights') {
    const n = Math.max(2, Math.round(length / 1.2));
    return (
      <group>
        {Array.from({ length: n }, (_, i) => {
          const x = ((i + 0.5) / n) * length;
          return [0.3, width - 0.3].map((z, j) => (
            <mesh key={`${i}-${j}`} position={[x, yMain - 0.03, z]} material={bulbMat}>
              <cylinderGeometry args={[0.045, 0.055, 0.05, 12]} />
            </mesh>
          ));
        })}
      </group>
    );
  }

  if (type === 'pendants') {
    const n = Math.max(2, Math.round(length / 1.6));
    return (
      <group>
        {Array.from({ length: n }, (_, i) => {
          const x = ((i + 0.5) / n) * length;
          return (
            <group key={i} position={[x, 0, width / 2]}>
              <mesh position={[0, yMain - 0.2, 0]} material={cordMat}>
                <cylinderGeometry args={[0.006, 0.006, 0.4, 6]} />
              </mesh>
              <mesh position={[0, yMain - 0.42, 0]} material={bulbMat}>
                <sphereGeometry args={[0.07, 14, 14]} />
              </mesh>
            </group>
          );
        })}
      </group>
    );
  }

  if (type === 'stringLights') {
    const n = Math.max(6, Math.round(length / 0.45));
    return (
      <group>
        {Array.from({ length: n }, (_, i) => {
          const t = (i + 0.5) / n;
          const sag = Math.sin(t * Math.PI * 3) * 0.06 + 0.12;
          return (
            <mesh key={i} position={[t * length, yMain - sag, width / 2]} material={bulbMat}>
              <sphereGeometry args={[0.028, 10, 10]} />
            </mesh>
          );
        })}
      </group>
    );
  }

  return null;
}

// ─── Wall ────────────────────────────────────────────────────────────────────
function Wall({ w }) {
  if (!w) return null;
  return (
    <mesh position={[w.width / 2, w.height / 2, -0.13]} receiveShadow>
      <boxGeometry args={[w.width + 0.5, w.height, 0.26]} />
      <meshStandardMaterial color="#E8E0D4" roughness={0.92} />
    </mesh>
  );
}

// ─── Ground ──────────────────────────────────────────────────────────────────
function Ground({ length, width }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[length / 2, -0.005, width / 2]} receiveShadow>
        <planeGeometry args={[length + 2, width + 2]} />
        <meshStandardMaterial color="#C9B896" roughness={0.92} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[length / 2, -0.015, width / 2]} receiveShadow>
        <planeGeometry args={[length + 10, width + 10]} />
        <meshStandardMaterial color="#6B9E3D" roughness={1} />
      </mesh>
    </group>
  );
}

// ─── Dimension arrows ────────────────────────────────────────────────────────
function DimLine({ from, to, label }) {
  const pts = useMemo(() => new Float32Array([...from, ...to]), [from, to]);
  const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + 0.07, (from[2] + to[2]) / 2];
  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={2} array={pts} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color="#EF4444" />
      </line>
      <Text position={mid} fontSize={0.12} color="#CC0000" anchorX="center" anchorY="bottom" outlineWidth={0.006} outlineColor="#fff">
        {label}
      </Text>
    </group>
  );
}

// ─── Camera rig: resets camera position whenever pergola dims change ──────────
function CameraRig({ cx, cy, cz, camDist, mobile, controlsRef }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(cx + camDist * 0.85, camDist * 0.65, cz + camDist * 1.1);
    camera.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.set(cx, cy, cz);
      controlsRef.current.update();
    }
  }, [cx, cy, cz, camDist]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// ─── Main Scene ──────────────────────────────────────────────────────────────
function PergolaScene({ result, showDims, showGrid, louverOpen }) {
  const { layout3D, profiles, material, finishData, input, structure, roof, bracing } = result;
  const color    = resolveColor(material, finishData);
  const cat      = material.category;
  const { length, width, height } = input;

  // Profile cross-sections in metres
  const colW  = (profiles.column?.w  ?? 10) / 100;
  const colH  = (profiles.column?.h  ?? 10) / 100;
  const mbW   = (profiles.mainBeam?.w ?? 5)  / 100;
  const mbH   = (profiles.mainBeam?.h ?? 15) / 100;
  const sbW   = (profiles.secBeam?.w  ?? 4)  / 100;
  const sbH   = (profiles.secBeam?.h  ?? 10) / 100;
  const rfW   = (profiles.rafter?.w   ?? 3)  / 100;
  const rfH   = (profiles.rafter?.h   ?? 8)  / 100;

  // Y levels (stacked correctly)
  const yMain  = height;               // top of column = beam bottom face
  const ySecB  = yMain  + mbH;         // secondary beams sit on top of main beams
  const yRaft  = ySecB  + sbH;         // rafters sit on top of secondary beams

  // Roof geometry extents
  const roofX  = -structure.overhangM;
  const roofZ  = structure.isWall ? 0 : -structure.overhangM;
  const roofLen = length + structure.overhangM * (structure.isWall || structure.isCorner ? 1 : 2);
  const roofWid = width  + structure.overhangM * (structure.isWall || structure.isCorner ? 1 : 2);
  const slopeRise = structure.slopeHeightDiff ?? 0;

  // Y near (wall side) and Y far (outer side) for slope
  const yRoofNear = yRaft + rfH + slopeRise;
  const yRoofFar  = yRaft + rfH;

  const hasSolidRoof = ['polycarbonate','polycarbonateOpaque','santaf','sandwich','fabricRetractable'].includes(input.roofType);
  const isLouvers    = input.roofType === 'louvers';
  const hasSlats     = ['openSlats','denseSlats'].includes(input.roofType);

  return (
    <>
      {/* ── Lighting ─────────────────────────────────────────────── */}
      <ambientLight intensity={0.45} />
      <directionalLight
        castShadow position={[12, 18, 10]} intensity={1.6}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-16} shadow-camera-right={16}
        shadow-camera-top={16}  shadow-camera-bottom={-16}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[-6, 10, -5]} intensity={0.28} />
      <hemisphereLight args={['#87CEEB', '#7CB342', 0.32]} />
      <Sky sunPosition={[50, 30, 20]} turbidity={3} rayleigh={0.5} />

      {/* ── Ground ───────────────────────────────────────────────── */}
      <Ground length={length} width={width} />
      {showGrid && (
        <Grid
          position={[length / 2, 0.001, width / 2]}
          args={[24, 24]} cellSize={0.5} cellColor="#CCC"
          sectionSize={1} sectionColor="#999" fadeDistance={18}
        />
      )}
      <ContactShadows position={[length / 2, 0.002, width / 2]} opacity={0.45} scale={20} blur={2} far={8} />

      {/* ── Wall ─────────────────────────────────────────────────── */}
      <Wall w={layout3D.wall} />

      {/* ── Columns ──────────────────────────────────────────────── */}
      {layout3D.columns.map((col, i) => (
        <Column key={`col-${i}`}
          x={col.x} y={0} z={col.z}
          height={col.height}
          sw={colW} sh={colH}
          color={color} category={cat}
        />
      ))}

      {/* ── Main Beams ───────────────────────────────────────────── */}
      {layout3D.mainBeams.map((b, i) => (
        <Beam key={`mb-${i}`}
          x={b.x} y={yMain} z={b.z}
          length={b.length} dir={b.direction ?? 'x'}
          sw={mbW} sh={mbH}
          color={b.isLedger ? '#8E8E8E' : color}
          category={b.isLedger ? 'steel' : cat}
        />
      ))}

      {/* ── Secondary Beams ──────────────────────────────────────── */}
      {layout3D.secBeams.map((b, i) => (
        <Beam key={`sb-${i}`}
          x={b.x} y={ySecB} z={b.z}
          length={b.length} dir={b.direction ?? 'z'}
          sw={sbW} sh={sbH}
          color={color} category={cat}
        />
      ))}

      {/* ── Rafters / Slats ──────────────────────────────────────── */}
      {hasSlats && layout3D.rafters.map((r, i) => (
        <Beam key={`rf-${i}`}
          x={r.x} y={yRaft} z={r.z}
          length={r.length} dir="x"
          sw={rfW} sh={rfH}
          color={color} category={cat}
        />
      ))}

      {/* ── Louver Slats ─────────────────────────────────────────── */}
      {isLouvers && layout3D.rafters.map((r, i) => (
        <LouverSlat key={`lv-${i}`}
          x={r.x} y={yRaft} z={r.z}
          length={r.length}
          openPct={louverOpen}
          color={color} category={cat}
        />
      ))}

      {/* ── Solid Roof Panel ─────────────────────────────────────── */}
      {hasSolidRoof && (
        <RoofPlane
          x={roofX} z={roofZ}
          rWidth={roofWid} rLength={roofLen}
          yNear={yRoofNear} yFar={yRoofFar}
          roofType={input.roofType}
        />
      )}

      {/* ── Side coverings ───────────────────────────────────────── */}
      {input.sides && Object.entries(input.sides).map(([side, type]) =>
        type && type !== 'none' ? (
          <SidePanel key={`side-${side}`} side={side} type={type} length={length} width={width} height={height} />
        ) : null
      )}

      {/* ── Gutter ───────────────────────────────────────────────── */}
      {input.gutterType && input.gutterType !== 'none' && (
        <Gutter x={roofX} z={width} length={roofLen} y={yMain} />
      )}

      {/* ── Lighting fixtures ────────────────────────────────────── */}
      <LightFixtures type={input.lightingOption} length={length} width={width} yMain={yMain} />

      {/* ── Bracing ──────────────────────────────────────────────── */}
      {bracing?.required && layout3D.columns.map((col, i) => (
        <BracingPair key={`br-${i}`}
          col={col} height={height} ySecB={ySecB}
          beamMinX={-structure.overhangM} beamMaxX={length + structure.overhangM}
          secXs={layout3D.secBeams.map((b) => b.x)} width={width}
          sw={colW * 0.8} color={color} category={cat}
        />
      ))}

      {/* ── Dimension Labels ─────────────────────────────────────── */}
      {showDims && (
        <>
          <DimLine
            from={[0, 0.05, width + 0.7]}
            to={[length, 0.05, width + 0.7]}
            label={`${length.toFixed(1)} מ'`}
          />
          <DimLine
            from={[length + 0.7, 0.05, 0]}
            to={[length + 0.7, 0.05, width]}
            label={`${width.toFixed(1)} מ'`}
          />
          <DimLine
            from={[-0.7, 0, 0]}
            to={[-0.7, height, 0]}
            label={`${height.toFixed(1)} מ'`}
          />
        </>
      )}
    </>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────
export default function PergolaViewer3D({ result, mobile }) {
  const [showDims,   setShowDims]   = useState(true);
  const [showGrid,   setShowGrid]   = useState(false);
  const [louverOpen, setLouverOpen] = useState(0.5);
  const controlsRef = useRef();

  const { length = 4, width = 3, height = 2.7 } = result?.input ?? {};

  // Adaptive camera: stand off at ~1.4× max dimension, looking at structure centre
  const maxDim  = Math.max(length, width, height);
  const camDist = maxDim * 1.55;
  const cx = length / 2;
  const cz = width  / 2;
  const cy = height * 0.45;

  const h = mobile ? 'h-[52vh]' : 'h-[600px]';

  if (!result) {
    return (
      <div className={`w-full ${h} bg-gradient-to-b from-sky-50 to-neutral-100 flex items-center justify-center text-neutral-400 text-sm`}>
        הגדר פרמטרים כדי לראות תצוגה תלת-ממדית
      </div>
    );
  }

  const isLouvers = result.input?.roofType === 'louvers';

  return (
    <div className={`relative w-full ${h} bg-gradient-to-b from-sky-200/60 to-sky-50`}>
      {/* ── Overlay controls ─────────────────────────────── */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
        <button
          onClick={() => setShowDims(d => !d)}
          className={`text-[10px] px-2.5 py-1 rounded-full font-medium backdrop-blur transition ${showDims ? 'bg-red-500/90 text-white' : 'bg-white/70 text-neutral-600 hover:bg-white/90'}`}
        >
          מידות
        </button>
        <button
          onClick={() => setShowGrid(g => !g)}
          className={`text-[10px] px-2.5 py-1 rounded-full font-medium backdrop-blur transition ${showGrid ? 'bg-blue-500/90 text-white' : 'bg-white/70 text-neutral-600 hover:bg-white/90'}`}
        >
          רשת
        </button>
        {isLouvers && (
          <div className="flex items-center gap-1 bg-white/80 backdrop-blur rounded-full px-2.5 py-1">
            <span className="text-[10px] text-neutral-600">לוברים</span>
            <input
              type="range" min={0} max={1} step={0.05}
              value={louverOpen}
              onChange={e => setLouverOpen(+e.target.value)}
              className="w-20 h-1 accent-emerald-500"
            />
          </div>
        )}
      </div>

      <Canvas
        shadows
        dpr={[1, mobile ? 1.5 : 2]}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      >
        <AdaptiveDpr pixelated />
        <PerspectiveCamera makeDefault fov={mobile ? 52 : 40} near={0.05} far={300} />
        <CameraRig cx={cx} cy={cy} cz={cz} camDist={camDist} mobile={mobile} controlsRef={controlsRef} />
        <OrbitControls
          ref={controlsRef}
          minDistance={1.2} maxDistance={60}
          minPolarAngle={0.05} maxPolarAngle={Math.PI / 2 - 0.02}
          enableDamping dampingFactor={0.07}
          enablePan={!mobile}
          touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE }}
        />
        <PergolaScene result={result} showDims={showDims} showGrid={showGrid} louverOpen={louverOpen} />
      </Canvas>
    </div>
  );
}
