// Spec 028, RF-11: probabilidad de que un sobre traiga al menos una carta de cada rareza, a partir de los pesos
// publicados de cada ranura (cada ranura se sortea por separado). No cuenta la garantía de mala suerte, que la página
// explica aparte. Puro.
import { RARITIES, type Rarity } from "./card-rules";
import type { Slot } from "./odds";

/** En porcentaje (0 a 100), por rareza. */
export function atLeastOneChance(slots: Partial<Slot>[]): Record<Rarity, number> {
  return Object.fromEntries(
    RARITIES.map((r) => {
      const none = slots.reduce((acc, s) => {
        const total = RARITIES.reduce((a, x) => a + (s[x] ?? 0), 0);
        return acc * (total > 0 ? 1 - (s[r] ?? 0) / total : 1);
      }, 1);
      return [r, (1 - none) * 100];
    }),
  ) as Record<Rarity, number>;
}
