import React, { useMemo, useState, useRef, useCallback } from 'react';
import _ from 'lodash';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Edges, Grid } from '@react-three/drei';
import { getColorCarga, getFormato } from '../utils/colorUtils';

// ── Constantes físicas ─────────────────────────────────────────────────────
const ALTURA   = 1.4;    // altura por nivel
const PALLET_W = 1.2;    // profundidad rack en Z
const PALLET_D = 0.8;    // profundidad rack en X (simple)
const HW       = PALLET_D / 2 + 0.08;   // semiancho rack X = 0.48
const HD       = PALLET_W / 2 + 0.05;   // semiprofundidad rack Z = 0.65
const U2_STEP  = PALLET_D + 0.1;        // offset X para segundo pallet U2

// nivel 1 → y=0 (apoyado en piso)
const yBase = (n) => (n - 1) * ALTURA;

// ── Layout pasillos por bloques ────────────────────────────────────────────
// Pasillos impares = lado -X del bloque; pares = lado +X
const calcPos = (pasillo, rack, offsetZ) => {
  const bloqueId   = Math.ceil(pasillo / 2);
  const ladoBloque = pasillo % 2 === 0 ? 1 : -1;
  const bloqueX    = (bloqueId - 1) * 14;
  return {
    x:           bloqueX + ladoBloque * 1.5,
    z:           -(rack * 1.4) + offsetZ,
    ladoBloque,
  };
};

// ── Diagonal de bracing en plano ZY ───────────────────────────────────────
function DiagBrace({ x, y0, y1, zCenter, flip }) {
  const dz  = 2 * HD;
  const dy  = y1 - y0;
  const len = Math.sqrt(dz * dz + dy * dy);
  const ang = flip ? -Math.atan2(dz, dy) : Math.atan2(dz, dy);
  return (
    <mesh position={[x, (y0 + y1) / 2, zCenter]} rotation={[ang, 0, 0]}>
      <boxGeometry args={[0.025, len, 0.025]} />
      <meshStandardMaterial color="#1e3a8a" metalness={0.7} roughness={0.25} />
    </mesh>
  );
}

