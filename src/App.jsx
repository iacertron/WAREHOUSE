import React, { useState, useMemo } from 'react';
import { Box, Layers, Zap, Upload, CheckCircle2, Cuboid, X, Palette, BarChart3, Package, CheckSquare, Search, BrainCircuit, Target, AlertOctagon, Lightbulb, Hexagon, Factory } from 'lucide-react';
import Papa from 'papaparse';
import _ from 'lodash';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Edges, ContactShadows } from '@react-three/drei';

// --- PALETAS DE COLORES (Adaptado a tonos más industriales) ---
const COLORES_SKU = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e', '#84cc16'];
const COLORES_FORMATO = { 'BIN (1040L)': '#8b5cf6', 'TAMBOR (208L)': '#f59e0b', 'BALDE (19L)': '#10b981', 'CAJA 5L': '#3b82f6', 'CAJA 4L': '#06b6d4', 'CAJA 1L': '#ef4444', 'OTRO': '#64748b' };

const getFormato = (descripcion) => {
  if (!descripcion) return 'OTRO';
  const desc = descripcion.toLowerCase();
  if (/1040\s*l/i.test(desc)) return 'BIN (1040L)';
  if (/208\s*l/i.test(desc)) return 'TAMBOR (208L)';
  if (/19\s*l/i.test(desc)) return 'BALDE (19L)';
  if (/5\s*l/i.test(desc)) return 'CAJA 5L';
  if (/4\s*l/i.test(desc)) return 'CAJA 4L';
  if (/1\s*l/i.test(desc)) return 'CAJA 1L';
  return 'OTRO';
};

// --- MOTOR PREDICTIVO (LUB-AI INSIGHTS) ---
const generarInsights = (maestro, lx02) => {
  const insights = [];
  const invProcesado = lx02.map(p => ({
    ...p,
    Cantidad_Total: parseFloat(p.Cantidad_Total?.toString().replace(',', '.') || 0),
    Nivel: parseInt(p.Ubicacion?.split('-')[2] || 0)
  }));

  const invPorMaterial = _.groupBy(invProcesado, 'Material');
  const invPorUbicacion = _.groupBy(invProcesado, 'Ubicacion');

  Object.entries(invPorMaterial).forEach(([material, pallets]) => {
    const parciales = pallets.filter(p => p.Cantidad_Total > 0 && p.Cantidad_Total < 100);
    if (parciales.length > 1) {
      const ordenados = _.orderBy(parciales, ['Cantidad_Total'], ['asc']);
      const ubiMenor = ordenados[0];
      const ubiMayor = ordenados[ordenados.length - 1];
      insights.push({
        tipo: 'COMPACTACIÓN', nivel: 'ALTO IMPACTO', titulo: `Cuadratura de ${material}`,
        mensaje: `LUB-AI detecta fragmentación espacial. Consolidar ${ubiMenor.Cantidad_Total} UN desde [${ubiMenor.Ubicacion}] hacia [${ubiMayor.Ubicacion}] liberará 1 ubicación completa.`,
        accion: `${ubiMenor.Ubicacion} ➔ ${ubiMayor.Ubicacion}`,
        color: 'text-blue-400', bg: 'bg-blue-600', icon: <Target size={24} />
      });
    }
  });

  maestro.forEach(ubi => {
    const palletsEnUbi = invPorUbicacion[ubi.Ubicacion] || [];
    if (ubi.Tipo_Profundidad === 'Doble' && parseInt(ubi.Posicion) === 1 && palletsEnUbi.length > 0) {
      const ubiFondo = `${ubi.Pasillo}-${String(ubi.Rack).padStart(2, '0')}-${ubi.Nivel}-2`;
      const palletsAtras = invPorUbicacion[ubiFondo] || [];
      if (palletsAtras.length > 0 && palletsEnUbi[0].Material !== palletsAtras[0].Material) {
        insights.push({
          tipo: 'RIESGO OPERATIVO', nivel: 'CRÍTICO', titulo: `Doble Manejo Inminente en ${ubi.Ubicacion}`,
          mensaje: `El pallet de [${palletsEnUbi[0].Material}] bloquea el acceso a [${palletsAtras[0].Material}] en el fondo. Requiere reubicación preventiva.`,
          accion: `Reubicar Frente`,
          color: 'text-red-400', bg: 'bg-red-600', icon: <AlertOctagon size={24} />
        });
      }
    }
  });

  return _.orderBy(insights, i => i.nivel === 'CRÍTICO' ? 0 : 1);
};

