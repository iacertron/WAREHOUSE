import React, { useMemo, useState } from 'react';
import _ from 'lodash';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Edges } from '@react-three/drei';
import { getColorCarga } from '../utils/colorUtils';

// ── Constantes ─────────────────────────────────────────────────────────────
const NIVEL_H  = 1.2;
const FLOOR_Y  = -0.85;
const PALLET_W = 1.2;   // largo en Z (a lo largo del rack)
const PALLET_D = 0.8;   // profundidad en X (reach)

const HW = PALLET_D / 2 + 0.08;   // 0.48 — semiancho rack en X
const HD = PALLET_W / 2 + 0.05;   // 0.65 — semiprofundidad rack en Z

const nivelBase = (n) => (n - 1) * NIVEL_H;

// ── Layout zigzag back-to-back ─────────────────────────────────────────────
// Rack impar → frente del bloque (X = bloqueX - 1.3)
// Rack par   → fondo del bloque  (X = bloqueX + 1.3)
// Pares (1,2), (3,4), (5,6)... comparten el mismo Z → back-to-back
const calcPos = (pasillo, rack, offsetZ) => {
  const esImpar = rack % 2 !== 0;
  return {
    x:      (pasillo - 1) * 16 + (esImpar ? -1.3 : 1.3),
    z:      -(Math.ceil(rack / 2) * 1.4) + offsetZ,
    esImpar,
  };
};

// ── Rack metálico industrial ───────────────────────────────────────────────
const RackEstructura = ({ x, z, niveles, rackNum, esImpar }) => {
  const colH   = niveles * NIVEL_H + Math.abs(FLOOR_Y);
  const colMY  = FLOOR_Y + colH / 2;
  const labelX = esImpar ? x - HW - 0.12 : x + HW + 0.12;
  const labelRY = esImpar ? Math.PI / 2 : -Math.PI / 2;

  return (
    <group>
      {/* Columnas verticales — acero #4a5568 */}
      {[[-HW, -HD], [-HW, HD], [HW, -HD], [HW, HD]].map(([dx, dz], i) => (
        <mesh key={i} position={[x + dx, colMY, z + dz]} castShadow>
          <boxGeometry args={[0.06, colH, 0.06]} />
          <meshStandardMaterial color="#4a5568" metalness={0.95} roughness={0.1} />
        </mesh>
      ))}

      {/* Vigas horizontales por nivel */}
      {Array.from({ length: niveles + 1 }, (_, n) => (
        <mesh key={n} position={[x, nivelBase(n + 1), z]} castShadow>
          <boxGeometry args={[PALLET_D + 0.16, 0.05, PALLET_W + 0.1]} />
          <meshStandardMaterial color="#37474F" metalness={0.85} roughness={0.25} />
        </mesh>
      ))}

      {/* Barra naranja de seguridad — kickplate */}
      <mesh position={[x, FLOOR_Y + 0.04, z]}>
        <boxGeometry args={[PALLET_D + 0.16, 0.08, PALLET_W + 0.1]} />
        <meshStandardMaterial color="#ea580c" metalness={0.2} roughness={0.6} />
      </mesh>

      {/* Número de rack — visible desde el pasillo de circulación */}
      <Text
        position={[labelX, nivelBase(1) + 0.4, z]}
        rotation={[0, labelRY, 0]}
        fontSize={0.2}
        color="#78909C"
        anchorX="center"
        anchorY="middle"
      >
        {String(rackNum).padStart(2, '0')}
      </Text>
    </group>
  );
};

