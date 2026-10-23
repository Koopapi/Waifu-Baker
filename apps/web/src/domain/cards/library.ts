// Spec 017, RF-6 a RF-9 y RF-21: biblioteca general de elementos (fondos, sellos de imagen, capas de adorno y partículas
// guardadas), común a todas las colecciones. Puro, sin E/S.
import { imageKeys, type ImageLayer, type LayersConfig, type ParticleLayer } from "./layers";

export const LIBRARY_KINDS = ["fondo", "sello", "adorno", "particulas"] as const;
export type LibraryKind = (typeof LIBRARY_KINDS)[number];
export type LibraryImageKind = Exclude<LibraryKind, "particulas">;

/** Dónde vive cada imagen de la biblioteca: la huella en la clave evita guardarla dos veces. */
export const libraryKey = (sha: string) => `library/${sha}.webp`;

/** RF-7: fondos y adornos siguen las reglas de las capas del lienzo; los sellos, las del sello de imagen. */
export const uploadKindFor = (kind: LibraryImageKind): "layer" | "seal" => (kind === "sello" ? "seal" : "layer");

/** RF-21: el tipo con el que se guarda una capa de imagen de una carta; la chica no va a la biblioteca. */
export function kindForLayer(l: ImageLayer): LibraryImageKind | null {
  if (l.rol === "personaje") return null;
  return l.rol === "fondo" ? "fondo" : "adorno";
}

export type ParticlePreset = Omit<ParticleLayer, "semilla" | "profundidad" | "margen" | "visible">;

/** RF-9 y RF-21: lo que se guarda de unas partículas (no su semilla ni su posición en la carta). */
export function presetFromLayer(l: ParticleLayer): ParticlePreset {
  const fields = ["particulas", "cantidad", "tamano", "velocidad", "color", "mezcla", "opacidad"] as const;
  return Object.fromEntries(fields.filter((f) => l[f] !== undefined).map((f) => [f, l[f]])) as ParticlePreset;
}

/** RF-8 y RF-9: las partículas guardadas se copian a la carta con su propia semilla y la posición por defecto. */
export const layerFromPreset = (preset: ParticlePreset, seed: number): ParticleLayer => ({ ...preset, semilla: seed, profundidad: 0.55, margen: 4 });

export const MAX_NAME = 60;

/** RF-6: nombre visible de un elemento (sin extensión de archivo ni espacios de más); `null` si queda vacío. */
export function libraryName(raw: string): string | null {
  const name = raw.trim().replace(/\.(png|jpe?g|webp)$/i, "").trim().slice(0, MAX_NAME);
  return name || null;
}

/** RF-9: cuántas cartas usan cada imagen y de qué colecciones (vigente o pendiente; cada carta cuenta una vez). */
export function usesByKey(rows: { setCode: string; layers: LayersConfig | null; pending: LayersConfig | null }[]) {
  const uses = new Map<string, { cards: number; sets: string[] }>();
  for (const r of rows) {
    for (const key of new Set([...imageKeys(r.layers), ...imageKeys(r.pending)])) {
      const u = uses.get(key) ?? { cards: 0, sets: [] };
      u.cards += 1;
      if (!u.sets.includes(r.setCode)) u.sets = [...u.sets, r.setCode].sort();
      uses.set(key, u);
    }
  }
  return uses;
}
