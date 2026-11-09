// Spec 030: reglas del editor de sobres (las del creador del paquete de diseño): valores iniciales por nombre de archivo, partículas
// nuevas, la revisión automática y el registro que se enseña. Puro, sin navegador.
import { LONG_NAME, MAX_PACK_IMAGE_LAYERS, PACK_CANVAS, TEAR_LINE_Y, isPackImageLayer, type PackDesign, type PackImageLayer, type PackInfo, type PackLayer, type PackRegistro } from "./design";

const r3 = (v: number) => Math.round(v * 1000) / 1000;

export type UploadRole = "logo" | "fondo" | "personaje" | "efecto" | "otra";

/** RF-4: el papel de un archivo por su nombre (como el creador del paquete de diseño). */
export function uploadRole(name: string): UploadRole {
  if (/(^|[_\-\s])logo([_\-\s.]|$)/i.test(name)) return "logo";
  if (/fondo|background|(^|[_\-\s])bg([_\-\s.]|$)/i.test(name)) return "fondo";
  if (/personaje|character|char|waifu|chica/i.test(name)) return "personaje";
  if (/efecto|overlay|brillo|glitter|textura|luz/i.test(name)) return "efecto";
  return "otra";
}

/** Orden natural de los archivos (sobre_2 antes que sobre_10). */
export const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

/**
 * RF-4: añade una capa por archivo con los valores iniciales de su nombre: el fondo hasta atrás (profundidad 0,25 y
 * margen 3), el personaje a profundidad 1, los efectos a 1,3 con margen 3 en «superponer» y cualquier otro un poco
 * delante de la imagen más cercana. Un archivo `logo` no es una capa: pasa a ser el logo. Una imagen que ya está no se
 * repite; pasado el máximo de capas de imagen no se añade.
 */
export function placeUpload(d: PackDesign, ref: string, name: string): PackDesign {
  const role = uploadRole(name);
  if (role === "logo") return { ...d, logo: { key: ref, nombre: name } };
  const images = d.capas.filter(isPackImageLayer);
  if (images.some((l) => l.key === ref) || images.length >= MAX_PACK_IMAGE_LAYERS) return d;
  const layer: PackImageLayer = { key: ref, nombre: name, profundidad: 1, margen: 2 };
  if (role === "fondo") return { ...d, capas: [{ ...layer, profundidad: 0.25, margen: 3 }, ...d.capas] };
  if (role === "efecto") return { ...d, capas: [...d.capas, { ...layer, profundidad: 1.3, margen: 3, mezcla: "overlay" }] };
  if (role === "otra") {
    const deepest = images.reduce((m, l) => Math.max(m, l.profundidad ?? 1), 0);
    layer.profundidad = Math.min(2.5, r3(Math.max(0.5, deepest + 0.3)));
  }
  return { ...d, capas: [...d.capas, layer] };
}

/** RF-6: «+ Partículas» pone una capa detrás del personaje (o detrás de todo salvo el fondo). */
export function addParticles(d: PackDesign, semilla: number): PackDesign {
  let pos = d.capas.findIndex((l) => isPackImageLayer(l) && uploadRole(l.nombre ?? "") === "personaje");
  if (pos < 0) pos = d.capas.length >= 1 ? 1 : 0;
  const capas: PackLayer[] = [...d.capas];
  capas.splice(pos, 0, { particulas: "destellos-arcoiris", cantidad: 18, tamano: 1, velocidad: 1, semilla, profundidad: 0.6, margen: 4 });
  return { ...d, capas };
}

/** Lo que el navegador sabe de cada imagen (medidas y lectura de píxeles). */
export interface ImageFacts {
  width: number;
  height: number;
  /** `null` mientras se analiza; `error` si no se pudieron leer los píxeles. */
  analysis: { transparent: boolean; crossesLine: boolean } | { error: true } | null;
}

/**
 * RF-9: lectura de los píxeles de una imagen reducida (RGBA, ancho `w`): si tiene transparencia (más del 0,2 % de
 * píxeles con alfa < 245) y si algo opaco cruza la línea de rasgado (más del 6 % de la franja central de 3 filas).
 */
export function analyzePixels(data: ArrayLike<number>, w: number, h: number) {
  let transp = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 245) transp++;
  const row = Math.round((TEAR_LINE_Y / PACK_CANVAS.height) * h);
  const from = Math.round(w * 0.08);
  const to = Math.round(w * 0.92);
  let cross = 0;
  for (let y = row - 1; y <= row + 1; y++) for (let x = from; x < to; x++) if (data[(y * w + x) * 4 + 3] > 200) cross++;
  return { transparent: transp / (w * h) > 0.002, crossesLine: cross / (3 * (to - from)) > 0.06 };
}

