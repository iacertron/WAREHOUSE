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

// ---------------------------------------------
