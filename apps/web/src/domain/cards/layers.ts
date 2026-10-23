// Spec 016: configuración de una carta por capas (formato de carta-capas.js v3) y sus reglas. Puro, sin E/S.
import { z } from "zod";

/** Lienzo de referencia de todas las capas de imagen (el del creador). */
export const CANVAS = { width: 700, height: 991 } as const;
export const CANVAS_RATIO = CANVAS.width / CANVAS.height;
/** Tamaño al que se guarda cada capa de imagen (2 × el lienzo, para pantallas de alta densidad). */
export const STORED_LAYER = { width: CANVAS.width * 2, height: CANVAS.height * 2 } as const;
/** Ancho máximo al que se guarda la imagen del sello (no sigue la proporción del lienzo). */
export const SEAL_MAX_WIDTH = 600;
export const MIN_LAYER_WIDTH = 700;
/** Diferencia de proporción admitida respecto del lienzo (RF-33). */
export const RATIO_TOLERANCE = 0.01;
export const MAX_IMAGE_LAYERS = 8;

export const TIERS = ["n", "r", "sr", "ssr", "ur"] as const;
export const CORNERS = ["sup-izq", "sup-der", "inf-izq", "inf-der"] as const;
export const SEAL_STYLES = ["oro", "plata", "arcoiris", "rosa", "azul", "morado"] as const;
export const PARTICLE_TYPES = ["destellos-dorados", "destellos-arcoiris", "confeti", "burbujas", "bokeh", "corazones", "nieve", "chispas", "petalos"] as const;

/**
 * RF-69: solo los modos de mezcla que la imagen plana (sharp, en el servidor) reproduce igual que el navegador.
 * `hue`, `saturation`, `color` y `luminosity` no están: en el plano saldrían distintos.
 */
export const BLEND_MODES = ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion"] as const;
export type BlendMode = (typeof BLEND_MODES)[number];

/** Prefijos de clave válidos en una configuración: lo ya guardado de la colección o lo recién subido. */
export const layerKey = (setId: string, sha: string) => `sets/${setId}/layers/${sha}.webp`;
export const isTempKey = (key: string) => /^tmp\/layers\/[0-9a-f-]{36}\.webp$/.test(key);
export const isSetLayerKey = (setId: string, key: string) => key.startsWith(`sets/${setId}/layers/`) && /\/[0-9a-f]{64}\.webp$/.test(key);

const num = (min: number, max: number) => z.number().finite().min(min).max(max);

/** Spec 017: papel de una capa de imagen en la carta armada. */
export const LAYER_ROLES = ["personaje", "fondo", "extra"] as const;
export type LayerRole = (typeof LAYER_ROLES)[number];
/** `cubrir` llena el lienzo (fondos); `contener` dibuja la imagen entera (la chica recortada, de cualquier proporción). */
export const FITS = ["cubrir", "contener"] as const;

/** Spec 017, RF-10 y RF-11: x e y en % del lienzo, escala de 0,1 a 4 y giro en grados. Todo opcional. */
const framing = z.object({
  x: num(-100, 100).optional(),
  y: num(-100, 100).optional(),
  escala: num(0.1, 4).optional(),
  giro: num(-180, 180).optional(),
  ajuste: z.enum(FITS).optional(),
});

export const imageLayerSchema = z.object({
  key: z.string().min(1),
  rol: z.enum(LAYER_ROLES).optional(),
  encuadre: framing.optional(),
  profundidad: num(-3, 3).optional(),
  margen: num(0, 30).optional(),
  mezcla: z.enum(BLEND_MODES).optional(),
  opacidad: num(0, 1).optional(),
  visible: z.boolean().optional(),
});

export const particleLayerSchema = z.object({
  particulas: z.enum(PARTICLE_TYPES),
  cantidad: num(0, 200).optional(),
  tamano: num(0.2, 5).optional(),
  velocidad: num(0.2, 5).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  semilla: z.number().int().min(1).max(2_147_483_646).optional(),
  profundidad: num(-3, 3).optional(),
  margen: num(0, 30).optional(),
  mezcla: z.enum(BLEND_MODES).optional(),
  opacidad: num(0, 1).optional(),
  visible: z.boolean().optional(),
});

