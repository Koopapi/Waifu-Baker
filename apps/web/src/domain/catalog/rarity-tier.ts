import type { Rarity } from "./card-rules";

/** Escalón visual de una rareza en la carta por capas: marco, partículas y sello. */
export type RarityTier = "n" | "r" | "sr" | "ssr" | "ur";

/**
 * Spec 022, RF-9: un escalón visual (marco, partículas y sello) por rareza. Solo cambia cómo se ven: el sorteo y las
 * probabilidades no dependen de esto.
 */
export const RARITY_TIER: Record<Rarity, RarityTier> = {
  common: "n",
  rare: "r",
  epic: "sr",
  legendary: "ssr",
  ex: "ur",
};

export const rarityTier = (r: Rarity | null | undefined): RarityTier => (r ? RARITY_TIER[r] : "n");

/** Spec 022, RF-4: la carta común se ve plana, sin parallax (la imagen fija, con el brillo holo si lo es). */
export const isFlat = (r: Rarity | null | undefined) => (r ?? "common") === "common";
