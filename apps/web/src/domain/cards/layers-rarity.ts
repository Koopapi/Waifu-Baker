// Spec 016: estilo del escalón de rareza en una configuración por capas (los presets de carta-capas.js v3). Puro.
import type { RarityTier } from "@/domain/catalog/rarity-tier";
import { isImageLayer, isImageSeal, type LayersConfig, type ParticleLayer, type TextSeal } from "./layers";

interface Preset {
  particles: Omit<ParticleLayer, "profundidad" | "margen"> | null;
  seal: Omit<TextSeal, "esquina"> | null;
  holo: boolean;
}

/** Los mismos valores que `PRESETS` de carta-capas.js (n, r, sr, ssr, ur). */
export const TIER_PRESETS: Record<RarityTier, Preset> = {
  n: { particles: null, seal: null, holo: false },
  r: { particles: { particulas: "destellos-arcoiris", cantidad: 16, tamano: 0.8, opacidad: 0.75 }, seal: null, holo: false },
  sr: { particles: { particulas: "destellos-arcoiris", cantidad: 36 }, seal: { texto: "SR", estilo: "morado", tamano: 12 }, holo: false },
  ssr: { particles: { particulas: "destellos-dorados", cantidad: 55 }, seal: { texto: "SSR", estilo: "oro", tamano: 14 }, holo: false },
  ur: { particles: { particulas: "destellos-arcoiris", cantidad: 65 }, seal: { texto: "UR", estilo: "arcoiris", tamano: 14 }, holo: true },
};

/**
 * RF-13: «Aplicar estilo de la rareza»: marco, partículas y sello del escalón. Las partículas sustituyen a las que
 * hubiera y van justo detrás de la primera capa de imagen (entre el fondo y la personaje, como hace carta-capas.js con
 * varias capas). El sello de texto del preset sustituye al sello que hubiera; un escalón sin sello lo quita.
 */
export function applyTierStyle(config: LayersConfig, tier: RarityTier, seed: number): LayersConfig {
  const p = TIER_PRESETS[tier];
  const capas = config.capas.filter(isImageLayer) as LayersConfig["capas"];
  if (p.particles) capas.splice(Math.min(1, capas.length), 0, { ...p.particles, semilla: seed, profundidad: 0.55, margen: 4 });
  return {
    ...config,
    capas,
    marco: tier,
    sello: p.seal ? { ...p.seal, esquina: "sup-izq" } : null,
    holo: p.holo,
  };
}

/**
 * Spec 016, RF-25: al cambiar la rareza de una carta con capas, el marco y el sello de texto siguen al escalón nuevo
 * (el sello conserva su esquina; un escalón sin sello lo quita), las partículas no cambian y un sello de imagen se
 * mantiene, pero hay que revisarlo a mano.
 */
export function retierLayers(config: LayersConfig, tier: RarityTier): { config: LayersConfig; imageSealToReview: boolean } {
  const preset = TIER_PRESETS[tier].seal;
  const seal = config.sello;
  if (seal && isImageSeal(seal)) return { config: { ...config, marco: tier }, imageSealToReview: true };
  const sello = seal && preset ? { ...preset, esquina: seal.esquina } : null;
  return { config: { ...config, marco: tier, sello }, imageSealToReview: false };
}
