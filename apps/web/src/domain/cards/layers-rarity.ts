// Spec 016: estilo del escalón de rareza en una configuración por capas (los presets de carta-capas.js v3). Puro.
import type { RarityTier } from "@/domain/catalog/rarity-tier";
import { DEFAULT_FRAMING, characterLayer, isImageLayer, isImageSeal, type ImageLayer, type Layer, type LayersConfig, type ParticleLayer, type TextSeal } from "./layers";

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
 * varias capas) o, si la carta tiene chica (spec 017), justo detrás de ella. El sello de texto del preset sustituye al
 * sello que hubiera; un escalón sin sello lo quita.
 */
export function applyTierStyle(config: LayersConfig, tier: RarityTier, seed: number): LayersConfig {
  const p = TIER_PRESETS[tier];
  const capas = config.capas.filter(isImageLayer) as LayersConfig["capas"];
  const character = capas.findIndex((l) => isImageLayer(l) && l.rol === "personaje");
  const at = character >= 0 ? character : Math.min(1, capas.length);
  if (p.particles) capas.splice(at, 0, { ...p.particles, semilla: seed, profundidad: 0.55, margen: 4 });
  return {
    ...config,
    capas,
    marco: tier,
    sello: p.seal ? { ...p.seal, esquina: "sup-izq" } : null,
    holo: p.holo,
  };
}

/** Semilla de las partículas que ya tiene la carta (para que el cambio de escalón no las recoloque) o una fija. */
const particleSeed = (c: LayersConfig) => c.capas.find((l): l is ParticleLayer => !isImageLayer(l))?.semilla ?? 1;

/**
 * Spec 017, RF-13: con el estilo automático, el cambio de rareza pone el estilo completo del escalón nuevo (marco,
 * partículas, sello y holo). Sin él:
 * Spec 016, RF-25: al cambiar la rareza de una carta con capas, el marco y el sello de texto siguen al escalón nuevo
 * (el sello conserva su esquina; un escalón sin sello lo quita), las partículas no cambian y un sello de imagen se
 * mantiene, pero hay que revisarlo a mano.
 */
export function retierLayers(config: LayersConfig, tier: RarityTier): { config: LayersConfig; imageSealToReview: boolean } {
  if (config.estiloAuto) return { config: applyTierStyle(config, tier, particleSeed(config)), imageSealToReview: false };
  const preset = TIER_PRESETS[tier].seal;
  const seal = config.sello;
  if (seal && isImageSeal(seal)) return { config: { ...config, marco: tier }, imageSealToReview: true };
  const sello = seal && preset ? { ...preset, esquina: seal.esquina } : null;
  return { config: { ...config, marco: tier, sello }, imageSealToReview: false };
}

/** Lo que forma el estilo de una carta: marco, sello, holo y partículas (no las capas de imagen ni su orden). */
const styleOf = (c: LayersConfig) => JSON.stringify([c.marco, c.sello, c.holo ?? false, c.capas.filter((l: Layer) => !isImageLayer(l))]);

/**
 * Spec 017, RF-13 y RF-14: al guardar, si el administrador cambió a mano el marco, las partículas o el sello, la carta
 * deja de tener estilo automático; una vez apagado, solo vuelve si se aplica el estilo del escalón (`tier`) tal cual.
 */
export function settleAutoStyle(previous: LayersConfig | null | undefined, next: LayersConfig, tier?: RarityTier): LayersConfig {
  if (!previous || !next.estiloAuto) return next;
  const untouched = Boolean(previous.estiloAuto) && styleOf(previous) === styleOf(next);
  const isPreset = tier !== undefined && styleOf(applyTierStyle(next, tier, particleSeed(next))) === styleOf(next);
  return { ...next, estiloAuto: untouched || isPreset };
}

/** Spec 017, RF-1: la carta recién creada con la chica: centrada, entera, y con el estilo automático de su escalón. */
export function configFromCharacter(key: string, tier: RarityTier, seed: number): LayersConfig {
  const chica: ImageLayer = { key, rol: "personaje", encuadre: { ...DEFAULT_FRAMING, ajuste: "contener" } };
  return applyTierStyle({ capas: [chica], marco: tier, sello: null, estiloAuto: true }, tier, seed);
}

/** Spec 017, RF-4: cambia la imagen de la chica y conserva su encuadre y el resto de capas y ajustes. */
export function replaceCharacter(config: LayersConfig, key: string): LayersConfig {
  if (!characterLayer(config)) return { ...config, capas: [...config.capas, { key, rol: "personaje", encuadre: { ...DEFAULT_FRAMING, ajuste: "contener" } }] };
  return { ...config, capas: config.capas.map((l) => (isImageLayer(l) && l.rol === "personaje" ? { ...l, key } : l)) };
}
