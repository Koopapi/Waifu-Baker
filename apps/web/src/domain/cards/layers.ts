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

const imageLayer = z.object({
  key: z.string().min(1),
  profundidad: num(-3, 3).optional(),
  margen: num(0, 30).optional(),
  mezcla: z.enum(BLEND_MODES).optional(),
  opacidad: num(0, 1).optional(),
  visible: z.boolean().optional(),
});

const particleLayer = z.object({
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

const imageSeal = z.object({
  key: z.string().min(1),
  esquina: z.enum(CORNERS),
  tamano: num(5, 100).optional(),
  recorte: z.tuple([num(0, 1), num(0, 1), num(0, 1), num(0, 1)]).optional(),
  relacion: num(0.01, 100).optional(),
});

const textSeal = z.object({
  texto: z.string().trim().min(1).max(8),
  estilo: z.enum(SEAL_STYLES),
  esquina: z.enum(CORNERS),
  tamano: num(4, 40).optional(),
});

export const layersConfigSchema = z.object({
  capas: z.array(z.union([imageLayer, particleLayer])).max(40),
  marco: z.enum(TIERS),
  borde: num(0, 8).optional(),
  sello: z.union([imageSeal, textSeal]).nullable(),
  holo: z.boolean().optional(),
});

export type ImageLayer = z.infer<typeof imageLayer>;
export type ParticleLayer = z.infer<typeof particleLayer>;
export type Layer = ImageLayer | ParticleLayer;
export type ImageSeal = z.infer<typeof imageSeal>;
export type TextSeal = z.infer<typeof textSeal>;
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

export type LayersIssue =
  | { code: "invalid_layers"; path: string }
  | { code: "too_many_layers"; max: number }
  | { code: "no_visible_layer" };

/** RF-17, RF-36, RF-37: forma válida, como mucho 8 capas de imagen (las partículas no cuentan) y alguna visible. */
export function checkLayersConfig(input: unknown): { ok: true; config: LayersConfig } | { ok: false; issue: LayersIssue } {
  const parsed = layersConfigSchema.safeParse(input);
  if (!parsed.success) return { ok: false, issue: { code: "invalid_layers", path: parsed.error.issues[0]?.path.join(".") ?? "" } };
  const config = parsed.data;
  if (imageLayers(config).length > MAX_IMAGE_LAYERS) return { ok: false, issue: { code: "too_many_layers", max: MAX_IMAGE_LAYERS } };
  if (!imageLayers(config).some(isVisible)) return { ok: false, issue: { code: "no_visible_layer" } };
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
