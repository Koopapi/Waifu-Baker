// Spec 009, RF-1 a RF-3 y RF-6: sobres gratis que se recargan como «energía». Puro.
export const FREE_INTERVAL_MS = 12 * 60 * 60 * 1000;
export const FREE_MAX = 2;
export const FREE_INITIAL = 1;

export interface FreeState {
  charges: number;
  /** Momento desde el que se está cargando la siguiente (sin sentido si está al máximo). */
  anchor: Date;
}

/** Estado real ahora: suma las cargas completas desde el ancla, sin pasar del máximo. */
export function currentFree(s: FreeState, now: Date) {
  if (s.charges >= FREE_MAX) return { charges: FREE_MAX, anchor: s.anchor, nextAt: null as Date | null };
  const gained = Math.max(0, Math.floor((now.getTime() - s.anchor.getTime()) / FREE_INTERVAL_MS));
  const charges = Math.min(FREE_MAX, s.charges + gained);
  if (charges >= FREE_MAX) return { charges: FREE_MAX, anchor: s.anchor, nextAt: null as Date | null };
  const anchor = new Date(s.anchor.getTime() + gained * FREE_INTERVAL_MS);
  return { charges, anchor, nextAt: new Date(anchor.getTime() + FREE_INTERVAL_MS) };
}

/** Gasta una carga. Desde el máximo, la siguiente empieza a cargarse en ese momento (RF-2). */
export function spendFree(s: FreeState, now: Date): FreeState | null {
  const cur = currentFree(s, now);
  if (cur.charges < 1) return null;
  return { charges: cur.charges - 1, anchor: cur.charges >= FREE_MAX ? now : cur.anchor };
}
