const downloadCSV = (filename, rows) => {
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const downloadMaestroTemplate = () => {
  downloadCSV('plantilla_MAESTRO_ubicaciones.csv', [
    ['Pasillo', 'Rack', 'Nivel', 'Posicion', 'Tipo_Profundidad', 'Ubicacion'],
    ['A', '1', '1', '1', 'Simple', 'A-01-1-1'],
    ['A', '1', '1', '2', 'Simple', 'A-01-1-2'],
    ['B', '1', '1', '1', 'Doble', 'B-01-1-1'],
    ['B', '1', '1', '2', 'Doble', 'B-01-1-2'],
    ['C', '1', '1', '1', 'Simple', 'C-01-1-1'],
    ['C', '1', '2', '1', 'Simple', 'C-01-2-1'],
  ]);
};

export const downloadLx02Template = () => {
  downloadCSV('plantilla_LX02_inventario.csv', [
    ['Material', 'Descripcion', 'Cantidad_Total', 'Unidad', 'Lote', 'Ubicacion'],
    ['MATX001', 'BIN 1040L ACEITE PREMIUM 80W', '500', 'UN', 'LOTE-001', 'A-01-1-1'],
    ['MATY002', 'TAMBOR 208L GRASA INDUSTRIAL', '100', 'UN', 'LOTE-002', 'B-01-1-1'],
    ['MATZ003', 'BALDE 19L ACEITE MOTOR 5W30', '80', 'UN', 'LOTE-003', 'C-01-1-1'],
    ['MATA004', 'CAJA 5L ACEITE SINTETICO', '45', 'UN', 'LOTE-004', 'A-01-2-1'],
    ['MATB005', 'CAJA 1L LUBRICANTE ESPECIAL', '20', 'UN', 'LOTE-005', 'C-01-2-1'],
  ]);
};
