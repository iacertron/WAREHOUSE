import React, { useState, useCallback, useEffect } from 'react';
import { BrainCircuit } from 'lucide-react';
import { useWarehouseData } from './hooks/useWarehouseData';
import Header from './components/Header';
import KPIBar from './components/KPIBar';
import SearchPanel from './components/SearchPanel';
import ColorFilter from './components/ColorFilter';
import PalletDetail from './components/PalletDetail';
import InsightsPanel from './components/InsightsPanel';
import Warehouse3D from './components/Warehouse3D';

export default function App() {
  const { maestro, lx02, aiInsights, colorMapSKU, kpis, errors, modoConexion, cargarDesdeSheets, handleMaestroUpload, handleLx02Upload } = useWarehouseData();
  const [vista, setVista] = useState('3d');
  const [modoColor, setModoColor] = useState('sku');
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [palletSeleccionado, setPalletSeleccionado] = useState(null);

  useEffect(() => {
    cargarDesdeSheets();
  }, [cargarDesdeSheets]);

  const dataReady = maestro.length > 0 && lx02.length > 0;
  const handleSearch = useCallback((v) => setTerminoBusqueda(v), []);

  return (
    <div className="h-screen bg-[#020617] text-white flex flex-col overflow-hidden font-sans">
      <Header
        maestroLoaded={maestro.length > 0}
        lx02Loaded={lx02.length > 0}
        onMaestroUpload={handleMaestroUpload}
        onLx02Upload={handleLx02Upload}
        errors={errors}
      />

      <div className="flex-1 relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#020617] to-black overflow-hidden">
        {dataReady && (
          <>
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex bg-slate-900/80 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-700/50 shadow-2xl">
              <button
                onClick={() => setVista('3d')}
                className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${vista === '3d' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:text-white'}`}
              >
                Planta 3D
              </button>
              <button
                onClick={() => setVista('ai')}
                className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${vista === 'ai' ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'text-slate-400 hover:text-white'}`}
              >
                <BrainCircuit size={16} /> LUB-AI ({aiInsights.length})
              </button>
            </div>

            {vista === '3d' ? (
              <>
                <SearchPanel onSearch={handleSearch} />
                <KPIBar kpis={kpis} />
                <ColorFilter modoColor={modoColor} onChange={setModoColor} />
                <Warehouse3D
                  maestro={maestro}
                  lx02={lx02}
                  modoColor={modoColor}
                  colorMapSKU={colorMapSKU}
                  onSelectPallet={setPalletSeleccionado}
                  terminoBusqueda={terminoBusqueda}
                />
                <PalletDetail seleccionado={palletSeleccionado} onClose={() => setPalletSeleccionado(null)} />
              </>
            ) : (
              <InsightsPanel insights={aiInsights} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
