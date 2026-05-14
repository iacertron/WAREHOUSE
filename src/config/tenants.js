/**
 * @fileoverview Registro de tenants de LUB-AI Plant.
 *
 * REGLA: Los componentes nunca hardcodean URLs, nombres de columna
 * ni textos de marca. Todo viene del tenant activo.
 *
 * CÓMO ACTIVAR UN TENANT:
 *   1. Duplicar una entrada existente con nuevo id.
 *   2. Ajustar columnMap si el export SAP del cliente tiene nombres distintos.
 *   3. Cambiar ACTIVE_TENANT_ID a ese id.
 *   (Fase MVP: variable de entorno o cambio manual aquí)
 *
 * PRÓXIMO PASO (backend):
 *   Reemplazar TENANTS y ACTIVE_TENANT_ID por una llamada
 *   GET /api/tenants/me autenticada con JWT.
 *   El shape del objeto retornado debe ser idéntico a cada entrada aquí.
 */

// ---------------------------------------------------------------------------
// ID activo — único punto de cambio para alternar tenant en desarrollo
// ---------------------------------------------------------------------------
export const ACTIVE_TENANT_ID = 'copec_lub';

// ---------------------------------------------------------------------------
// Registro de tenants
// ---------------------------------------------------------------------------
const TENANTS = {
  copec_lub: {
    id: 'copec_lub',

    // --- Marca ---
    nombre:    'Copec Lubricantes',
    subtitulo: 'ExxonMobil Distribution Center',
    logos: [
      { texto: 'COPEC',     colorFondo: '#ffffff', colorTexto: '#1d4ed8' },
      { texto: 'ExxonMobil', colorFondo: '#ffffff', colorTexto: '#dc2626' },
    ],

    // --- Fuentes de datos (Google Sheets publicadas como CSV) ---
    urls: {
      maestro: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTb7DSkAa1tose_BdEn991i-yJ2szD_52iAgDbPA9I7c2NJ-YHTlrGh5_Ds1KXr__cbxeoqZuH2ih9P/pub?output=csv',
      lx02:    'https://docs.google.com/spreadsheets/d/e/2PACX-1vRvQfrHdm_x6L8pkWWRGAOTWMBfOs7p0SoLUcbx_2QUKmoweBdJ6hGOQErmfI-gkWofZnjUyVORevmR/pub?gid=673437504&single=true&output=csv',
    },

    /**
     * Mapping de columnas SAP → nombres canónicos internos.
     *
     * PROBLEMA QUE RESUELVE:
     * SAP EWM puede exportar "Ubicación" o "Ubicacion" según la
     * configuración de idioma/codificación del cliente.
     * Los parsers usan siempre el nombre canónico (lado derecho).
     * Nunca hacen fallback con || dentro del componente.
     *
     * CÓMO LEER:
     *   canonico: ['variante_cliente_1', 'variante_cliente_2', ...]
     * El parser toma la primera variante que encuentre en el CSV.
     */
    columnMap: {
      maestro: {
        ubicacion:      ['Ubicación', 'Ubicacion'],
        tipoUbicacion:  ['Tipo de ubicació', 'Tipo de ubicación', 'Tipo de Ubicacion'],
        bloqueoSalida:  ['Bloqueo de salid', 'Bloqueo de salida'],
        bloqueoEntrada: ['Bloqueo de entradas', 'Bloqueo de entrada'],
      },
      lx02: {
        ubicacion:      ['Ubicación', 'Ubicacion'],
        material:       ['Material'],
        descripcion:    ['Texto breve de n', 'Descripcion', 'Descripción'],
        lote:           ['Lote'],
        cantidad:       ['Stock disponible', 'Cantidad_Total'],
        unidad:         ['Unidad medida b', 'Unidad', 'UMB'],
      },
    },

    // --- Reglas operativas del tenant ---
    reglas: {
      /**
       * Tipos de ubicación que el sistema debe incluir.
       * Filtra el maestro antes de renderizar.
       */
      tiposUbicacionValidos: ['U1', 'U2'],

      /**
       * Capacidad máxima de pallets por posición.
       * Usado por insightsEngine para detectar sobreocupación.
       */
      capacidadMaximaPorPosicion: 1,
    },
  },

  // ---------------------------------------------------------------------------
  // TEMPLATE para segundo cliente (descomentar y completar cuando corresponda)
  // ---------------------------------------------------------------------------
  // cliente_b: {
  //   id: 'cliente_b',
  //   nombre: 'Distribuidora XYZ',
  //   subtitulo: 'Centro de Distribución Norte',
  //   logos: [],
  //   urls: {
  //     maestro: 'URL_MAESTRO_CLIENTE_B',
  //     lx02:    'URL_LX02_CLIENTE_B',
  //   },
  //   columnMap: {
  //     maestro: {
  //       ubicacion:      ['Storage Bin'],        // SAP en inglés
  //       tipoUbicacion:  ['Storage Type'],
  //       bloqueoSalida:  ['Outbound Blocked'],
  //       bloqueoEntrada: ['Inbound Blocked'],
  //     },
  //     lx02: {
  //       ubicacion:      ['Storage Bin'],
  //       material:       ['Material'],
  //       descripcion:    ['Material Description'],
  //       lote:           ['Batch'],
  //       cantidad:       ['Available Stock'],
  //       unidad:         ['Unit of Measure'],
  //     },
  //   },
  //   reglas: {
  //     tiposUbicacionValidos: ['U1', 'U2'],
  //     capacidadMaximaPorPosicion: 2,
  //   },
  // },
};

// ---------------------------------------------------------------------------
// Exportación del tenant activo — único import que usan los hooks y parsers
// ---------------------------------------------------------------------------
export const tenant = TENANTS[ACTIVE_TENANT_ID];

// Falla rápido en desarrollo si el ID está mal configurado
if (!tenant) {
  throw new Error(
    `[tenants.js] ACTIVE_TENANT_ID="${ACTIVE_TENANT_ID}" no existe en el registro. ` +
    `IDs disponibles: ${Object.keys(TENANTS).join(', ')}`
  );
}
