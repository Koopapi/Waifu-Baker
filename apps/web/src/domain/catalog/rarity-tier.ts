import type { Rarity } from "./card-rules";

/** Escalón visual de una rareza en la carta por capas: marco, partículas y sello. */
export type RarityTier = "n" | "r" | "sr" | "ssr" | "ur";

/**
 * Las seis rarezas del juego en los cinco escalones visuales. Común y poco común comparten el plateado (n); la
 * secreta es la única arcoíris (ur). Solo cambia cómo se ven: el sorteo y las probabilidades no dependen de esto.
 */
export const RARITY_TIER: Record<Rarity, RarityTier> = {
  common: "n",
  uncommon: "n",
  rare: "r",
  epic: "sr",
  legendary: "ssr",
  secret: "ur",
};

export const rarityTier = (r: Rarity | null | undefined): RarityTier => (r ? RARITY_TIER[r] : "n");
