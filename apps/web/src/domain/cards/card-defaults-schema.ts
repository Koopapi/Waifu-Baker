// Spec 028, RF-15: validación de los valores por defecto guardados en los ajustes. Separada de `card-defaults.ts` (spec
// 031) para que los componentes del navegador que solo usan los valores no descarguen zod.
import { z } from "zod";
import { BORDER_SETTING_RANGE, FACTORY_CARD_DEFAULTS, SEAL_SIZE_RANGE, type CardDefaults } from "./card-defaults";

export const cardDefaultsSchema = z.object({
  sealSize: z.number().finite().min(SEAL_SIZE_RANGE.min).max(SEAL_SIZE_RANGE.max),
  border: z.number().finite().min(BORDER_SETTING_RANGE.min).max(BORDER_SETTING_RANGE.max),
});

/** Lo guardado en los ajustes, o los de fábrica si falta o no es válido. */
export function parseCardDefaults(value: unknown): CardDefaults {
  const r = cardDefaultsSchema.safeParse(value);
  return r.success ? r.data : { ...FACTORY_CARD_DEFAULTS };
}