export type ReviewIssue =
  | { level: "bad"; kind: "no_background" }
  | { level: "bad"; kind: "missing_file"; name: string }
  | { level: "bad" | "warn"; kind: "size"; name: string; width: number; height: number; sameRatio: boolean }
  | { level: "bad"; kind: "unreadable"; name: string }
  | { level: "warn"; kind: "transparent_background"; name: string }
  | { level: "warn"; kind: "crosses_line"; name: string }
  | { level: "warn"; kind: "long_name"; length: number }
  | { level: "warn"; kind: "no_band" }
  | { level: "bad"; kind: "logo_missing" }
  | { level: "bad"; kind: "pattern_missing" };

/**
 * RF-9: la revisión automática del creador del paquete de diseño. Avisa, sin impedir guardar, de imágenes que no miden
 * 1000 × 1750, de un fondo con transparencia, de arte que cruza la línea de rasgado, de un nombre largo y de archivos
 * que faltan. `facts` da lo que se sabe de cada imagen por su clave o marca (sin entrada = falta el archivo).
 */
export function reviewDesign(d: PackDesign, info: Pick<PackInfo, "nombre" | "codigo">, facts: (ref: string) => ImageFacts | undefined): ReviewIssue[] {
  const out: ReviewIssue[] = [];
  const images = d.capas.filter(isPackImageLayer).filter((l) => l.visible !== false);
  if (images.length === 0) out.push({ level: "bad", kind: "no_background" });
  images.forEach((l, i) => {
    const name = l.nombre || l.key;
    const f = facts(l.key);
    if (!f) return void out.push({ level: "bad", kind: "missing_file", name });
    if (f.width !== PACK_CANVAS.width || f.height !== PACK_CANVAS.height) {
      const sameRatio = f.height > 0 && Math.abs(f.width / f.height - PACK_CANVAS.width / PACK_CANVAS.height) < 0.004;
      out.push({ level: sameRatio ? "warn" : "bad", kind: "size", name, width: f.width, height: f.height, sameRatio });
    }
    if (!f.analysis) return;
    if ("error" in f.analysis) return void out.push({ level: "bad", kind: "unreadable", name });
    if (i === 0 && f.analysis.transparent) out.push({ level: "warn", kind: "transparent_background", name });
    if (i > 0 && f.analysis.crossesLine) out.push({ level: "warn", kind: "crosses_line", name });
  });
  const nombre = info.nombre.trim();
  if (nombre.length > LONG_NAME) out.push({ level: "warn", kind: "long_name", length: nombre.length });
  if (!nombre && !info.codigo.trim()) out.push({ level: "warn", kind: "no_band" });
  if (typeof d.logo === "object" && !facts(d.logo.key)) out.push({ level: "bad", kind: "logo_missing" });
  const sp = d.sellos.patron;
  if (sp && "key" in sp && !facts(sp.key)) out.push({ level: "bad", kind: "pattern_missing" });
  return out;
}

/**
 * El registro que el editor enseña (como «Registro para el juego» del creador): sin los valores por defecto y con el
 * nombre de cada archivo en vez de su enlace.
 */
export function exportRegistro(r: PackRegistro): Record<string, unknown> {
  const out: Record<string, unknown> = { nombre: r.nombre, codigo: r.codigo, cartas: r.cartas, vista: r.vista, apertura: r.apertura, capas: r.capas };
  out.sellos = r.sellos.patron ? { arriba: r.sellos.arriba, abajo: r.sellos.abajo, patron: r.sellos.patron, patronTamano: r.sellos.patronTamano ?? 40 } : { arriba: r.sellos.arriba, abajo: r.sellos.abajo };
  if (r.logo !== true) out.logo = r.logo;
  if (r.insignia) out.insignia = r.insignia;
  if (r.holo) {
    out.holo = true;
    out.holoIntensidad = r3(r.holoIntensidad ?? 0.4);
  }
  if (r.foil === false) out.foil = false;
  else if (r3(r.foilIntensidad ?? 0.6) !== 0.6) out.foilIntensidad = r3(r.foilIntensidad ?? 0.6);
  if (r3(r.plastico ?? 1) !== 1) out.plastico = r3(r.plastico ?? 1);
  return out;
}
