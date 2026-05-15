import _ from 'lodash';
import { COLORES_SKU, COLORES_FORMATO } from '../constants/warehouse';

export const getFormato = (descripcion) => {
  if (!descripcion) return 'OTRO';
  const desc = descripcion.toLowerCase();
  if (/1040\s*l/i.test(desc)) return 'BIN (1040L)';
  if (/208\s*l/i.test(desc)) return 'TAMBOR (208L)';
  if (/19\s*l/i.test(desc)) return 'BALDE (19L)';
  if (/5\s*l/i.test(desc)) return 'CAJA 5L';
  if (/4\s*l/i.test(desc)) return 'CAJA 4L';
  if (/1\s*l/i.test(desc)) return 'CAJA 1L';
  return 'OTRO';
};

export const buildColorMapSKU = (lx02) => {
  const unicos = _.uniq(lx02.map(p => p.material));
  return Object.fromEntries(unicos.map((mat, i) => [mat, COLORES_SKU[i % COLORES_SKU.length]]));
};

export const getColorCarga = (palletsEnUbi, modoColor, colorMapSKU) => {
  if (modoColor === 'formato') {
    const formato = getFormato(palletsEnUbi[0].descripcion);
    return COLORES_FORMATO[formato] ?? COLORES_FORMATO['OTRO'];
  }
  const skus = _.uniq(palletsEnUbi.map(p => p.material));
  return skus.length > 1 ? '#ffffff' : colorMapSKU[skus[0]];
};
