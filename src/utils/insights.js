import _ from 'lodash';

export const generarInsights = (maestro, lx02) => {
  const insights = [];

  const invPorMaterial  = _.groupBy(lx02, 'material');
  const invPorUbicacion = _.groupBy(lx02, 'ubicacion');

  // ── COMPACTACIÓN: fragmentación espacial del mismo material ──────────────
  Object.entries(invPorMaterial).forEach(([material, pallets]) => {
    const parciales = pallets.filter(p => p.cantidad > 0 && p.cantidad < 100);
    if (parciales.length > 1) {
      const ordenados = _.orderBy(parciales, ['cantidad'], ['asc']);
      const ubiMenor  = ordenados[0];
      const ubiMayor  = ordenados[ordenados.length - 1];
      insights.push({
        tipo:     'COMPACTACIÓN',
        nivel:    'ALTO IMPACTO',
        titulo:   `Cuadratura de ${material}`,
        mensaje:  `LUB-AI detecta fragmentación espacial. Consolidar ${ubiMenor.cantidad} ${ubiMenor.unidad} desde [${ubiMenor.ubicacion}] hacia [${ubiMayor.ubicacion}] liberará 1 ubicación completa.`,
        accion:   `${ubiMenor.ubicacion} ➔ ${ubiMayor.ubicacion}`,
        iconType: 'target',
      });
    }
  });

  // ── RIESGO OPERATIVO: doble manejo en ubicaciones de doble profundidad ───
  maestro.forEach(ubi => {
    const palletsEnUbi = invPorUbicacion[ubi.ubicacion] || [];
    if (ubi.tipoUbi === 'Doble' && parseInt(ubi.posicion) === 1 && palletsEnUbi.length > 0) {
      const ubiFondo     = `${ubi.pasillo}-${String(ubi.rack).padStart(2, '0')}-${ubi.nivel}-2`;
      const palletsAtras = invPorUbicacion[ubiFondo] || [];
      if (palletsAtras.length > 0 && palletsEnUbi[0].material !== palletsAtras[0].material) {
        insights.push({
          tipo:     'RIESGO OPERATIVO',
          nivel:    'CRÍTICO',
          titulo:   `Doble Manejo Inminente en ${ubi.ubicacion}`,
          mensaje:  `El pallet de [${palletsEnUbi[0].material}] bloquea el acceso a [${palletsAtras[0].material}] en el fondo. Requiere reubicación preventiva.`,
          accion:   'Reubicar Frente',
          iconType: 'alert-octagon',
        });
      }
    }
  });

  return _.orderBy(insights, i => (i.nivel === 'CRÍTICO' ? 0 : 1));
};
