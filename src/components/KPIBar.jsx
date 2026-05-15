import React from 'react';
import { BarChart3, CheckSquare, Box } from 'lucide-react';

export default function KPIBar({ kpis }) {
  return (
    <div className="absolute top-6 right-6 z-20 bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-2xl w-64">
      <h2 className="flex items-center gap-2 text-blue-400 font-black uppercase text-xs tracking-widest mb-5">
        <BarChart3 size={16} /> Status Operativo
      </h2>
      <div className="mb-5">
        <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
          <span>Ocupación Neta</span>
          <span className="text-white">{kpis.tasa}%</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-600 to-blue-400 h-2 rounded-full transition-all duration-700"
            style={{ width: `${kpis.tasa}%` }}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
          <CheckSquare size={16} className="text-emerald-400 mb-1" />
          <p className="text-xl font-black">{kpis.libres}</p>
          <p className="text-[8px] uppercase font-bold text-slate-500 tracking-wider">Pos. Libres</p>
        </div>
        <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
          <Box size={16} className="text-blue-400 mb-1" />
          <p className="text-xl font-black">{kpis.ocupadas}</p>
          <p className="text-[8px] uppercase font-bold text-slate-500 tracking-wider">Pos. Ocupadas</p>
        </div>
      </div>
    </div>
  );
}
