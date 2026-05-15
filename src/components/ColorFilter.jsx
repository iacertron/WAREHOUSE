import React from 'react';
import { Palette } from 'lucide-react';

const MODOS = [
  { id: 'sku', label: 'Por SKU' },
  { id: 'formato', label: 'Formato' },
];

export default function ColorFilter({ modoColor, onChange }) {
  return (
    <div className="absolute bottom-8 left-6 z-20 bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50 shadow-xl">
      <div className="flex items-center gap-2 mb-3">
        <Palette size={16} className="text-blue-400" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Esquema Visual</span>
      </div>
      <div className="flex bg-slate-800/50 rounded-xl p-1">
        {MODOS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex-1 py-1.5 px-4 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors ${
              modoColor === id
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
