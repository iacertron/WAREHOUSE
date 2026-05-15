import React from 'react';
import { BrainCircuit, Target, AlertOctagon, Lightbulb, CheckCircle2 } from 'lucide-react';

const ICON_MAP = {
  target: <Target size={24} />,
  'alert-octagon': <AlertOctagon size={24} />,
};

const NIVEL_STYLE = {
  'CRÍTICO': { border: 'border-red-500/30', accent: 'text-red-400', bg: 'bg-red-600' },
  'ALTO IMPACTO': { border: 'border-blue-500/30', accent: 'text-blue-400', bg: 'bg-blue-600' },
};

function InsightCard({ insight }) {
  const style = NIVEL_STYLE[insight.nivel] ?? NIVEL_STYLE['ALTO IMPACTO'];
  return (
    <div className={`p-6 rounded-3xl border shadow-xl flex items-start gap-5 ${style.bg} bg-opacity-[0.03] ${style.border} backdrop-blur-sm transition-transform hover:-translate-y-1`}>
      <div className={`p-4 rounded-2xl ${style.bg} bg-opacity-20 ${style.accent} shadow-inner shrink-0`}>
        {ICON_MAP[insight.iconType]}
      </div>
      <div className="flex-1 min-w-0">
        <span className={`text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest ${style.bg} text-white shadow-sm`}>
          {insight.tipo}
        </span>
        <h3 className="text-lg font-bold mt-3 text-white tracking-tight">{insight.titulo}</h3>
        <p className="text-slate-400 mt-2 text-sm leading-relaxed">{insight.mensaje}</p>
      </div>
      <div className="bg-slate-900/80 px-6 py-5 rounded-2xl text-center border border-slate-700/50 min-w-[200px] shadow-inner shrink-0">
        <p className="text-[9px] text-slate-500 font-black uppercase mb-2 tracking-widest">Acción Recomendada</p>
        <p className={`font-black text-lg font-mono tracking-tight ${style.accent}`}>{insight.accion}</p>
      </div>
    </div>
  );
}

export default function InsightsPanel({ insights }) {
  return (
    <div className="h-full pt-28 pb-8 px-8 overflow-y-auto w-full flex justify-center">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-5">
          <h2 className="text-xl font-black mb-2 flex items-center gap-3 text-white uppercase tracking-widest">
            <BrainCircuit className="text-blue-400" size={28} /> Diagnóstico LUB-AI
          </h2>

          {insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}

          {insights.length === 0 && (
            <div className="text-center p-12 border-2 border-dashed border-slate-700 rounded-3xl">
              <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
              <p className="text-xl font-bold text-white">Salud del Inventario: 100%</p>
              <p className="text-slate-400 mt-2">La Planta está operando bajo estándares óptimos. No se detectan bloqueos ni quiebres.</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-slate-800/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-2xl">
            <h3 className="text-sm font-black flex items-center gap-2 mb-5 text-red-400 uppercase tracking-widest">
              <Lightbulb size={18} /> WMS Best Practices
            </h3>
            <div className="space-y-4">
              {[
                {
                  titulo: 'Regla del Picking',
                  desc: 'Garantiza que los SKUs Clase A tengan SIEMPRE pallets disponibles en Nivel 1. El tiempo de grúa merma el rendimiento del equipo.',
                },
                {
                  titulo: 'Doble Profundidad',
                  desc: 'Evita colocar lotes distintos en el pasillo B (Doble). El LIFO forzado causará quiebres por vencimiento si no se rota el fondo.',
                },
              ].map(({ titulo, desc }) => (
                <div key={titulo} className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                  <p className="text-xs font-bold text-white mb-1.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                    {titulo}
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