export const imageSealSchema = z.object({
  key: z.string().min(1),
  esquina: z.enum(CORNERS),
  tamano: num(5, 100).optional(),
  recorte: z.tuple([num(0, 1), num(0, 1), num(0, 1), num(0, 1)]).optional(),
  relacion: num(0.01, 100).optional(),
});

export const textSealSchema = z.object({
  texto: z.string().trim().min(1).max(8),
  estilo: z.enum(SEAL_STYLES),
  esquina: z.enum(CORNERS),
  tamano: num(4, 40).optional(),
});

export const layersConfigSchema = z.object({
  capas: z.array(z.union([imageLayerSchema, particleLayerSchema])).max(40),
  marco: z.enum(TIERS),
  borde: num(0, 8).optional(),
  sello: z.union([imageSealSchema, textSealSchema]).nullable(),
  holo: z.boolean().optional(),
  /** Spec 017, RF-13: el sistema pone marco, partículas y sello del escalón mientras nadie los toque. */
  estiloAuto: z.boolean().optional(),
});

export type ImageLayer = z.infer<typeof imageLayerSchema>;
export type ParticleLayer = z.infer<typeof particleLayerSchema>;
export type Layer = ImageLayer | ParticleLayer;
export type ImageSeal = z.infer<typeof imageSealSchema>;
export type Framing = Required<z.infer<typeof framing>>;
export type TextSeal = z.infer<typeof textSealSchema>;
/** Configuración guardada: las imágenes son claves del almacén, nunca URLs. */
export type LayersConfig = z.infer<typeof layersConfigSchema>;

export const isImageLayer = (l: Layer): l is ImageLayer => "key" in l;
export const isImageSeal = (s: LayersConfig["sello"]): s is ImageSeal => Boolean(s && "key" in s);

/** Una capa de imagen se ve si no está oculta y su opacidad es mayor que 0. */
export const isVisible = (l: Layer) => l.visible !== false && (l.opacidad ?? 1) > 0;

export const imageLayers = (c: LayersConfig) => c.capas.filter(isImageLayer);

/** Todas las claves de imagen de una configuración (capas y sello). */
export function imageKeys(c: LayersConfig | null | undefined): string[] {
  if (!c) return [];
  const keys = imageLayers(c).map((l) => l.key);
  if (isImageSeal(c.sello)) keys.push(c.sello.key);
  return keys;
}

/** Spec 017: la capa de personaje (la chica) de una carta, si la tiene. */
export const characterLayer = (c: LayersConfig) => imageLayers(c).find((l) => l.rol === "personaje");

export const DEFAULT_FRAMING = { x: 0, y: 0, escala: 1, giro: 0 } as const;
const defaultFit = (l: ImageLayer) => (l.rol === "personaje" ? "contener" : "cubrir");

/** Spec 017, RF-10: el encuadre completo de una capa, con los valores por defecto de lo que no tenga. */
export const framingOf = (l: ImageLayer): Framing => ({ ...DEFAULT_FRAMING, ajuste: defaultFit(l), ...l.encuadre });

/** Spec 017, RF-11: la capa vuelve a su encuadre inicial (centrada, al 100 %, sin giro). */
export function resetFraming(l: ImageLayer): ImageLayer {
  return { ...l, encuadre: { ...DEFAULT_FRAMING, ajuste: defaultFit(l) } };
}

/**
 * Spec 017, RF-8: pone el fondo de la carta (de la biblioteca o propio). Si ya tenía uno, cambia su imagen y conserva
 * sus ajustes; si no, va detrás de todo, casi quieto y con margen para el parallax.
 */
export function setBackground(c: LayersConfig, key: string): LayersConfig {
  if (imageLayers(c).some((l) => l.rol === "fondo")) return { ...c, capas: c.capas.map((l) => (isImageLayer(l) && l.rol === "fondo" ? { ...l, key } : l)) };
  return { ...c, capas: [{ key, rol: "fondo", profundidad: 0.2, margen: 5 }, ...c.capas] };
}

