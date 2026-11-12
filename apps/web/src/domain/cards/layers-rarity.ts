// Spec 016: estilo del escalón de rareza en una configuración por capas (los presets de carta-capas.js v3). Puro.
import type { RarityTier } from "@/domain/catalog/rarity-tier";
import { FACTORY_CARD_DEFAULTS, type CardDefaults } from "./card-defaults";
import { DEFAULT_FRAMING, characterLayer, isImageLayer, isImageSeal, type ImageLayer, type Layer, type LayersConfig, type ParticleLayer, type TextSeal } from "./layers";

interface Preset {
  particles: Omit<ParticleLayer, "profundidad" | "margen"> | null;
  seal: Omit<TextSeal, "esquina" | "tamano"> | null;
  holo: boolean;
}

/**
 * Partículas, sello y holo de cada escalón (los de `PRESETS` de carta-capas.js: n, r, sr, ssr, ur). Spec 028, RF-1: el
 * tamaño del sello ya no depende del escalón; lo ponen los valores por defecto (`CardDefaults`).
 */
export const TIER_PRESETS: Record<RarityTier, Preset> = {
  // Spec 022: un sello por rareza. Spec 038, RF-6: C, R, UR, SSR y EX (antes C, R, E, LEG y EX).
  n: { particles: null, seal: { texto: "C", estilo: "plata" }, holo: false },
  r: { particles: { particulas: "destellos-arcoiris", cantidad: 16, tamano: 0.8, opacidad: 0.75 }, seal: { texto: "R", estilo: "azul" }, holo: false },
  sr: { particles: { particulas: "destellos-arcoiris", cantidad: 36 }, seal: { texto: "UR", estilo: "morado" }, holo: false },
  ssr: { particles: { particulas: "destellos-dorados", cantidad: 55 }, seal: { texto: "SSR", estilo: "oro" }, holo: false },
  ur: { particles: { particulas: "destellos-arcoiris", cantidad: 65 }, seal: { texto: "EX", estilo: "arcoiris" }, holo: true },
};

/** Spec 028, RF-1: el sello de texto de un escalón con el tamaño por defecto (el de la EX si el escalón no tiene). */
export function tierTextSeal(tier: RarityTier, defaults: CardDefaults = FACTORY_CARD_DEFAULTS): Omit<TextSeal, "esquina"> {
  return { ...(TIER_PRESETS[tier].seal ?? TIER_PRESETS.ur.seal!), tamano: defaults.sealSize };
}

/**
 * RF-13: «Aplicar estilo de la rareza»: marco, partículas y sello del escalón. Las partículas sustituyen a las que
 * hubiera y van justo detrás de la primera capa de imagen (entre el fondo y la personaje, como hace carta-capas.js con
 * varias capas) o, si la carta tiene chica (spec 017), justo detrás de ella. El sello de texto del preset sustituye al
 * sello que hubiera; un escalón sin sello lo quita. Spec 028, RF-2: el sello de texto sale con el tamaño por defecto y
 * el borde con el grosor por defecto (15 y 3,0 de fábrica, o los del panel).
 */
export function applyTierStyle(config: LayersConfig, tier: RarityTier, seed: number, defaults: CardDefaults = FACTORY_CARD_DEFAULTS): LayersConfig {
  const p = TIER_PRESETS[tier];
  const capas = config.capas.filter(isImageLayer) as LayersConfig["capas"];
  const character = capas.findIndex((l) => isImageLayer(l) && l.rol === "personaje");
  const at = character >= 0 ? character : Math.min(1, capas.length);
  if (p.particles) capas.splice(at, 0, { ...p.particles, semilla: seed, profundidad: 0.55, margen: 4 });
  return {
    ...config,
    capas,
    marco: tier,
    borde: defaults.border,
    sello: p.seal ? { ...p.seal, tamano: defaults.sealSize, esquina: "sup-izq" } : null,
    holo: p.holo,
  };
}

/** Semilla de las partículas que ya tiene la carta (para que el cambio de escalón no las recoloque) o una fija. */
const particleSeed = (c: LayersConfig) => c.capas.find((l): l is ParticleLayer => !isImageLayer(l))?.semilla ?? 1;

/** Spec 025, RF-17: un marco personalizado o «Sin marco» se conserva al cambiar la rareza. */
const ownFrame = (c: LayersConfig) => c.marco === "personalizado" || c.marco === "ninguno";

