// Spec 030: la coreografía del paquete de diseño para abrir el sobre por capas y sus cartas especiales. Puro, sin navegador.
import type { Rarity } from "../catalog/card-rules";
import { celebrates, confettiCount, revealSound, teaseLevel, vibrationPattern, type SoundName } from "./feedback";

/** RF-19: ms desde que el sobre se abre: las cartas suben, el sobre se va y el mazo queda listo. */
export const SOBRE_TIMELINE = { rise: 380, hide: 1250, ready: 1900 } as const;
/** Movimiento reducido (EFECTOS-Y-ANIMACIONES del paquete de diseño): 0, 0,15 y 0,3 s. */
export const SOBRE_TIMELINE_REDUCED = { rise: 0, hide: 150, ready: 300 } as const;

export const sobreTimeline = (reduced: boolean) => (reduced ? SOBRE_TIMELINE_REDUCED : SOBRE_TIMELINE);

/** Decisión 4: el efecto especial de la SSR del paquete de diseño lo llevan la Legendaria y la EX. */
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

/** Spec 030, decisión 10 (RF-26): vibración de la carta especial del paquete de diseño. */
export const SPECIAL_VIBRATION = [30, 50, 80] as const;

const FLASH_RARITIES: readonly Rarity[] = ["epic", "legendary", "ex"];

export interface RevealFx {
  special: boolean;
  sound: SoundName | null;
  vibration: readonly number[] | null;
  confetti: number;
  particles: boolean;
  celebrate: boolean;
  flash: boolean;
  tease: number;
}

/**
 * Spec 030, RF-26: qué efectos acompañan al revelar una carta. La Legendaria y la EX salen solo con el efecto del paquete de diseño
 * (rayos, estrella, campanita y su vibración): sin el sonido de su rareza, confeti, partículas, celebración, destello ni
 * brillo previo de los bordes. Las demás conservan los de las specs 013 y 014.
 */
export function revealFx(rarity: Rarity): RevealFx {
  if (isSpecial(rarity)) {
    return { special: true, sound: null, vibration: SPECIAL_VIBRATION, confetti: 0, particles: false, celebrate: false, flash: false, tease: 0 };
  }
  return {
    special: false,
    sound: revealSound(rarity),
    vibration: vibrationPattern(rarity),
    confetti: confettiCount(rarity),
    particles: true,
    celebrate: celebrates(rarity),
    flash: FLASH_RARITIES.includes(rarity),
    tease: teaseLevel(rarity),
  };
}
