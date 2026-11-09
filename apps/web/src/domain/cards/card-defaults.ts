// Spec 028: valores con los que nace o se re-estila una carta por capas (sello de texto y grosor del borde). Un solo
// sitio para los de fábrica; los del panel (RF-15) se guardan en los ajustes y, si faltan o no valen, valen estos. Puro.
// Sin zod (spec 031): lo importan componentes del navegador; el esquema va en `card-defaults-schema.ts`.

/** RF-1: tamaño del sello de texto de toda carta nueva (antes 10 a 14 según la rareza). */
export const DEFAULT_SEAL_SIZE = 15;
/** RF-1 y RF-4: grosor del borde del marco, en % del ancho de la carta (antes el de su escalón). */
export const DEFAULT_BORDER = 3;
/** RF-15: lo que admite el panel (los mismos límites que la configuración guardada). */
export const SEAL_SIZE_RANGE = { min: 4, max: 40 } as const;
export const BORDER_SETTING_RANGE = { min: 0, max: 8 } as const;

export interface CardDefaults {
  sealSize: number;
  border: number;
}

export const FACTORY_CARD_DEFAULTS: CardDefaults = { sealSize: DEFAULT_SEAL_SIZE, border: DEFAULT_BORDER };

/**
 * RF-6: grosor con el que se veía cada marco sin borde guardado antes de esta spec (los de `MARCOS` de carta-capas.js;
 * el personalizado usaba 2,2). La migración 0021 lo escribe en las cartas ya guardadas para que no cambien.
 */
export const LEGACY_FRAME_BORDER = { n: 1.9, r: 2.9, sr: 3.3, ssr: 4.3, ur: 4.8, personalizado: 2.2 } as const;