// --- COMPONENTE 3D CORPORATIVO ---
const Warehouse3D = ({ maestro, lx02, modoColor, colorMapSKU, onSelectPallet, terminoBusqueda }) => {
  const posPasillo = { 'A': -12, 'B': 0, 'C': 12 };
  const searchNormalized = terminoBusqueda?.toLowerCase().trim();
  const modoBusquedaActivo = searchNormalized && searchNormalized.length > 1;

  return (
    <Canvas camera={{ position: [0, 25, 45], fov: 40 }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[15, 30, 15]} intensity={1} castShadow />
      <OrbitControls makeDefault maxPolarAngle={Math.PI / 2 + 0.05} />
      <ContactShadows opacity={0.6} scale={70} blur={2.5} far={15} color="#000000" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]}>
        <planeGeometry args={[70, 60]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      {maestro.map((ubi, i) => {
        const palletsEnUbi = lx02.filter(p => p.Ubicacion === ubi.Ubicacion);
        const ocupado = palletsEnUbi.length > 0;
        
        let matchBusqueda = false;
        let opacidadGeneral = 1;
        let colorBorde = "#000000";

        if (modoBusquedaActivo) {
            if (ocupado) {
                matchBusqueda = palletsEnUbi.some(p => 
                    p.Material?.toLowerCase().includes(searchNormalized) ||
                    p.Descripcion?.toLowerCase().includes(searchNormalized) ||
                    p.Lote?.toLowerCase().includes(searchNormalized)
                );
                // Highlight Rojo ExxonMobil para la búsqueda
                if (matchBusqueda) { opacidadGeneral = 1; colorBorde = "#ef4444"; } 
                else { opacidadGeneral = 0.10; colorBorde = "#334155"; }
            } else { opacidadGeneral = 0.10; }
        }

        const x = posPasillo[ubi.Pasillo] + (ubi.Posicion * 1.35); 
        const y = (ubi.Nivel * 1.6) - 0.75; 
        let z = (ubi.Rack * 3) - 15; 
        if (ubi.Tipo_Profundidad === 'Doble' && ubi.Posicion === 2) z -= 1.35;

        let colorCarga = '#334155';
        if (ocupado) {
          if (modoColor === 'formato') {
            const formato = getFormato(palletsEnUbi[0].Descripcion);
            colorCarga = COLORES_FORMATO[formato] || COLORES_FORMATO['OTRO'];
          } else {
            const skus = _.uniq(palletsEnUbi.map(p => p.Material));
            colorCarga = skus.length > 1 ? '#ffffff' : colorMapSKU[skus[0]];
          }
        }

        return (
          <group key={i}>
            <mesh position={[x, y - 0.55, z + 0.45]}><boxGeometry args={[1.25, 0.1, 0.1]} /><meshStandardMaterial color="#ea580c" transparent opacity={opacidadGeneral} /></mesh>
            <mesh position={[x, y - 0.55, z - 0.45]}><boxGeometry args={[1.25, 0.1, 0.1]} /><meshStandardMaterial color="#ea580c" transparent opacity={opacidadGeneral} /></mesh>
            {ubi.Nivel === 1 && (
              <>
                <mesh position={[x - 0.65, 3, z + 0.45]}><boxGeometry args={[0.08, 7.5, 0.08]} /><meshStandardMaterial color="#1e3a8a" transparent opacity={opacidadGeneral} /></mesh>
                <mesh position={[x - 0.65, 3, z - 0.45]}><boxGeometry args={[0.08, 7.5, 0.08]} /><meshStandardMaterial color="#1e3a8a" transparent opacity={opacidadGeneral} /></mesh>
              </>
            )}
            {ocupado && (
              <group onClick={(e) => { e.stopPropagation(); if(opacidadGeneral > 0.5) onSelectPallet({ ubi, pallets: palletsEnUbi }); }} onPointerOver={(e) => { e.stopPropagation(); if(opacidadGeneral > 0.5) document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = 'auto'; }}>
                <mesh position={[x, y - 0.45, z]}><boxGeometry args={[1.1, 0.1, 1]} /><meshStandardMaterial color="#8b5a2b" transparent opacity={opacidadGeneral} /></mesh>
                {/* Ajustamos el material de la caja para que el borde rojo resalte más */}
                <mesh position={[x, y + 0.05, z]}><boxGeometry args={[1.05, 0.9, 0.95]} /><meshStandardMaterial color={colorCarga} roughness={0.3} transparent opacity={opacidadGeneral} /><Edges scale={matchBusqueda ? 1.05 : 1.01} threshold={15} color={colorBorde} /></mesh>
              </group>
            )}
          </group>
        );
      })}

      <Text position={[-12, 8.5, 17]} fontSize={1.5} color="#3b82f6" anchorX="center" fontWeight="black">PASILLO A</Text>
      <Text position={[0, 8.5, 17]} fontSize={1.5} color="#3b82f6" anchorX="center" fontWeight="black">PASILLO B (DOBLE)</Text>
      <Text position={[12, 8.5, 17]} fontSize={1.5} color="#3b82f6" anchorX="center" fontWeight="black">PASILLO C</Text>
    </Canvas>
  );
};

