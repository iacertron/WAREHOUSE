/**
 * @fileoverview Pantalla de carga global.
 * Se muestra mientras useWarehouseData está fetching.
 */

import { RefreshCw } from 'lucide-react';
import { tenant } from '../../config/tenants';

const LoadingScreen = () => {
  return (
    <div className="h-screen bg-[#020617] flex flex-col items-center justify-center gap-6">
      <RefreshCw size={56} className="text-blue-400 animate-spin" />
      <div className="text-center">
        <p className="text-xl font-black text-white uppercase tracking-widest">
          Sincronizando con SAP
        </p>
        <p className="text-sm text-slate-400 mt-2 font-medium">
          {tenant.nombre} — {tenant.subtitulo}
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
