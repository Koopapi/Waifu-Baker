// Spec 025: acciones del configurador de Bruno sobre la configuración por capas (subir por nombre, partículas detrás de
// la chica, «Usar como sello» y recorte del sello). Puro, sin E/S.
import { characterLayer, imageLayers, isImageLayer, isImageSeal, setBackground, type ImageLayer, type LayersConfig, type ParticleLayer } from "./layers";

const BACKGROUND = /fondo|background|(^|[_\-\s])bg([_\-\s.]|$)/i;
const CHARACTER = /personaje|character|char|waifu|chica/i;
const GLOW = /overlay|brillo|glitter|textura|luz/i;
const SEAL = /sello|badge|insignia-rareza|rareza|(^|[_\-\s])(ssr|ur|ex|sr)([_\-\s.]|$)/i;

/** Orden natural por nombre, como el configurador (`yuki_2` antes que `yuki_10`). */
export const byNaturalName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

export type UploadPlan =
  | { kind: "seal" }
  | { kind: "character" }
  | { kind: "background" }
  | { kind: "layer"; defaults: Pick<ImageLayer, "profundidad" | "margen" | "mezcla"> };

/**
 * Spec 025, RF-20: el nombre del archivo propone su papel, como en el configurador: el sello (si la carta aún no tiene
 * sello de imagen), la chica (si aún no tiene), el fondo, un brillo u overlay delante, o una capa un poco más
 * adelante que la más cercana.
 */
export function planUpload(name: string, config: LayersConfig): UploadPlan {
  if (SEAL.test(name) && !isImageSeal(config.sello)) return { kind: "seal" };
  if (BACKGROUND.test(name)) return { kind: "background" };
  if (CHARACTER.test(name) && !characterLayer(config)) return { kind: "character" };
  if (CHARACTER.test(name)) return { kind: "layer", defaults: { profundidad: 1 } };
  if (GLOW.test(name)) return { kind: "layer", defaults: { profundidad: 1.3, margen: 6, ...(/overlay/i.test(name) ? { mezcla: "overlay" as const } : {}) } };
  const nearest = imageLayers(config).reduce((m, l) => Math.max(m, l.profundidad ?? 1), 0);
  return { kind: "layer", defaults: { profundidad: Math.min(2.5, Math.round(Math.max(0.5, nearest + 0.3) * 1000) / 1000) } };
}

/**
 * Spec 025, RF-20: pone lo subido en su sitio. El fondo va detrás de todo (si ya hay fondo, la imagen nueva va detrás
 * como capa más); la chica y las capas, delante; el sello, como sello de imagen.
 */
export function placeUpload(config: LayersConfig, key: string, plan: UploadPlan): LayersConfig {
  switch (plan.kind) {
    case "seal":
      return { ...config, sello: { key, esquina: config.sello?.esquina ?? "sup-izq", tamano: 36 } };
    case "background":
      if (!imageLayers(config).some((l) => l.rol === "fondo")) return setBackground(config, key);
      return { ...config, capas: [{ key, rol: "extra", profundidad: 0.2, margen: 5 }, ...config.capas] };
    case "character":
      return { ...config, capas: [...config.capas, { key, rol: "personaje", profundidad: 1, encuadre: { x: 0, y: 0, escala: 1, giro: 0, ajuste: "contener" } }] };
    case "layer":
      return { ...config, capas: [...config.capas, { key, rol: "extra", ...plan.defaults }] };
  }
}

/** Spec 025 (como el configurador): las partículas nuevas van justo detrás de la chica; sin chica, detrás de la primera capa. */
export function addParticles(config: LayersConfig, seed: number): LayersConfig {
  const capas = [...config.capas];
  const chica = capas.findIndex((l) => isImageLayer(l) && l.rol === "personaje");
  const at = chica >= 0 ? chica : Math.min(1, capas.length);
  const layer: ParticleLayer = { particulas: "destellos-dorados", cantidad: 60, semilla: seed, profundidad: 0.55, margen: 4 };
  capas.splice(at, 0, layer);
  return { ...config, capas };
}

/** Spec 025, RF-12: la capa de imagen `i` pasa a ser el sello de imagen y deja de ser capa. La chica no se puede. */
export function layerToSeal(config: LayersConfig, i: number): LayersConfig {
  const l = config.capas[i];
  if (!l || !isImageLayer(l) || l.rol === "personaje") return config;
  return {
    ...config,
    capas: config.capas.filter((_, j) => j !== i),
    sello: { key: l.key, esquina: config.sello?.esquina ?? "sup-izq", tamano: isImageSeal(config.sello) ? (config.sello.tamano ?? 36) : 36 },
  };
}

/**
 * Spec 025, RF-13: recorte del sello a su contenido (como el configurador): el rectángulo con alfa > 10, con 2 px de
 * margen, en fracciones de la imagen. Si el contenido ocupa más del 80 % o la imagen está vacía, no se recorta.
 */
export function trimBox(alpha: (i: number) => number, w: number, h: number): { recorte: [number, number, number, number]; relacion: number } | null {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (alpha(y * w + x) > 10) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return null;
  let bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  if (bw * bh > 0.8 * w * h) return null;
  const pad = 2;
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  bw = Math.min(w - x0, bw + 2 * pad);
  bh = Math.min(h - y0, bh + 2 * pad);
  const r4 = (v: number) => Math.round(v * 10_000) / 10_000;
  return { recorte: [r4(x0 / w), r4(y0 / h), r4(bw / w), r4(bh / h)], relacion: r4(bw / bh) };
}
