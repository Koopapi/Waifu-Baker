// Spec 013, RF-3 a RF-5 y RF-9: qué suena y cómo vibra cada momento de la apertura. Puro (sin navegador).
import { RARITIES, type Rarity } from "../catalog/card-rules";

export const SOUNDS = ["tear", "flip", "rare", "epic", "legendary", "secret"] as const;
export type SoundName = (typeof SOUNDS)[number];

const REVEAL: Partial<Record<Rarity, SoundName>> = { rare: "rare", epic: "epic", legendary: "legendary", secret: "secret" };

/** Milisegundos de vibración y pausa alternos (`navigator.vibrate`); más largos cuanto más rara. */
const VIBRATION: Partial<Record<Rarity, number[]>> = {
  rare: [30],
  epic: [45],
  legendary: [60, 40, 60],
  secret: [80, 40, 80, 40, 120],
};

/** RF-4: sonido extra al revelar una rara o mejor; las comunes y poco comunes solo suenan al voltearse. */
export function revealSound(rarity: Rarity): SoundName | null {
  return REVEAL[rarity] ?? null;
}

/** RF-9: patrón de vibración de una rara o mejor. */
export function vibrationPattern(rarity: Rarity): number[] | null {
  return VIBRATION[rarity] ?? null;
}

export function bestRarity(rarities: readonly Rarity[]): Rarity | null {
  return rarities.reduce<Rarity | null>((best, r) => (best === null || RARITIES.indexOf(r) > RARITIES.indexOf(best) ? r : best), null);
}

/** RF-5 y RF-9: «Abrir todos» suena y vibra una sola vez, según la mejor carta (o el volteo si no hay rara). */
export function openAllFinale(rarities: readonly Rarity[]): { sound: SoundName; vibration: number[] | null } | null {
  const best = bestRarity(rarities);
  if (best === null) return null;
  return { sound: revealSound(best) ?? "flip", vibration: vibrationPattern(best) };
}

const LEVEL: Partial<Record<Rarity, number>> = { rare: 1, epic: 2, legendary: 3, secret: 4 };

/** Spec 014, RF-12: intensidad del brillo de los bordes antes de voltear (0 = sin brillo). */
export function teaseLevel(rarity: Rarity): number {
  return LEVEL[rarity] ?? 0;
}

/** Spec 014, RF-13: pegatinas de confeti al revelar (más cuanto más rara). */
export function confettiCount(rarity: Rarity): number {
  return [0, 14, 20, 28, 36][teaseLevel(rarity)];
}

/** Spec 014, RF-13: celebración breve a pantalla completa. */
export function celebrates(rarity: Rarity): boolean {
  return teaseLevel(rarity) >= 3;
}
