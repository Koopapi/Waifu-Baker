// Spec 030: la coreografía de Bruno para abrir el sobre por capas y sus cartas especiales. Puro, sin navegador.
import type { Rarity } from "../catalog/card-rules";

/** RF-19: ms desde que el sobre se abre: las cartas suben, el sobre se va y el mazo queda listo. */
export const SOBRE_TIMELINE = { rise: 380, hide: 1250, ready: 1900 } as const;
/** Movimiento reducido (EFECTOS-Y-ANIMACIONES de Bruno): 0, 0,15 y 0,3 s. */
export const SOBRE_TIMELINE_REDUCED = { rise: 0, hide: 150, ready: 300 } as const;

export const sobreTimeline = (reduced: boolean) => (reduced ? SOBRE_TIMELINE_REDUCED : SOBRE_TIMELINE);

/** Decisión 4: el efecto especial de la SSR de Bruno lo llevan la Legendaria y la EX. */
export const isSpecial = (r: Rarity) => r === "legendary" || r === "ex";

/** RF-21: el mazo late antes de voltear la de arriba si es especial (y aún no se ha revelado). */
export function omen(cards: readonly { rarity: Rarity }[], top: number, shown: boolean): boolean {
  const c = cards[top];
  return Boolean(c && !shown && isSpecial(c.rarity));
}

export type Dot = "done" | "current" | "next";

/** RF-23: un punto por carta (vistas, la de ahora y las que faltan). Con una sola carta no hay puntos (caso límite). */
export function progressDots(total: number, top: number): Dot[] {
  if (total <= 1) return [];
  return Array.from({ length: total }, (_, i) => (i < top ? "done" : i === top ? "current" : "next"));
}