// --- APLICACIÓN PRINCIPAL ---
export default function App() {
  const [maestro, setMaestro] = useState([]);
  const [lx02, setLx02] = useState([]);
  const [vista, setVista] = useState('3d'); 
  const [modoColor, setModoColor] = useState('sku'); 
  const [terminoBusqueda, setTerminoBusqueda] = useState(''); 
  const [palletSeleccionado, setPalletSeleccionado] = useState(null);
  const [aiInsights, setAiInsights] = useState([]);

  const parseMaestro = (e) => Papa.parse(e.target.files[0], { header: true, skipEmptyLines: true, complete: (res) => setMaestro(res.data.filter(r => r.Pasillo)) });
  const parseLx02 = (e) => Papa.parse(e.target.files[0], { header: true, skipEmptyLines: true, complete: (res) => {
    const data = res.data.filter(r => r.Material);
    setLx02(data);
    setAiInsights(generarInsights(maestro, data)); 
  }});

  const colorMapSKU = useMemo(() => {
    const unicos = _.uniq(lx02.map(p => p.Material));
    const map = {};
    unicos.forEach((mat, i) => { map[mat] = COLORES_SKU[i % COLORES_SKU.length]; });
    return map;
  }, [lx02]);

  const KPIs = useMemo(() => {
    const totalPosiciones = maestro.length;
    const ocupadas = new Set(lx02.map(p => p.Ubicacion)).size;
    const libres = totalPosiciones - ocupadas;
    const tasa = totalPosiciones > 0 ? ((ocupadas / totalPosiciones) * 100).toFixed(1) : 0;
    const totalUnidades = _.sumBy(lx02, p => parseFloat(p.Cantidad_Total?.toString().replace(',', '.') || 0));
    return { totalPosiciones, ocupadas, libres, tasa, totalUnidades };
  }, [maestro, lx02]);

  return (
    <div className="h-screen bg-[#020617] text-white flex flex-col overflow-hidden font-sans relative">
      
      {/* HEADER CORPORATIVO: COPEC & EXXONMOBIL */}
      <header className="bg-slate-900/90 backdrop-blur-md p-4 lg:p-5 flex justify-between items-center border-b-2 border-blue-600/50 shadow-[0_4px_30px_rgba(37,99,235,0.15)] shrink-0 z-10">
        <div className="flex items-center gap-6">
          {/* ZONA DE LOGOS (Placeholder listos para reemplazar con imágenes reales) */}
          <div className="flex gap-3 border-r border-slate-700 pr-6">
             {/* Para usar logos reales, borra el texto y usa: <img src="/logo-copec.png" className="h-8" /> */}
             <div className="h-8 px-3 bg-white rounded flex items-center justify-center text-blue-700 font-black tracking-tighter text-sm italic">COPEC</div>
             <div className="h-8 px-3 bg-white rounded flex items-center justify-center text-red-600 font-black tracking-tighter text-sm">ExxonMobil</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg"><Factory className="text-white" size={24} /></div>
            <div>
              <h1 className="font-black text-xl lg:text-2xl tracking-tighter uppercase flex items-center gap-2">
                LUB-AI <span className="font-light text-blue-400">PLANT</span>
              </h1>
              <p className="text-[9px] lg:text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Digital Twin & Logistics Engine</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
            <label className={`cursor-pointer px-4 lg:px-6 py-2.5 rounded-xl text-xs font-black tracking-widest transition-all ${maestro.length ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'}`}>
                {maestro.length ? 'MAESTRO OK' : '1. SUBIR MAESTRO'}
                <input type="file" className="hidden" onChange={parseMaestro} accept=".csv" />
            </label>
            <label className={`cursor-pointer px-4 lg:px-6 py-2.5 rounded-xl text-xs font-black tracking-widest transition-all ${lx02.length ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]'}`}>
                {lx02.length ? 'LX02 OK' : '2. SUBIR LX02'}
                <input type="file" className="hidden" onChange={parseLx02} accept=".csv" />
            </label>
        </div>
      </header>

      <div className="flex-1 relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#020617] to-black overflow-hidden">
        
        {maestro.length > 0 && lx02.length > 0 && (
          <>
            {/* SWITCH CENTRAL ESTILO CORPORATIVO */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex bg-slate-900/80 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-700/50 shadow-2xl">
                <button onClick={() => setVista('3d')} className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${vista === '3d' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:text-white'}`}>Planta 3D</button>
                <button onClick={() => setVista('ai')} className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${vista === 'ai' ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'text-slate-400 hover:text-white'}`}>
                    <BrainCircuit size={16}/> LUB-AI ({aiInsights.length})
                </button>
            </div>

            {vista === '3d' ? (
                <>
                    {/* RADAR INMERSIVO */}
                    <div className="absolute top-6 left-6 z-20 w-80">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors" size={20} />
                            <input type="text" placeholder="Buscar SKU o Lote..." className="w-full bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-2xl pl-12 pr-6 py-3.5 text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-xl" onChange={(e) => setTerminoBusqueda(e.target.value)} />
                        </div>
                    </div>

                    {/* DASHBOARD KPIs */}
                    <div className="absolute top-6 right-6 z-20 bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-2xl w-64">
                        <h2 className="flex items-center gap-2 text-blue-400 font-black uppercase text-xs tracking-widest mb-5"><BarChart3 size={16}/> Status Operativo</h2>
                        <div className="mb-5">
                            <div className="flex justify-between text-xs font-bold text-slate-400 mb-2"><span>Ocupación Neta</span><span className="text-white">{KPIs.tasa}%</span></div>
                            <div className="w-full bg-slate-800 rounded-full h-2"><div className="bg-gradient-to-r from-blue-600 to-blue-400 h-2 rounded-full" style={{ width: `${KPIs.tasa}%` }}></div></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50"><CheckSquare size={16} className="text-emerald-400 mb-1"/><p className="text-xl font-black">{KPIs.libres}</p><p className="text-[8px] uppercase font-bold text-slate-500 tracking-wider">Pos. Libres</p></div>
                            <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50"><Box size={16} className="text-blue-400 mb-1"/><p className="text-xl font-black">{KPIs.ocupadas}</p><p className="text-[8px] uppercase font-bold text-slate-500 tracking-wider">Pos. Ocupadas</p></div>
                        </div>
                    </div>

                    {/* FILTROS COLOR */}
                    <div className="absolute bottom-8 left-6 z-20 bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50 shadow-xl">
                        <div className="flex items-center gap-2 mb-3"><Palette size={16} className="text-blue-400" /><span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Esquema Visual</span></div>
                        <div className="flex bg-slate-800/50 rounded-xl p-1">
                            <button onClick={() => setModoColor('sku')} className={`flex-1 py-1.5 px-4 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors ${modoColor === 'sku' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-500 hover:text-slate-300'}`}>Por SKU</button>
                            <button onClick={() => setModoColor('formato')} className={`flex-1 py-1.5 px-4 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors ${modoColor === 'formato' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-500 hover:text-slate-300'}`}>Formato</button>
                        </div>
                    </div>

                    <Warehouse3D maestro={maestro} lx02={lx02} modoColor={modoColor} colorMapSKU={colorMapSKU} onSelectPallet={setPalletSeleccionado} terminoBusqueda={terminoBusqueda} />

                    {/* TARJETA PALLET */}
                    {palletSeleccionado && (
                        <div className="absolute bottom-8 right-6 bg-slate-900/90 backdrop-blur-xl p-6 rounded-3xl border border-blue-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.5)] w-80 z-30 animate-fade-in">
                            <div className="flex justify-between items-center mb-5 border-b border-slate-700 pb-3">
                                <h3 className="font-black text-blue-400 tracking-widest text-sm flex items-center gap-2"><Target size={16}/> UBICACIÓN {palletSeleccionado.ubi.Ubicacion}</h3>
                                <X className="cursor-pointer text-slate-400 hover:text-white transition-colors" onClick={() => setPalletSeleccionado(null)} />
                            </div>
                            <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                {palletSeleccionado.pallets.map((p, i) => (
                                    <div key={i} className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/50 hover:border-blue-500/50 transition-colors">
                                        <p className="font-bold text-white text-xs leading-snug mb-2">{p.Descripcion}</p>
                                        <p className="text-[10px] text-blue-400 font-mono font-bold mb-3 tracking-wider">SKU: {p.Material}</p>
                                        <div className="flex justify-between items-end bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Lote</span>
                                                <span className="text-xs text-slate-300 font-mono">{p.Lote || 'N/A'}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-black text-xl text-emerald-400">{p.Cantidad_Total}</span>
                                                <span className="text-[10px] text-slate-500 font-bold ml-1">{p.Unidad}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                /* VISTA AI INSIGHTS */
                <div className="h-full pt-28 pb-8 px-8 overflow-y-auto w-full flex justify-center">
                    <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-5">
                            <h2 className="text-xl font-black mb-2 flex items-center gap-3 text-white uppercase tracking-widest"><BrainCircuit className="text-blue-400" size={28}/> Diagnóstico LUB-AI</h2>
                            
                            {aiInsights.map((insight, i) => (
                                <div key={i} className={`p-6 rounded-3xl border shadow-xl flex items-start gap-5 ${insight.bg} bg-opacity-[0.03] ${insight.nivel === 'CRÍTICO' ? 'border-red-500/30' : 'border-blue-500/30'} backdrop-blur-sm transition-transform hover:-translate-y-1`}>
                                    <div className={`p-4 rounded-2xl ${insight.bg} bg-opacity-20 ${insight.color} shadow-inner`}>{insight.icon}</div>
                                    <div className="flex-1">
                                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest ${insight.bg} text-white shadow-sm`}>{insight.tipo}</span>
                                        <h3 className="text-lg font-bold mt-3 text-white tracking-tight">{insight.titulo}</h3>
                                        <p className="text-slate-400 mt-2 text-sm leading-relaxed">{insight.mensaje}</p>
                                    </div>
                                    <div className="bg-slate-900/80 px-6 py-5 rounded-2xl text-center border border-slate-700/50 min-w-[220px] shadow-inner">
                                        <p className="text-[9px] text-slate-500 font-black uppercase mb-2 tracking-widest">Acción Recomendada</p>
                                        <p className={`font-black text-lg font-mono tracking-tight ${insight.nivel === 'CRÍTICO' ? 'text-red-400' : 'text-blue-400'}`}>{insight.accion}</p>
                                    </div>
                                </div>
                            ))}

                            {aiInsights.length === 0 && (
                                <div className="text-center p-12 border-2 border-dashed border-slate-700 rounded-3xl">
                                    <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
                                    <p className="text-xl font-bold text-white">Salud del Inventario: 100%</p>
                                    <p className="text-slate-400">La Planta está operando bajo estándares óptimos. No se detectan bloqueos ni quiebres.</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="bg-slate-800/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-2xl">
                                <h3 className="text-sm font-black flex items-center gap-2 mb-5 text-red-400 uppercase tracking-widest"><Lightbulb size={18}/> WMS Best Practices</h3>
                                <div className="space-y-4">
                                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                                        <p className="text-xs font-bold text-white mb-1.5 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> Regla del Picking</p>
                                        <p className="text-[11px] text-slate-400 leading-relaxed">Garantiza que los SKUs Clase A tengan SIEMPRE pallets disponibles en Nivel 1. El tiempo de grúa merma el rendimiento del equipo.</p>
                                    </div>
                                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                                        <p className="text-xs font-bold text-white mb-1.5 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> Doble Profundidad</p>
                                        <p className="text-[11px] text-slate-400 leading-relaxed">Evita colocar lotes distintos en el pasillo B (Doble). El LIFO forzado causará quiebres por vencimiento si no se rota el fondo.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}