// ── Estructura de rack tipo Copec ──────────────────────────────────────────
const RackEstructura = React.memo(({ x, z, niveles, rackNum, esU2, ladoBloque }) => {
  const colH    = niveles * ALTURA;
  const colMY   = colH / 2;
  const aisleX  = x - ladoBloque * (HW + 0.15);   // cara hacia pasillo
  const labelRY = ladoBloque > 0 ? -Math.PI / 2 : Math.PI / 2;

  // Posiciones X de los parantes (U1: 4, U2: 6)
  const postXs = esU2
    ? [
        x - ladoBloque * HW,                    // frente exterior (pasillo)
        x + ladoBloque * HW,                    // frente interior (compartido)
        x + ladoBloque * (U2_STEP + HW),        // fondo exterior
      ]
    : [x - HW, x + HW];

  const allPosts = [];
  postXs.forEach(px => {
    allPosts.push([px, -HD]);
    allPosts.push([px, HD]);
  });

  // Viga horizontal — centro y ancho según U1/U2
  const beamCX = esU2 ? x + ladoBloque * U2_STEP / 2 : x;
  const beamW  = esU2 ? PALLET_D + 0.16 + U2_STEP : PALLET_D + 0.16;

  // Cara para bracing: X exterior del lado pasillo
  const braceX = x - ladoBloque * HW;

  return (
    <group>
      {/* Parantes verticales — azul Copec */}
      {allPosts.map(([px, dz], i) => (
        <mesh key={i} position={[px, colMY, z + dz]} castShadow>
          <boxGeometry args={[0.07, colH, 0.07]} />
          <meshStandardMaterial color="#1e40af" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}

      {/* Vigas horizontales por nivel */}
      {Array.from({ length: niveles + 1 }, (_, n) => (
        <mesh key={n} position={[beamCX, yBase(n + 1), z]} castShadow>
          <boxGeometry args={[beamW, 0.05, PALLET_W + 0.1]} />
          <meshStandardMaterial color="#1e3a8a" metalness={0.65} roughness={0.4} />
        </mesh>
      ))}

      {/* Bracing en X — cara visible desde pasillo */}
      {Array.from({ length: niveles }, (_, n) => {
        const y0 = yBase(n + 1) + 0.06;
        const y1 = yBase(n + 2) - 0.06;
        return (
          <React.Fragment key={n}>
            <DiagBrace x={braceX} y0={y0} y1={y1} zCenter={z} flip={false} />
            <DiagBrace x={braceX} y0={y0} y1={y1} zCenter={z} flip={true} />
          </React.Fragment>
        );
      })}

      {/* Bumper amarillo base */}
      <mesh position={[x, 0.1, z]}>
        <boxGeometry args={[PALLET_D + 0.22, 0.2, PALLET_W + 0.22]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.55} metalness={0.1} />
      </mesh>
      {esU2 && (
        <mesh position={[x + ladoBloque * U2_STEP, 0.1, z]}>
          <boxGeometry args={[PALLET_D + 0.22, 0.2, PALLET_W + 0.22]} />
          <meshStandardMaterial color="#fbbf24" roughness={0.55} metalness={0.1} />
        </mesh>
      )}

      {/* Número de rack */}
      <Text
        position={[aisleX, yBase(1) + 0.7, z]}
        rotation={[0, labelRY, 0]}
        fontSize={0.22}
        color="#93c5fd"
        anchorX="center"
        anchorY="middle"
      >
        {String(rackNum).padStart(2, '0')}
      </Text>
    </group>
  );
});

// ── Carga del pallet (tambores o cajas) ───────────────────────────────────
function PalletCarga({ x, z, cargoY, altCarga, color, formato, opacidad, matchBusqueda }) {
  const isTambor = formato === 'TAMBOR (208L)';
  const borde    = matchBusqueda ? '#fbbf24' : '#0f172a';

  if (isTambor) {
    return (
      <>
        {[[-0.17, -0.24], [-0.17, 0.24], [0.17, -0.24], [0.17, 0.24]].map(([dx, dz], i) => (
          <mesh key={i} position={[x + dx, cargoY, z + dz]} castShadow>
            <cylinderGeometry args={[0.12, 0.13, altCarga, 14]} />
            <meshStandardMaterial color={color} roughness={0.35} metalness={0.3} transparent opacity={opacidad} />
          </mesh>
        ))}
        {matchBusqueda && (
          <mesh position={[x, cargoY, z]}>
            <boxGeometry args={[PALLET_D + 0.08, altCarga + 0.08, PALLET_W + 0.08]} />
            <meshStandardMaterial color="#fbbf24" transparent opacity={0.18} wireframe />
          </mesh>
        )}
      </>
    );
  }

  return (
    <mesh position={[x, cargoY, z]} castShadow>
      <boxGeometry args={[PALLET_D - 0.04, altCarga, PALLET_W - 0.04]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.05} transparent opacity={opacidad} />
      <Edges scale={matchBusqueda ? 1.07 : 1.01} threshold={15} color={borde} />
    </mesh>
  );
}

// ── Pallet completo ────────────────────────────────────────────────────────
function PalletMesh({ ubi, x, z, palletsEnUbi, modoColor, colorMapSKU, opacidad, matchBusqueda, onSelectPallet, isSelected, ladoBloque }) {
  if (palletsEnUbi.length === 0) return null;

  const isU2     = ubi.tipoUbi === 'U2';
  const px       = isU2 ? x + ladoBloque * U2_STEP : x;
  const base     = yBase(ubi.nivel);
  const cantidad = palletsEnUbi[0]?.cantidad ?? 0;
  const altCarga = Math.min(0.5 + (cantidad / 100) * 0.5, ALTURA - 0.22);
  const woodY    = base + 0.06;
  const cargoY   = base + 0.12 + altCarga / 2;
  const zunchoY  = base + 0.12 + altCarga - 0.07;
  const formato  = getFormato(palletsEnUbi[0]?.descripcion);
  const color    = getColorCarga(palletsEnUbi, modoColor, colorMapSKU);

  return (
    <group>
      <group
        onClick={(e) => { e.stopPropagation(); if (opacidad > 0.5) onSelectPallet({ ubi, pallets: palletsEnUbi }); }}
        onPointerOver={(e) => { e.stopPropagation(); if (opacidad > 0.5) document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        {/* Base madera */}
        <mesh position={[px, woodY, z]} castShadow receiveShadow>
          <boxGeometry args={[PALLET_D, 0.12, PALLET_W]} />
          <meshStandardMaterial color="#b45309" roughness={0.95} metalness={0} transparent opacity={opacidad} />
        </mesh>

        {/* Cortes en la madera (visibilidad) */}
        <mesh position={[px, woodY, z - 0.28]}>
          <boxGeometry args={[PALLET_D + 0.01, 0.12, 0.06]} />
          <meshStandardMaterial color="#7c4a0a" roughness={0.98} metalness={0} transparent opacity={opacidad} />
        </mesh>
        <mesh position={[px, woodY, z + 0.28]}>
          <boxGeometry args={[PALLET_D + 0.01, 0.12, 0.06]} />
          <meshStandardMaterial color="#7c4a0a" roughness={0.98} metalness={0} transparent opacity={opacidad} />
        </mesh>

        {/* Producto */}
        <PalletCarga
          x={px} z={z}
          cargoY={cargoY} altCarga={altCarga}
          color={color} formato={formato}
          opacidad={opacidad} matchBusqueda={matchBusqueda}
        />

        {/* Zuncho X */}
        <mesh position={[px, zunchoY, z]}>
          <boxGeometry args={[PALLET_D + 0.01, 0.03, 0.05]} />
          <meshStandardMaterial color="#0f172a" transparent opacity={opacidad} />
        </mesh>
        {/* Zuncho Z */}
        <mesh position={[px, zunchoY, z]}>
          <boxGeometry args={[0.05, 0.03, PALLET_W + 0.01]} />
          <meshStandardMaterial color="#0f172a" transparent opacity={opacidad} />
        </mesh>
      </group>

      {isSelected && (
        <Text
          position={[px, base + altCarga + 0.8, z]}
          fontSize={0.28}
          color="#1e40af"
          anchorX="center"
          outlineWidth={0.03}
          outlineColor="#ffffff"
        >
          {ubi.ubicacion}
        </Text>
      )}
    </group>
  );
}

// ── Animación de entrada ───────────────────────────────────────────────────
function CameraEntry({ centroX, onDone }) {
  const { camera } = useThree();
  const elapsed    = useRef(0);
  const called     = useRef(false);

  useFrame((_, delta) => {
    elapsed.current = Math.min(elapsed.current + delta, 2.5);
    const t    = elapsed.current / 2.5;
    const ease = 1 - Math.pow(1 - t, 3); // cubic ease-out
    camera.position.set(centroX, 55 - 30 * ease, 90 - 40 * ease);
    camera.lookAt(centroX, 3, 0);
    if (t >= 1 && !called.current) { called.current = true; onDone(); }
  });
  return null;
}

// ── Componente principal ───────────────────────────────────────────────────
export default function Warehouse3D({ maestro, lx02, modoColor, colorMapSKU, onSelectPallet, terminoBusqueda }) {
  const [selectedUbi, setSelectedUbi] = useState(null);
  const [animDone, setAnimDone]       = useState(false);

  const searchNorm = terminoBusqueda?.toLowerCase().trim();
  const buscando   = searchNorm && searchNorm.length > 1;

  const invPorUbi = useMemo(() => _.groupBy(lx02, 'ubicacion'), [lx02]);
  const pasillos  = useMemo(() => [...new Set(maestro.map(u => u.pasillo))].sort((a, b) => a - b), [maestro]);

  const racks = useMemo(() => {
    const map = new Map();
    maestro.forEach(u => {
      const key  = `${u.pasillo}-${u.rack}`;
      const prev = map.get(key);
      if (!prev) {
        map.set(key, { pasillo: u.pasillo, rack: u.rack, niveles: u.nivel, esU2: u.tipoUbi === 'U2' });
      } else {
        map.set(key, { ...prev, niveles: Math.max(prev.niveles, u.nivel), esU2: prev.esU2 || u.tipoUbi === 'U2' });
      }
    });
    return [...map.values()];
  }, [maestro]);

  const { centroX, centroZ, offsetZ, topY, maxBloques } = useMemo(() => {
    if (!maestro.length) return { centroX: 0, centroZ: 0, offsetZ: 30, topY: 6, maxBloques: 1 };
    const maxP  = Math.max(...maestro.map(u => u.pasillo));
    const maxR  = Math.max(...maestro.map(u => u.rack));
    const maxN  = Math.max(...maestro.map(u => u.nivel));
    const maxBl = Math.ceil(maxP / 2);
    const oZ    = Math.max(30, maxR * 1.4 + 8);
    return {
      centroX:    (maxBl - 1) * 7,
      centroZ:    (oZ - 1.4 + oZ - maxR * 1.4) / 2,
      offsetZ:    oZ,
      topY:       maxN * ALTURA,
      maxBloques: maxBl,
    };
  }, [maestro]);

  const handleSelect = useCallback((data) => {
    setSelectedUbi(data.ubi.ubicacion);
    onSelectPallet(data);
  }, [onSelectPallet]);

  const leftWallX  = -8;
  const rightWallX = (maxBloques - 1) * 14 + 8;
  const wallMidY   = 8;

  const bloqueIds = useMemo(
    () => [...new Set(pasillos.map(p => Math.ceil(p / 2)))].sort((a, b) => a - b),
    [pasillos],
  );

  return (
    <Canvas shadows camera={{ position: [centroX, 55, 90], fov: 50 }}>
      {/* Iluminación ejecutiva */}
      <ambientLight intensity={0.7} color="#ffffff" />
      <directionalLight
        position={[20, 30, 15]}
        intensity={1.5}
        color="#fefce8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <hemisphereLight args={['#f0f9ff', '#94a3b8', 0.4]} />

      {/* Animación de entrada + controles */}
      {!animDone && <CameraEntry centroX={centroX} onDone={() => setAnimDone(true)} />}
      <OrbitControls
        makeDefault
        enabled={animDone}
        target={[centroX, 3, 0]}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={12}
        maxDistance={100}
        enableDamping
        dampingFactor={0.05}
      />

      {/* Piso hormigón claro */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centroX, -0.01, centroZ]} receiveShadow>
        <planeGeometry args={[220, 100]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.92} metalness={0.02} />
      </mesh>
      <Grid
        position={[centroX, 0, centroZ]}
        args={[220, 100]}
        cellSize={2}
        cellThickness={0.4}
        cellColor="#d1d5db"
        sectionSize={10}
        sectionThickness={0.8}
        sectionColor="#9ca3af"
        fadeDistance={90}
        fadeStrength={1}
        infiniteGrid={false}
      />

      {/* Paredes laterales — hormigón claro, sin techo */}
      <mesh position={[leftWallX, wallMidY, centroZ]}>
        <boxGeometry args={[0.4, 16, 100]} />
        <meshStandardMaterial color="#f3f4f6" roughness={0.85} metalness={0.02} />
      </mesh>
      <mesh position={[rightWallX, wallMidY, centroZ]}>
        <boxGeometry args={[0.4, 16, 100]} />
        <meshStandardMaterial color="#f3f4f6" roughness={0.85} metalness={0.02} />
      </mesh>

      {/* Zona picking */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centroX, 0.001, offsetZ + 2.5]}>
        <planeGeometry args={[rightWallX - leftWallX, 5]} />
        <meshStandardMaterial color="#d1fae5" roughness={0.85} transparent opacity={0.45} />
      </mesh>
      <Text
        position={[centroX, 0.01, offsetZ + 2.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1.2}
        color="#059669"
        anchorX="center"
        anchorY="middle"
      >
        ZONA PICKING
      </Text>

      {/* Líneas amarillas de demarcación — por bloque */}
      {bloqueIds.map(bid => {
        const bx = (bid - 1) * 14;
        return (
          <React.Fragment key={bid}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[bx - 3.2, 0.002, centroZ]}>
              <planeGeometry args={[0.12, 100]} />
              <meshStandardMaterial color="#fbbf24" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[bx + 3.2, 0.002, centroZ]}>
              <planeGeometry args={[0.12, 100]} />
              <meshStandardMaterial color="#fbbf24" />
            </mesh>
          </React.Fragment>
        );
      })}

      {/* Estructuras de rack */}
      {racks.map(({ pasillo, rack, niveles, esU2 }) => {
        const { x, z, ladoBloque } = calcPos(pasillo, rack, offsetZ);
        return (
          <RackEstructura
            key={`${pasillo}-${rack}`}
            x={x} z={z}
            niveles={niveles}
            rackNum={rack}
            esU2={esU2}
            ladoBloque={ladoBloque}
          />
        );
      })}

      {/* Pallets */}
      {maestro.map((ubi, i) => {
        const { x, z, ladoBloque } = calcPos(ubi.pasillo, ubi.rack, offsetZ);
        const palletsEnUbi = invPorUbi[ubi.ubicacion] ?? [];
        const ocupado      = palletsEnUbi.length > 0;
        let matchBusqueda  = false;
        let opacidad       = 1;

        if (buscando) {
          if (ocupado) {
            matchBusqueda = palletsEnUbi.some(p =>
              p.material?.toLowerCase().includes(searchNorm) ||
              p.descripcion?.toLowerCase().includes(searchNorm) ||
              p.lote?.toLowerCase().includes(searchNorm)
            );
            opacidad = matchBusqueda ? 1 : 0.07;
          } else {
            opacidad = 0.07;
          }
        }

        return (
          <PalletMesh
            key={i}
            ubi={ubi}
            x={x} z={z}
            palletsEnUbi={palletsEnUbi}
            modoColor={modoColor}
            colorMapSKU={colorMapSKU}
            opacidad={opacidad}
            matchBusqueda={matchBusqueda}
            onSelectPallet={handleSelect}
            isSelected={selectedUbi === ubi.ubicacion}
            ladoBloque={ladoBloque}
          />
        );
      })}

      {/* Etiquetas de pasillo — planas en piso, al inicio del bloque */}
      {pasillos.map(p => {
        const bloqueId   = Math.ceil(p / 2);
        const ladoBloque = p % 2 === 0 ? 1 : -1;
        const bloqueX    = (bloqueId - 1) * 14;
        const lx         = bloqueX + ladoBloque * 1.5;
        const lz         = offsetZ + 4;
        return (
          <group key={p}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[lx, 0.001, lz]}>
              <planeGeometry args={[4.5, 2]} />
              <meshStandardMaterial color="#1e3a8a" transparent opacity={0.6} />
            </mesh>
            <Text
              position={[lx, 0.012, lz]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={1.5}
              color="#eff6ff"
              anchorX="center"
              anchorY="middle"
            >
              {`PASILLO ${String(p).padStart(2, '0')}`}
            </Text>
          </group>
        );
      })}
    </Canvas>
  );
}
