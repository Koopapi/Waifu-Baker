// Spec 023: reglas puras de la apertura nueva (rasgado y mazo). Sin navegador.
import { RARITIES, type Rarity } from "../catalog/card-rules";

/** RF-7 y RF-8: a partir de este progreso, al soltar, la tira se arranca; por debajo, vuelve a su sitio. */
export const TEAR_COMMIT = 0.6;

/** RF-6: progreso 0–1 del rasgado según lo arrastrado en cualquier sentido (casos límite: también de derecha a izquierda). */
export function tearProgress(dx: number, width: number): number {
  if (!(width > 0)) return 0;
  return Math.min(Math.abs(dx) / width, 1);
}

/** RF-7 y RF-8: si al soltar se completa el rasgado (justo en el 60 % cuenta). */
export const tearCommits = (progress: number) => progress >= TEAR_COMMIT - 1e-9;

/** RF-13: el mazo va de menor a mayor rareza, así la más rara se revela la última; a igual rareza, el orden del sobre. */
export function revealOrder<T extends { rarity: Rarity }>(cards: readonly T[]): T[] {
  return cards
    .map((c, i) => ({ c, i }))
    .sort((a, b) => RARITIES.indexOf(a.c.rarity) - RARITIES.indexOf(b.c.rarity) || a.i - b.i)
    .map(({ c }) => c);
}

/** Distancia mínima (px) para que un arrastre cuente como deslizar y no como toque. */
export const SWIPE_MIN = 40;

/** RF-16: lado hacia el que sale la carta apartada; un toque (o un arrastre corto) la manda a la derecha. */
export function swipeSide(dx: number): "left" | "right" {
  return dx <= -SWIPE_MIN ? "left" : "right";
}
