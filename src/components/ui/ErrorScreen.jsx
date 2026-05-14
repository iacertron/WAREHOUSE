/**
 * @fileoverview Pantalla de error de red.
 * Se muestra cuando useWarehouseData retorna errorRed !== null.
 *
 * @param {Object}   props
 * @param {string}   props.mensaje  - Texto de error desde useWarehouseData
 * @param {Function} props.onRetry  - Callback que llama recargar()
 */

import { AlertOctagon } from 'lucide-react';

const ErrorScreen = ({ mensaje, onRetry }) => {
  return (
    <div className="h-screen bg-[#020617] flex flex-col items-center justify-center gap-6 p-8">
      <AlertOctagon size={56} className="text-red-500" />
      <div className="text-center max-w-md">
        <p className="text-2xl font-black text-white uppercase tracking-widest mb-3">
          Error de Conexión
        </p>
        <p className="text-slate-400 text-sm leading-relaxed">
          {mensaje}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black rounded-xl transition-all uppercase tracking-widest text-sm"
      >
        Reintentar
      </button>
    </div>
  );
};

export default ErrorScreen;
