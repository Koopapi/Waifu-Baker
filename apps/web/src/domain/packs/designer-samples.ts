// Spec 030, RF-3 y spec 039, RF-13, RF-15 y RF-16: las cartas de muestra de «Probar apertura» en el diseñador de
// sobres. Regla pura.
import type { Rarity } from "@/domain/catalog/card-rules";
import { adminCardView } from "@/domain/cards/admin-card";
import type { LayersConfig } from "@/domain/cards/layers";
import type { LiveCard } from "@/domain/cards/live";
import { PACK_SAMPLE_CARD } from "./example";

export interface SampleCard {
  image: string;
  rarity: Rarity;
  name: string;
  /** La imagen es arte suelto (la carta de muestra del paquete), no una carta compuesta. */
  raw?: boolean;
  /** Spec 039, RF-13: la carta viva del armador; sin ella, la imagen fija (RF-15). */
  live?: LiveCard | null;
}

export interface SampleSource {
  name: string | null;
  rarity: Rarity | null;
  layers: LayersConfig | null;
  keyMid: string | null;
  keyHoloMid: string | null;
}

const MAX_SAMPLES = 15;
const EXAMPLE_RARITIES: Rarity[] = ["common", "rare", "rare", "epic", "legendary"];

/** Las cartas de la colección con rareza e imagen fija, en orden; sin ninguna, la carta de ejemplo del paquete (RF-16). */
export function designerSamples(cards: readonly SampleSource[], setCode: string): SampleCard[] {
  const own = cards
    .filter((c) => c.keyMid && c.rarity)
    .slice(0, MAX_SAMPLES)
    .map((c) => {
      const v = adminCardView({ rarity: c.rarity!, layers: c.layers, keyMid: c.keyMid!, keyHoloMid: c.keyHoloMid }, false);
      return { image: v.image, rarity: c.rarity!, name: c.name || setCode, live: v.live };
    });
  if (own.length > 0) return own;
  return EXAMPLE_RARITIES.map((rarity) => ({ image: `/api/admin/pack-example/${PACK_SAMPLE_CARD}`, rarity, name: "Yuki", raw: true }));
}
