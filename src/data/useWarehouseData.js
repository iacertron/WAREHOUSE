/**
 * @fileoverview Hook principal de datos para LUB-AI Plant.
 *
 * RESPONSABILIDAD ÚNICA:
 * Fetch → parse → estado. Nada más.
 * No contiene lógica de negocio ni JSX.
 *
 * EXPONE:
 *   maestro    {MaestroRow[]}  ubicaciones válidas del tenant
 *   lx02       {Lx02Row[]}     inventario SAP activo
 *   cargando   {boolean}
 *   errorRed   {string|null}
 *   recargar   {() => void}    función para refetch manual
 */

import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { tenant } from '../config/tenants';
import { parseMaestro, parseLx02 } from './parsers';

/**
 * @returns {{
 *   maestro:  import('./parsers').MaestroRow[],
 *   lx02:     import('./parsers').Lx02Row[],
 *   cargando: boolean,
 *   errorRed: string|null,
 *   recargar: () => void
 * }}
 */
const useWarehouseData = () => {
  const [maestro,  setMaestro]  = useState([]);
  const [lx02,     setLx02]     = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorRed, setErrorRed] = useState(null);

  // useCallback garantiza referencia estable para usarla en useEffect
  // y exponerla como `recargar` sin loops infinitos
  const recargar = useCallback(() => {
    setCargando(true);
    setErrorRed(null);

    // ── Paso 1: Maestro ────────────────────────────────────────────────────
    Papa.parse(tenant.urls.maestro, {
      download:       true,
      header:         true,
      skipEmptyLines: true,

      error: () => {
        setErrorRed(
          'Error de red al descargar Maestro. Verificá que el link sea público.'
        );
        setCargando(false);
      },

      complete: (resMaestro) => {
        const maestroParsed = parseMaestro(resMaestro.data);

        if (maestroParsed.length === 0) {
          setErrorRed(
            'El Maestro se descargó pero ninguna fila cumple el filtro ' +
            `${tenant.reglas.tiposUbicacionValidos.join('/')} sin bloqueos.`
          );
          setCargando(false);
          return;
        }

        setMaestro(maestroParsed);

        // ── Paso 2: LX02 (solo si Maestro OK) ─────────────────────────────
        Papa.parse(tenant.urls.lx02, {
          download:       true,
          header:         true,
          skipEmptyLines: true,

          error: () => {
            setErrorRed(
              'Error de red al descargar LX02. Verificá que el link sea público.'
            );
            setCargando(false);
          },

          complete: (resLx02) => {
            const lx02Parsed = parseLx02(resLx02.data);

            if (lx02Parsed.length === 0) {
              setErrorRed(
                'LX02 se descargó pero no se encontraron materiales válidos.'
              );
              setCargando(false);
              return;
            }

            setLx02(lx02Parsed);
            setCargando(false);
          },
        });
      },
    });
  }, []); // sin dependencias — tenant es módulo estático

  return { maestro, lx02, cargando, errorRed, recargar };
};

export default useWarehouseData;
