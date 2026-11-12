// Spec 038, RF-7 y RF-8: los sellos de las cartas ya armadas pasan a los nombres nuevos de rareza (E → UR en la Ultra
// Rare y LEG → SSR en la SSR). Un sello escrito a mano, distinto del de fábrica de su rareza, no se toca. Puro.
import type { Rarity } from "@/domain/catalog/card-rules";
import { isImageSeal, type LayersConfig } from "./layers";

const OLD_TO_NEW: Partial<Record<Rarity, [string, string]>> = { epic: ["E", "UR"], legendary: ["LEG", "SSR"] };

/** La configuración con el sello renombrado, o `null` si no hay nada que cambiar. */
export function renameSeal(config: LayersConfig | null, rarity: Rarity | null): LayersConfig | null {
  if (!config?.sello || isImageSeal(config.sello) || !rarity) return null;
  const pair = OLD_TO_NEW[rarity];
  if (!pair || config.sello.texto !== pair[0]) return null;
  return { ...config, sello: { ...config.sello, texto: pair[1] } };
}
