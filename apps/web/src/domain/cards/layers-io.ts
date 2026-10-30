// Spec 017, RF-17 a RF-19: exportar e importar la configuración en el formato del creador de cartas de Bruno
// (`creador-cartas.html`): las imágenes van por nombre de archivo (`src`) en vez de por clave del almacén. Puro, sin E/S.
import { z } from "zod";
import {
  BLEND_MODES,
  CANVAS_RATIO,
  isImageLayer,
  isImageSeal,
  LAYER_ROLES,
  MAX_IMAGE_LAYERS,
  imageLayerSchema,
  imageSealSchema,
  particleLayerSchema,
  textSealSchema,
  TIERS,
  type ImageLayer,
  type ImageSeal,
  type LayerRole,
  type LayersConfig,
  type ParticleLayer,
  type TextSeal,
} from "./layers";

export interface ExportedFile {
  /** Nombre del archivo en la exportación (el `src` de la configuración). */
  name: string;
  /** Clave del almacén de la que sale. */
  key: string;
}

const ROLE_FILE: Record<LayerRole, string> = { personaje: "personaje", fondo: "fondo", extra: "capa" };
const slug = (id: string) => id.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "carta";

/**
 * RF-17: la configuración en el formato del creador, con un nombre de archivo legible por imagen (`<id>_<n>_<papel>.webp`
 * y `<id>_sello.webp`) y el encuadre. Una imagen repetida en la carta se exporta una sola vez.
 */
export function exportCreatorConfig(config: LayersConfig, id: string): { json: Record<string, unknown>; files: ExportedFile[] } {
  const base = slug(id);
  const files: ExportedFile[] = [];
  const names = new Map<string, string>();
  const nameFor = (key: string, name: () => string) => {
    if (!names.has(key)) {
      names.set(key, name());
      files.push({ name: names.get(key)!, key });
    }
    return names.get(key)!;
  };
  let n = 0;
  const capas = config.capas.map((l) => {
    if (!isImageLayer(l)) return l;
    const { key, ...rest } = l;
    return { src: nameFor(key, () => `${base}_${++n}_${ROLE_FILE[l.rol ?? "extra"]}.webp`), ...rest };
  });
  let sello: Record<string, unknown> | null = config.sello;
  if (isImageSeal(config.sello)) {
    const { key, ...rest } = config.sello;
    sello = { src: nameFor(key, () => `${base}_sello.webp`), ...rest };
  }
  const json: Record<string, unknown> = { id: base, etiqueta: base, marco: config.marco };
  if (config.borde !== undefined) json.borde = config.borde;
  if (config.holo) json.holo = true;
  json.proporcion = Math.round(CANVAS_RATIO * 10_000) / 10_000;
  json.capas = capas;
  json.sello = sello;
  return { json, files };
}

export type ImportedImageLayer = Omit<ImageLayer, "key"> & { src: string };
export type ImportedSeal = (Omit<ImageSeal, "key"> & { src: string }) | TextSeal;
export interface ImportedConfig {
  capas: (ImportedImageLayer | ParticleLayer)[];
  marco: LayersConfig["marco"];
  borde?: number;
  holo?: boolean;
  sello: ImportedSeal | null;
}
export type ImportKind = "layer" | "character" | "seal";
export type ImportResult =
  | { ok: true; config: ImportedConfig; files: { name: string; kind: ImportKind }[]; changedBlends: number[] }
  | { ok: false; path: string; max?: number };

const importedImage = imageLayerSchema.omit({ key: true }).extend({ src: z.string().min(1) });
const importedImageSeal = imageSealSchema.omit({ key: true }).extend({ src: z.string().min(1) });
const fileName = (src: string) => src.split(/[\\/]/).pop() ?? src;
const isRecord = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const fail = (path: string, issue?: z.ZodIssue) => ({ ok: false as const, path: [path, ...(issue?.path ?? [])].filter((p) => p !== "").join(".") });

/** Sin `rol` (formato original del creador), el papel sale del nombre del archivo, como hace el creador. */
function guessRole(name: string, taken: Set<LayerRole>): LayerRole {
  if (!taken.has("personaje") && /personaje|character|char|waifu|chica/i.test(name)) return "personaje";
  if (!taken.has("fondo") && /fondo|background|bg/i.test(name)) return "fondo";
  return "extra";
}

