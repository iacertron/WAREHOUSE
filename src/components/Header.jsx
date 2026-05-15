import React, { useState, useEffect, useRef } from 'react';
import { Factory, ChevronDown, FileDown } from 'lucide-react';
import { downloadMaestroTemplate, downloadLx02Template } from '../utils/templateDownload';

export default function Header({ maestroLoaded, lx02Loaded, onMaestroUpload, onLx02Upload, errors }) {
  const [showTemplates, setShowTemplates] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowTemplates(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-slate-900/90 backdrop-blur-md p-4 lg:p-5 flex justify-between items-center border-b-2 border-blue-600/50 shadow-[0_4px_30px_rgba(37,99,235,0.15)] shrink-0 z-10">
      <div className="flex items-center gap-6">
        <div className="flex gap-3 border-r border-slate-700 pr-6">
          <div className="h-8 px-3 bg-white rounded flex items-center justify-center text-blue-700 font-black tracking-tighter text-sm italic">COPEC</div>
          <div className="h-8 px-3 bg-white rounded flex items-center justify-center text-red-600 font-black tracking-tighter text-sm">ExxonMobil</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg">
            <Factory className="text-white" size={24} />
          </div>
          <div>
            <h1 className="font-black text-xl lg:text-2xl tracking-tighter uppercase flex items-center gap-2">
              LUB-AI <span className="font-light text-blue-400">PLANT</span>
            </h1>
            <p className="text-[9px] lg:text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Digital Twin & Logistics Engine</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 items-start">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowTemplates(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black tracking-widest bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all"
          >
            <FileDown size={14} /> PLANTILLAS SAP <ChevronDown size={12} className={`transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
          </button>
          {showTemplates && (
            <div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 w-64 overflow-hidden">
              <div className="p-3 border-b border-slate-700">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Exportar desde SAP</p>
                <p className="text-[9px] text-slate-500 mt-0.5">Transacciones: <span className="text-blue-400 font-mono">LX02</span> / <span className="text-blue-400 font-mono">MB52</span></p>
              </div>
              <button
                onClick={() => { downloadMaestroTemplate(); setShowTemplates(false); }}
                className="w-full text-left px-4 py-3 text-xs text-slate-300 hover:bg-slate-700 hover:text-white font-bold transition-colors border-b border-slate-700/50"
              >
                Plantilla MAESTRO_ubicaciones.csv
                <p className="text-[9px] text-slate-500 font-normal mt-0.5">Columnas: Pasillo, Rack, Nivel, Posicion...</p>
              </button>
              <button
                onClick={() => { downloadLx02Template(); setShowTemplates(false); }}
                className="w-full text-left px-4 py-3 text-xs text-slate-300 hover:bg-slate-700 hover:text-white font-bold transition-colors"
              >
                Plantilla LX02_inventario.csv
                <p className="text-[9px] text-slate-500 font-normal mt-0.5">Columnas: Material, Descripcion, Cantidad...</p>
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className={`cursor-pointer px-4 lg:px-6 py-2.5 rounded-xl text-xs font-black tracking-widest transition-all ${maestroLoaded ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'}`}>
            {maestroLoaded ? '✓ MAESTRO OK' : '1. SUBIR MAESTRO'}
            <input type="file" className="hidden" onChange={onMaestroUpload} accept=".csv" />
          </label>
          {errors.maestro && <p className="text-[9px] text-red-400 font-bold px-1 max-w-[180px]">{errors.maestro}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className={`cursor-pointer px-4 lg:px-6 py-2.5 rounded-xl text-xs font-black tracking-widest transition-all ${lx02Loaded ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]'}`}>
            {lx02Loaded ? '✓ LX02 OK' : '2. SUBIR LX02'}
            <input type="file" className="hidden" onChange={onLx02Upload} accept=".csv" />
          </label>
          {errors.lx02 && <p className="text-[9px] text-red-400 font-bold px-1 max-w-[180px]">{errors.lx02}</p>}
        </div>
      </div>
    </header>
  );
}
