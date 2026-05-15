import { useState, useMemo, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import { buildColorMapSKU } from '../utils/colorUtils';
import { generarInsights }  from '../utils/insights';
import { validateMaestro, validateLx02 } from '../utils/csvValidation';

const SHEETS = {
  maestro: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSqsoI7i5VSvo5K56Y-AA5YqAou2Qb180bzt_VOythYSqN0EMrEnjU-V8pX1lIHoo3TXDIMek8fhnVw/pub?output=csv&gid=788905090',
  lx02:    'https://docs.google.com/spreadsheets/d/e/2PACX-1vSgiXysbjz3Mhrm24_CAYA3KUJyBR0mnwsB-7I91Lt-1QewOaLOw29zsuY8IbTDsx-3IJFFwWExKwnk/pub?output=csv&gid=2043044951',
};

// Normaliza para comparacion: minusculas, sin tildes, sin espacios extra
const norm = (s) =>
  (s ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');

// Busca el valor de una columna tolerando variaciones de encoding/tilde
const makeGet = (row) => {
  const keys = Object.keys(row);
  return (...candidates) => {
    for (const c of candidates) {
      const nc = norm(c);
      const k  = keys.find(k => norm(k) === nc);
      if (k !== undefined) return row[k]?.trim() ?? '';
    }
    return '';
  };
};

const parseMaestroRow = (row) => {
  const get = makeGet(row);

  const ubicacion  = get('ubicacion');
  const tipoUbi    = get('tipo de ubicacion').toUpperCase();
  const blkSalida  = get('bloqueo de salidas', 'bloqueo de salida').toUpperCase();
  const blkEntrada = get('bloqueo de entradas', 'bloqueo de entrada').toUpperCase();

  const partes  = ubicacion.split('-');
  const pasillo = parseInt(partes[0]) || 0;
  const rack    = parseInt(partes[1]) || 0;
  const nivel   = parseInt(partes[2]) || 0;

  return {
    ubicacion,
    pasillo,
    rack,
    nivel,
    tipoUbi,
    valida: pasillo > 0 &&
            ['U1', 'U2'].includes(tipoUbi) &&
            blkSalida  !== 'X' &&
            blkEntrada !== 'X',
  };
};

const parseLx02Row = (row) => {
  const get = makeGet(row);

  const material = get('material');
  if (!material) return null;

  const cantidadStr = get('stock disponible', 'cantidad_total')
    .replace(/\./g, '').replace(',', '.');

  return {
    ubicacion:   get('ubicacion'),
    material,
    descripcion: get('texto breve de material', 'descripcion'),
    lote:        get('lote'),
    cantidad:    parseFloat(cantidadStr) || 0,
    unidad:      get('unidad medida base', 'unidad') || 'UN',
    tipoUbi:     get('tipo de ubicacion').toUpperCase(),
  };
};

export function useWarehouseData() {
  const [maestro,      setMaestro]      = useState([]);
  const [lx02,         setLx02]         = useState([]);
  const [aiInsights,   setAiInsights]   = useState([]);
  const [errors,       setErrors]       = useState({ maestro: null, lx02: null });
  const [modoConexion, setModoConexion] = useState('idle');

  const maestroRef = useRef([]);

  const commitMaestro = useCallback((rows) => {
    const parsed = rows.map(parseMaestroRow).filter(r => r.valida);
    maestroRef.current = parsed;
    setMaestro(parsed);
    setErrors(prev => ({ ...prev, maestro: null }));
  }, []);

  const commitLx02 = useCallback((rows) => {
    const parsed = rows.map(parseLx02Row).filter(Boolean);
    setLx02(parsed);
    setAiInsights(generarInsights(maestroRef.current, parsed));
    setErrors(prev => ({ ...prev, lx02: null }));
  }, []);

  const cargarDesdeSheets = useCallback(() => {
    setModoConexion('loading');
    setErrors({ maestro: null, lx02: null });

    Papa.parse(SHEETS.maestro, {
      download: true, header: true, skipEmptyLines: true,
      error: () => {
        setErrors(prev => ({ ...prev, maestro: 'No se pudo conectar. Usa carga manual.' }));
        setModoConexion('error');
      },
      complete: (res) => {
        const err = validateMaestro(res.data);
        if (err) { setErrors(prev => ({ ...prev, maestro: err })); setModoConexion('error'); return; }
        commitMaestro(res.data);

        Papa.parse(SHEETS.lx02, {
          download: true, header: true, skipEmptyLines: true,
          error: () => {
            setErrors(prev => ({ ...prev, lx02: 'No se pudo conectar. Usa carga manual.' }));
            setModoConexion('error');
          },
          complete: (res2) => {
            const err2 = validateLx02(res2.data);
            if (err2) { setErrors(prev => ({ ...prev, lx02: err2 })); setModoConexion('error'); return; }
            commitLx02(res2.data);
            setModoConexion('ready');
          },
        });
      },
    });
  }, [commitMaestro, commitLx02]);

  const handleMaestroUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const err = validateMaestro(res.data);
        if (err) { setErrors(prev => ({ ...prev, maestro: err })); return; }
        commitMaestro(res.data);
      },
    });
  }, [commitMaestro]);

  const handleLx02Upload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const err = validateLx02(res.data);
        if (err) { setErrors(prev => ({ ...prev, lx02: err })); return; }
        commitLx02(res.data);
      },
    });
  }, [commitLx02]);

  const colorMapSKU = useMemo(() => buildColorMapSKU(lx02), [lx02]);

  const kpis = useMemo(() => {
    const totalPosiciones = maestro.length;
    const ocupadas        = new Set(lx02.map(p => p.ubicacion)).size;
    const libres          = totalPosiciones - ocupadas;
    const tasa            = totalPosiciones > 0
      ? ((ocupadas / totalPosiciones) * 100).toFixed(1) : 0;
    const totalUnidades   = _.sumBy(lx02, p => p.cantidad);
    return { totalPosiciones, ocupadas, libres, tasa, totalUnidades };
  }, [maestro, lx02]);

  return {
    maestro, lx02, aiInsights, colorMapSKU, kpis, errors,
    modoConexion, cargarDesdeSheets,
    handleMaestroUpload, handleLx02Upload,
  };
}