// ── Pallet europeo PBR ─────────────────────────────────────────────────────
function PalletMesh({ ubi, x, z, palletsEnUbi, modoColor, colorMapSKU, opacidad, matchBusqueda, onSelectPallet, isSelected }) {
  const base = nivelBase(ubi.nivel);

  const colorBorde = matchBusqueda ? '#ef4444' : '#334155';
  const colorCarga = palletsEnUbi.length > 0
    ? getColorCarga(palletsEnUbi, modoColor, colorMapSKU)
    : '#334155';

  const cantidad = palletsEnUbi[0]?.cantidad ?? 0;
  const altCarga = Math.min(0.5 + (cantidad / 100) * 0.5, NIVEL_H - 0.22);
  const woodY    = base + 0.06;
  const cargoY   = base + 0.12 + altCarga / 2;
  const zunchoY  = base + 0.12 + altCarga - 0.07;

  return (
    <group>
      {palletsEnUbi.length > 0 && (
        <>
          <group
            onClick={(e) => { e.stopPropagation(); if (opacidad > 0.5) onSelectPallet({ ubi, pallets: palletsEnUbi }); }}
            onPointerOver={(e) => { e.stopPropagation(); if (opacidad > 0.5) document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = 'auto'; }}
          >
            {/* Base madera pallet europeo 1200×800 */}
            <mesh position={[x, woodY, z]} castShadow>
              <boxGeometry args={[PALLET_D, 0.12, PALLET_W]} />
              <meshStandardMaterial color="#8B6914" roughness={0.95} metalness={0} transparent opacity={opacidad} />
            </mesh>

            {/* Carga proporcional a cantidad */}
            <mesh position={[x, cargoY, z]} castShadow>
              <boxGeometry args={[PALLET_D - 0.04, altCarga, PALLET_W - 0.04]} />
              <meshStandardMaterial color={colorCarga} roughness={0.4} metalness={0} transparent opacity={opacidad} />
              <Edges scale={matchBusqueda ? 1.05 : 1.01} threshold={15} color={colorBorde} />
            </mesh>

            {/* Zuncho X */}
            <mesh position={[x, zunchoY, z]}>
              <boxGeometry args={[PALLET_D + 0.01, 0.03, 0.05]} />
              <meshStandardMaterial color="#1e293b" transparent opacity={opacidad} />
            </mesh>
            {/* Zuncho Z */}
            <mesh position={[x, zunchoY, z]}>
              <boxGeometry args={[0.05, 0.03, PALLET_W + 0.01]} />
              <meshStandardMaterial color="#1e293b" transparent opacity={opacidad} />
            </mesh>
          </group>

          {isSelected && (
            <Text
              position={[x, base + altCarga + 0.6, z]}
              fontSize={0.25}
              color="#fbbf24"
              anchorX="center"
              outlineWidth={0.02}
              outlineColor="#000000"
            >
              {ubi.ubicacion}
            </Text>
          )}
        </>
      )}
    </group>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export default function Warehouse3D({ maestro, lx02, modoColor, colorMapSKU, onSelectPallet, terminoBusqueda }) {
  const [selectedUbicacion, setSelectedUbicacion] = useState(null);

  const searchNormalized   = terminoBusqueda?.toLowerCase().trim();
  const modoBusquedaActivo = searchNormalized && searchNormalized.length > 1;

  const invPorUbicacion = useMemo(() => _.groupBy(lx02, 'ubicacion'), [lx02]);

  const pasillos = useMemo(
    () => [...new Set(maestro.map(u => u.pasillo))].sort((a, b) => a - b),
    [maestro],
  );

  // U1 y U2 comparten posición física → clave sin tipoUbi
  const racks = useMemo(() => {
    const map = new Map();
    maestro.forEach(u => {
      const key  = `${u.pasillo}-${u.rack}`;
      const prev = map.get(key);
      if (!prev || u.nivel > prev.niveles) {
        map.set(key, { pasillo: u.pasillo, rack: u.rack, niveles: u.nivel });
      }
    });
    return [...map.values()];
  }, [maestro]);

  // Dimensiones de escena
  const { centroX, centroZ, offsetZ, topY, maxP } = useMemo(() => {
    if (!maestro.length) return { centroX: 0, centroZ: 0, offsetZ: 30, topY: 6, maxP: 1 };
    const maxP  = Math.max(...maestro.map(u => u.pasillo));
    const maxR  = Math.max(...maestro.map(u => u.rack));
    const maxN  = Math.max(...maestro.map(u => u.nivel));
    const maxRG = Math.ceil(maxR / 2);
    const oZ    = Math.max(30, maxRG * 1.4 + 10);
    const zFirst = oZ - 1.4;                // par 1 (racks 1,2)
    const zLast  = oZ - maxRG * 1.4;        // último par
    return {
      centroX: (maxP - 1) * 8,
      centroZ: (zFirst + zLast) / 2,
      offsetZ: oZ,
      topY:    maxN * NIVEL_H,
      maxP,
    };
  }, [maestro]);

  const handleSelect = (data) => {
    setSelectedUbicacion(data.ubi.ubicacion);
    onSelectPallet(data);
  };

  const lineOff    = 1.3 + HW + 0.1;            // 1.88 — borde exterior bloque
  const leftWallX  = -6;
  const rightWallX = (maxP - 1) * 16 + 6;
  const wallMidY   = FLOOR_Y + 7.5;             // centro de pared de 15u

  return (
    <Canvas shadows camera={{ position: [centroX, 35, 65], fov: 50 }}>
      <fog attach="fog" args={['#0a0a0f', 40, 120]} />

      <ambientLight intensity={0.2} />
      <directionalLight
        position={[centroX, 20, centroZ + 20]}
        intensity={0.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Lámparas industriales — 1 cada 2 pasillos */}
      {pasillos.filter((_, i) => i % 2 === 0).map(p => {
        const lampX = (p - 1) * 16;
        return (
          <React.Fragment key={p}>
            <pointLight position={[lampX, 12, centroZ]} intensity={1.5} color="#fff5e0" distance={25} decay={2} />
            <mesh position={[lampX, 12, centroZ]}>
              <sphereGeometry args={[0.15, 8, 8]} />
              <meshStandardMaterial color="#fffde7" emissive="#fffde7" emissiveIntensity={2} />
            </mesh>
          </React.Fragment>
        );
      })}

      <OrbitControls
        makeDefault
        target={[centroX, 2, 0]}
        maxPolarAngle={Math.PI / 2 + 0.05}
        minDistance={10}
        maxDistance={150}
      />

      {/* Piso concreto */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centroX, FLOOR_Y, centroZ]} receiveShadow>
        <planeGeometry args={[200, 80]} />
        <meshStandardMaterial color="#1c1c1e" roughness={0.95} metalness={0} />
      </mesh>

      {/* Paredes laterales */}
      <mesh position={[leftWallX, wallMidY, centroZ]}>
        <boxGeometry args={[0.5, 15, 80]} />
        <meshStandardMaterial color="#111318" roughness={0.9} metalness={0.05} />
      </mesh>
      <mesh position={[rightWallX, wallMidY, centroZ]}>
        <boxGeometry args={[0.5, 15, 80]} />
        <meshStandardMaterial color="#111318" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Techo */}
      <mesh position={[centroX, 14, centroZ]}>
        <boxGeometry args={[200, 0.3, 80]} />
        <meshStandardMaterial color="#0d0d0f" roughness={0.9} />
      </mesh>

      {/* Vigas transversales cada 8u */}
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} position={[centroX, 13.85, centroZ + (i - 5) * 8]}>
          <boxGeometry args={[200, 0.3, 0.4]} />
          <meshStandardMaterial color="#1a1a1f" />
        </mesh>
      ))}

      {/* Zona picking — frente del primer par de racks */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centroX, FLOOR_Y + 0.001, offsetZ + 1.5]}>
        <planeGeometry args={[200, 3]} />
        <meshStandardMaterial color="#052e16" roughness={0.85} transparent opacity={0.85} />
      </mesh>
      <Text
        position={[centroX, FLOOR_Y + 0.01, offsetZ + 1.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.45}
        color="#22c55e"
        anchorX="center"
        anchorY="middle"
      >
        ZONA PICKING
      </Text>

      {/* Líneas amarillas — bordes del bloque de cada pasillo */}
      {pasillos.map(p => {
        const cx = (p - 1) * 16;
        return (
          <React.Fragment key={p}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx + lineOff, FLOOR_Y + 0.002, centroZ]}>
              <planeGeometry args={[0.1, 80]} />
              <meshStandardMaterial color="#fbbf24" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx - lineOff, FLOOR_Y + 0.002, centroZ]}>
              <planeGeometry args={[0.1, 80]} />
              <meshStandardMaterial color="#fbbf24" />
            </mesh>
          </React.Fragment>
        );
      })}

      {/* Estructuras de rack */}
      {racks.map(({ pasillo, rack, niveles }) => {
        const { x, z, esImpar } = calcPos(pasillo, rack, offsetZ);
        return (
          <RackEstructura
            key={`${pasillo}-${rack}`}
            x={x} z={z}
            niveles={niveles}
            rackNum={rack}
            esImpar={esImpar}
          />
        );
      })}

      {/* Pallets */}
      {maestro.map((ubi, i) => {
        const { x, z }     = calcPos(ubi.pasillo, ubi.rack, offsetZ);
        const palletsEnUbi = invPorUbicacion[ubi.ubicacion] ?? [];
        const ocupado      = palletsEnUbi.length > 0;
        let matchBusqueda  = false;
        let opacidad       = 1;

        if (modoBusquedaActivo) {
          if (ocupado) {
            matchBusqueda = palletsEnUbi.some(p =>
              p.material?.toLowerCase().includes(searchNormalized) ||
              p.descripcion?.toLowerCase().includes(searchNormalized) ||
              p.lote?.toLowerCase().includes(searchNormalized)
            );
            opacidad = matchBusqueda ? 1 : 0.1;
          } else {
            opacidad = 0.1;
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
            isSelected={selectedUbicacion === ubi.ubicacion}
          />
        );
      })}

      {/* Etiquetas de pasillo — al frente del bloque */}
      {pasillos.map(p => (
        <Text
          key={p}
          position={[(p - 1) * 16, topY + 1.5, offsetZ + 0.5]}
          fontSize={0.9}
          color="#3b82f6"
          anchorX="center"
          anchorY="middle"
        >
          {`P${String(p).padStart(2, '0')}`}
        </Text>
      ))}
    </Canvas>
  );
}