/**
 * Spec 017, RF-13: con el estilo automático, el cambio de rareza pone el estilo completo del escalón nuevo (marco,
 * partículas, sello y holo). Sin él:
 * Spec 016, RF-25: al cambiar la rareza de una carta con capas, el marco y el sello de texto siguen al escalón nuevo
 * (el sello conserva su esquina; un escalón sin sello lo quita), las partículas no cambian y un sello de imagen se
 * mantiene, pero hay que revisarlo a mano. Spec 028, RF-3: con el estilo automático, sello y borde vuelven a los valores
 * por defecto; sin él, el sello de texto conserva su tamaño (ya no hay tamaño por escalón) y el borde no cambia.
 */
export function retierLayers(config: LayersConfig, tier: RarityTier, defaults: CardDefaults = FACTORY_CARD_DEFAULTS): { config: LayersConfig; imageSealToReview: boolean } {
  if (config.estiloAuto) return { config: applyTierStyle(config, tier, particleSeed(config), defaults), imageSealToReview: false };
  const preset = TIER_PRESETS[tier].seal;
  const seal = config.sello;
  const marco = ownFrame(config) ? config.marco : tier;
  if (seal && isImageSeal(seal)) return { config: { ...config, marco }, imageSealToReview: true };
  const sello = seal && preset ? { ...preset, tamano: seal.tamano ?? defaults.sealSize, esquina: seal.esquina } : null;
  return { config: { ...config, marco, sello }, imageSealToReview: false };
}

/** JSON con las claves ordenadas: la base de datos (jsonb) y la validación reordenan las claves de cada objeto. */
export function stableJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableJson).join(",")}]`;
  if (v && typeof v === "object") {
    const entries = Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined);
    return `{${entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, x]) => `${JSON.stringify(k)}:${stableJson(x)}`).join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

/**
 * Lo que forma el estilo de una carta: marco, sello, holo y partículas (no las capas de imagen ni su orden). Spec 028:
 * también el borde, que ahora pone el estilo de la rareza (RF-2).
 */
const styleOf = (c: LayersConfig) => stableJson([c.marco, c.marcoColores, c.sello, c.holo ?? false, c.borde, c.capas.filter((l: Layer) => !isImageLayer(l))]);

/**
 * Spec 017, RF-13 y RF-14: al guardar, si el administrador cambió a mano el marco, las partículas o el sello, la carta
 * deja de tener estilo automático; una vez apagado, solo vuelve si se aplica el estilo del escalón (`tier`) tal cual.
 */
export function settleAutoStyle(previous: LayersConfig | null | undefined, next: LayersConfig, tier?: RarityTier, defaults: CardDefaults = FACTORY_CARD_DEFAULTS): LayersConfig {
  if (!previous || !next.estiloAuto) return next;
  const untouched = Boolean(previous.estiloAuto) && styleOf(previous) === styleOf(next);
  const isPreset = tier !== undefined && styleOf(applyTierStyle(next, tier, particleSeed(next), defaults)) === styleOf(next);
  return { ...next, estiloAuto: untouched || isPreset };
}

/**
 * Spec 017, RF-1: la carta recién creada con la chica: centrada, entera, y con el estilo automático de su escalón.
 * Spec 028, RF-1: con el sello y el borde por defecto.
 */
export function configFromCharacter(key: string, tier: RarityTier, seed: number, defaults: CardDefaults = FACTORY_CARD_DEFAULTS): LayersConfig {
  const chica: ImageLayer = { key, rol: "personaje", encuadre: { ...DEFAULT_FRAMING, ajuste: "contener" } };
  return applyTierStyle({ capas: [chica], marco: tier, sello: null, estiloAuto: true }, tier, seed, defaults);
}

/** Spec 017, RF-4: cambia la imagen de la chica y conserva su encuadre y el resto de capas y ajustes. */
export function replaceCharacter(config: LayersConfig, key: string): LayersConfig {
  if (!characterLayer(config)) return { ...config, capas: [...config.capas, { key, rol: "personaje", encuadre: { ...DEFAULT_FRAMING, ajuste: "contener" } }] };
  return { ...config, capas: config.capas.map((l) => (isImageLayer(l) && l.rol === "personaje" ? { ...l, key } : l)) };
}