/**
 * RF-18 y RF-19: lee una configuración del creador. Si no es válida, dice qué parte falla; los modos de mezcla que el
 * editor no ofrece pasan a `normal` y se indican las capas que cambiaron (número de capa, desde 1). Devuelve también
 * los archivos que hay que subir y de qué tipo (la chica, el sello o una capa del lienzo).
 */
export function parseCreatorConfig(input: unknown): ImportResult {
  if (!isRecord(input)) return { ok: false, path: "" };
  if (!(TIERS as readonly unknown[]).includes(input.marco)) return { ok: false, path: "marco" };
  if (!Array.isArray(input.capas)) return { ok: false, path: "capas" };
  if (input.capas.filter((c) => isRecord(c) && "src" in c).length > MAX_IMAGE_LAYERS) return { ok: false, path: "capas", max: MAX_IMAGE_LAYERS };

  const changedBlends: number[] = [];
  const taken = new Set<LayerRole>();
  const capas: ImportedConfig["capas"] = [];
  for (const [i, raw] of input.capas.entries()) {
    if (!isRecord(raw) || (!("src" in raw) && !("particulas" in raw))) return fail(`capas.${i}`);
    const layer = { ...raw };
    if (layer.mezcla !== undefined && !(BLEND_MODES as readonly unknown[]).includes(layer.mezcla)) {
      layer.mezcla = "normal";
      changedBlends.push(i + 1);
    }
    if ("particulas" in layer) {
      const p = particleLayerSchema.safeParse(layer);
      if (!p.success) return fail(`capas.${i}`, p.error.issues[0]);
      capas.push(p.data);
      continue;
    }
    // Los campos del creador que no usa el panel (`destellos`, `uid`…) se ignoran; el `rol` desconocido se deduce.
    const { rol, ...rest } = layer;
    const parsed = importedImage.safeParse({ ...rest, src: typeof layer.src === "string" ? fileName(layer.src) : layer.src });
    if (!parsed.success) return fail(`capas.${i}`, parsed.error.issues[0]);
    const role = (LAYER_ROLES as readonly unknown[]).includes(rol) ? (rol as LayerRole) : guessRole(parsed.data.src, taken);
    taken.add(role);
    capas.push({ ...parsed.data, rol: role });
  }

  let sello: ImportedSeal | null = null;
  if (isRecord(input.sello)) {
    const s = "src" in input.sello ? importedImageSeal.safeParse({ ...input.sello, src: typeof input.sello.src === "string" ? fileName(input.sello.src) : input.sello.src }) : textSealSchema.safeParse(input.sello);
    if (!s.success) return fail("sello", s.error.issues[0]);
    sello = s.data;
  } else if (input.sello != null) return { ok: false, path: "sello" };

  const borde = typeof input.borde === "number" && input.borde >= 0 && input.borde <= 8 ? input.borde : undefined;
  const config: ImportedConfig = { capas, marco: input.marco as LayersConfig["marco"], sello, ...(borde !== undefined ? { borde } : {}), ...(input.holo === true ? { holo: true } : {}) };

  const files = new Map<string, ImportKind>();
  for (const l of capas) if ("src" in l && !files.has(l.src)) files.set(l.src, l.rol === "personaje" ? "character" : "layer");
  if (sello && "src" in sello && !files.has(sello.src)) files.set(sello.src, "seal");
  return { ok: true, config, files: [...files].map(([name, kind]) => ({ name, kind })), changedBlends };
}

/** RF-18: cambia los nombres de archivo por las claves de lo subido (área temporal) para guardar la carta. */
export function withKeys(config: ImportedConfig, keys: Record<string, string>): LayersConfig {
  const capas = config.capas.map((l) => {
    if (!("src" in l)) return l;
    const { src, ...rest } = l;
    return { key: keys[src], ...rest };
  });
  let sello: LayersConfig["sello"] = null;
  if (config.sello && "src" in config.sello) {
    const { src, ...rest } = config.sello;
    sello = { key: keys[src], ...rest };
  } else sello = config.sello;
  return { ...config, capas, sello };
}