export type AssemblyPart = "personaje" | "fondo";

/** Spec 017, RF-15: lo que le falta a una carta para estar armada (personaje y fondo visibles). */
export function missingParts(c: LayersConfig | null | undefined): AssemblyPart[] {
  const visible = c ? imageLayers(c).filter(isVisible) : [];
  return (["personaje", "fondo"] as const).filter((rol) => !visible.some((l) => l.rol === rol));
}

export const isAssembled = (c: LayersConfig | null | undefined) => missingParts(c).length === 0;

export type LayersIssue =
  | { code: "invalid_layers"; path: string }
  | { code: "too_many_layers"; max: number }
  | { code: "no_visible_layer" }
  | { code: "two_characters" }
  | { code: "character_required" };

/**
 * RF-17, RF-36, RF-37: forma válida, como mucho 8 capas de imagen (las partículas no cuentan) y alguna visible.
 * Spec 017, RF-5: como mucho un personaje y, si la carta ya tenía uno (`previous`), no se quita ni se oculta.
 */
export function checkLayersConfig(input: unknown, previous?: LayersConfig | null): { ok: true; config: LayersConfig } | { ok: false; issue: LayersIssue } {
  const parsed = layersConfigSchema.safeParse(input);
  if (!parsed.success) return { ok: false, issue: { code: "invalid_layers", path: parsed.error.issues[0]?.path.join(".") ?? "" } };
  const config = parsed.data;
  if (imageLayers(config).length > MAX_IMAGE_LAYERS) return { ok: false, issue: { code: "too_many_layers", max: MAX_IMAGE_LAYERS } };
  if (!imageLayers(config).some(isVisible)) return { ok: false, issue: { code: "no_visible_layer" } };
  if (imageLayers(config).filter((l) => l.rol === "personaje").length > 1) return { ok: false, issue: { code: "two_characters" } };
  const character = characterLayer(config);
  if (previous && characterLayer(previous) && !(character && isVisible(character))) return { ok: false, issue: { code: "character_required" } };
  return { ok: true, config };
}

/** RF-39: claves de imagen que aparecen más de una vez en la misma carta (solo es un aviso). */
export function repeatedImages(c: LayersConfig): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const k of imageLayers(c).map((l) => l.key)) (seen.has(k) ? repeated : seen).add(k);
  return [...repeated];
}

export type LayerSizeVerdict = { ok: true; scaled: boolean } | { ok: false; code: "layer_too_narrow"; min: number } | { ok: false; code: "layer_ratio"; expected: string };

/** RF-32 a RF-34: ancho mínimo y proporción del lienzo con un 1 % de tolerancia; otro tamaño se escala. */
export function checkLayerSize(width: number, height: number): LayerSizeVerdict {
  if (width < MIN_LAYER_WIDTH) return { ok: false, code: "layer_too_narrow", min: MIN_LAYER_WIDTH };
  const ratio = width / height;
  if (Math.abs(ratio - CANVAS_RATIO) / CANVAS_RATIO > RATIO_TOLERANCE) {
    return { ok: false, code: "layer_ratio", expected: `${STORED_LAYER.width} × ${STORED_LAYER.height}` };
  }
  return { ok: true, scaled: width !== STORED_LAYER.width || height !== STORED_LAYER.height };
}

/** Spec 017, RF-2: la chica recortada llega en PNG o WebP (los formatos con transparencia), de cualquier proporción. */
export const CHARACTER_TYPES = ["image/png", "image/webp"] as const;
export const MIN_CHARACTER_HEIGHT = CANVAS.height;

export type CharacterSizeVerdict = { ok: true } | { ok: false; code: "character_too_short"; min: number };

/** Spec 017, RF-2: al menos la altura del lienzo (991 px); el ancho y la proporción son libres. */
export function checkCharacterSize(_width: number, height: number): CharacterSizeVerdict {
  return height < MIN_CHARACTER_HEIGHT ? { ok: false, code: "character_too_short", min: MIN_CHARACTER_HEIGHT } : { ok: true };
}
