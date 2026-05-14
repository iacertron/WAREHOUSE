/**
 * @fileoverview Motor de diagnóstico logístico para LUB-AI Plant.
 *
 * REGLA: Funciones puras sin JSX ni imports de React.
 * Entrada → array de insights. Sin efectos secundarios.
 *
 * CONTRATO DE TIPOS:
 * Consume MaestroRow[] y Lx02Row[] (definidos en parsers.js).
 * Retorna Insight[] ordenado por criticidad.
 *
 * EXTENSIÓN MULTITENANT:
 * Las reglas operativas (capacidad por posición, tipos válidos)
 * se leen desde tenant.reglas — nunca hardcodeadas aquí.
 */

import _ from 'lodash';
import { tenant } from '../config/tenants';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/**
 * @typedef {'CRÍTICO'|'ALTO_IMPACTO'} NivelInsight
 *
 * @typedef {Object} Insight
 * @property {string}       tipo     - Categoría operativa (ej: 'COMPACTACIÓN')
 * @property {NivelInsight} nivel
 * @property {string}       titulo
 * @property {string}       mensaje
 * @property {string}       accion   - Texto corto para el panel de acción
 */

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/**
 * Construye índices de lookup para evitar O(n²) en los detectores.
 * Se llama una vez por ejecución de generarInsights.
 *
 * @param {import('./parsers').MaestroRow[]} maestro
 * @param {import('./parsers').Lx02Row[]}    lx02
 */
const buildIndices = (maestro, lx02) => ({
  porUbicacion:  _.groupBy(lx02,    'ubicacion'),
  porMaterial:   _.groupBy(lx02,    'material'),
  maestroPorUbi: _.keyBy(maestro,   'ubicacion'),
});

// ---------------------------------------------------------------------------
// Detector 1 — Fragmentación espacial (compactación posible)
// ---------------------------------------------------------------------------

/**
 * Detecta materiales con múltiples posiciones de stock parcial
 * que podrían consolidarse liberando ubicaciones.
 *
 * Umbral de "parcial": cantidad < capacidadMaximaPorPosicion * 100
 * (proxy razonable hasta tener capacidad real por SKU en el maestro)
 *
 * @param {ReturnType<typeof buildIndices>} indices
 * @returns {Insight[]}
 */
const detectarFragmentacion = ({ porMaterial }) => {
  const { capacidadMaximaPorPosicion } = tenant.reglas;
  const umbralParcial = capacidadMaximaPorPosicion * 100;
  const insights = [];

  Object.entries(porMaterial).forEach(([material, pallets]) => {
    const parciales = pallets.filter(
      (p) => p.cantidad > 0 && p.cantidad < umbralParcial
    );

    if (parciales.length < 2) return;

    const ordenados  = _.orderBy(parciales, ['cantidad'], ['asc']);
    const ubiMenor   = ordenados[0];
    const ubiMayor   = ordenados[ordenados.length - 1];
    const liberables = ordenados.length - 1;

    insights.push({
      tipo:    'COMPACTACIÓN',
      nivel:   'ALTO_IMPACTO',
      titulo:  `Fragmentación de ${material}`,
      mensaje:
        `LUB-AI detecta ${parciales.length} posiciones con stock parcial del mismo SKU. ` +
        `Consolidar ${ubiMenor.cantidad} ${ubiMenor.unidad} desde [${ubiMenor.ubicacion}] ` +
        `hacia [${ubiMayor.ubicacion}] liberaría ${liberables} ubicación${liberables > 1 ? 'es' : ''}.`,
      accion: `${ubiMenor.ubicacion} ➔ ${ubiMayor.ubicacion}`,
    });
  });

  return insights;
};

// ---------------------------------------------------------------------------
// Detector 2 — Doble manejo U1/U2 (bloqueo frente-fondo)
// ---------------------------------------------------------------------------

/**
 * Detecta posiciones U1 ocupadas por un SKU diferente al U2 del mismo slot,
 * lo que fuerza un doble movimiento de grúa para acceder al fondo.
 *
 * Condición: mismo pasillo + rack + nivel, tipoUbi U1 vs U2, SKUs distintos.
 *
 * @param {import('./parsers').MaestroRow[]} maestro
 * @param {ReturnType<typeof buildIndices>} indices
 * @returns {Insight[]}
 */
const detectarDobleManejo = (maestro, { porUbicacion }) => {
  const insights = [];

  const posicionesU1 = maestro.filter((m) => m.tipoUbi === 'U1');

  posicionesU1.forEach((u1) => {
    const palletsFrente = porUbicacion[u1.ubicacion];
    if (!palletsFrente?.length) return;

    // Busca el U2 correspondiente al mismo slot físico
    const u2 = maestro.find(
      (m) =>
        m.pasillo === u1.pasillo &&
        m.rack    === u1.rack    &&
        m.nivel   === u1.nivel   &&
        m.tipoUbi === 'U2'
    );
    if (!u2) return;

    const palletsFondo = porUbicacion[u2.ubicacion];
    if (!palletsFondo?.length) return;

    const skuFrente = palletsFrente[0].material;
    const skuFondo  = palletsFondo[0].material;
    if (skuFrente === skuFondo) return; // mismo SKU = sin riesgo

    insights.push({
      tipo:    'RIESGO OPERATIVO',
      nivel:   'CRÍTICO',
      titulo:  `Doble Manejo Inminente en ${u1.ubicacion}`,
      mensaje:
        `[${skuFrente}] en frente (${u1.ubicacion}) bloquea el acceso a ` +
        `[${skuFondo}] en fondo (${u2.ubicacion}). ` +
        `Cualquier picking del fondo requiere mover primero el pallet del frente.`,
      accion: `Reubicar ${u1.ubicacion}`,
    });
  });

  return insights;
};

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Ejecuta todos los detectores y retorna insights ordenados por criticidad.
 * CRÍTICO primero, ALTO_IMPACTO después.
 *
 * @param {import('./parsers').MaestroRow[]} maestro
 * @param {import('./parsers').Lx02Row[]}    lx02
 * @returns {Insight[]}
 */
export const generarInsights = (maestro, lx02) => {
  if (!maestro.length || !lx02.length) return [];

  const indices = buildIndices(maestro, lx02);

  const todos = [
    ...detectarDobleManejo(maestro, indices),
    ...detectarFragmentacion(indices),
  ];

  return _.orderBy(todos, (i) => (i.nivel === 'CRÍTICO' ? 0 : 1));
};
