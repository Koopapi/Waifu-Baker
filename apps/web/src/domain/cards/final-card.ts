// Spec 034: la carta final. Lo que se ve en el armador al guardar es lo que ven la apertura, «Abrir todos», la ficha y
// la imagen fija: todas preparan la carta con esta función. Regla pura.
import { DEFAULT_HOLO_INTENSITY, framingOf, isImageLayer, isImageSeal, type LayersConfig } from "./layers";
import type { LiveSeal } from "./live";

/** RF-14: los valores con los que se ven las cartas guardadas antes de la spec 034. */
export const VIEW_DEFAULTS = { profundidad: 14, inclinacion: 14, reposo: true } as const;

type Src = (key: string) => string;

/**
 * RF-1 a RF-5 y RF-12 a RF-15: la configuración que recibe `carta-capas.js`. Cada capa de imagen lleva su encuadre
 * completo (el que calcula el armador) y su enlace; la carta, su movimiento y su holo guardados o los de fábrica.
 */
export function finalCardConfig(c: LayersConfig, src: Src) {
  const capas = c.capas.map((l) => {
    if (!isImageLayer(l)) return { ...l };
    const { key, ...rest } = l;
    return { ...rest, encuadre: framingOf(l), src: src(key) };
  });
  let sello: LiveSeal | null = c.sello && !isImageSeal(c.sello) ? { ...c.sello } : null;
  if (isImageSeal(c.sello)) {
    const { key, ...rest } = c.sello;
    sello = { ...rest, src: src(key) };
  }
  return {
    ...c,
    capas,
    sello,
    holo: Boolean(c.holo),
    holoIntensidad: c.holoIntensidad ?? DEFAULT_HOLO_INTENSITY,
    profundidad: c.profundidad ?? VIEW_DEFAULTS.profundidad,
    inclinacion: c.inclinacion ?? VIEW_DEFAULTS.inclinacion,
    reposo: c.reposo ?? VIEW_DEFAULTS.reposo,
  };
}

export type FinalCardConfig = ReturnType<typeof finalCardConfig>;

/** Lo que no cambia cómo se ve la carta (enlaces, entrada, zona del puntero, etiqueta). */
const IGNORED = new Set(["src", "aparecer", "zona", "etiqueta", "estatica"]);

function stable(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.keys(v as object)
        .filter((k) => !IGNORED.has(k) && (v as Record<string, unknown>)[k] !== undefined)
        .sort()
        .map((k) => [k, stable((v as Record<string, unknown>)[k])]),
    );
  return v;
}

/**
 * Firma de cómo se ve una carta, sin los enlaces (cambian en cada pantalla). Dos pantallas con la misma firma muestran
 * la misma carta: la E2E compara la del armador con la de la apertura, «Abrir todos» y la ficha.
 */
export function configSignature(cfg: object): string {
  const s = JSON.stringify(stable(cfg));
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, "0");
}
