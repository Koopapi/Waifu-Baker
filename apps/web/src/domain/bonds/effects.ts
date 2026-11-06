// Spec 029, RF-9 a RF-12 y RF-14: lo que se ve en las cartas de un personaje según su nivel de vínculo. Son efectos que
// la carta por capas ya pinta (brillo de capa, holo, marco personalizado y partículas): ni arte nuevo ni poder nuevo
// (el holo del nivel 5 es solo visual, RF-10). Puro.
import type { TitleLevel } from "./settings";
import { TITLE_LEVELS } from "./settings";

export const BOND_GLOSS_LEVEL = 3;
export const BOND_HOLO_LEVEL = 5;
export const BOND_FRAME_LEVEL = 7;
export const BOND_MASTERY_LEVEL = 10;
/** Marco de vínculo: rosa y oro, con el marco personalizado de carta-capas (spec 025). */
export const BOND_FRAME_COLORS = { color: "#ff5fa2", brillo: "#ffd45e" } as const;
export const BOND_PARTICLES = { particulas: "corazones", cantidad: 24, profundidad: 0.8, margen: 4, opacidad: 0.85 } as const;

export type BondUnlock = "gloss" | "holo" | "frame" | "mastery";
const UNLOCKS: { level: number; unlock: BondUnlock }[] = [
  { level: BOND_GLOSS_LEVEL, unlock: "gloss" },
  { level: BOND_HOLO_LEVEL, unlock: "holo" },
  { level: BOND_FRAME_LEVEL, unlock: "frame" },
  { level: BOND_MASTERY_LEVEL, unlock: "mastery" },
];

export function bondEffects(level: number) {
  return { gloss: level >= BOND_GLOSS_LEVEL, holo: level >= BOND_HOLO_LEVEL, frame: level >= BOND_FRAME_LEVEL, mastery: level >= BOND_MASTERY_LEVEL };
}

/** RF-15: lo que desbloquea el siguiente hito (null en el nivel 10). Cada nivel da además +2 % de poder. */
export function nextUnlock(level: number): { level: number; unlock: BondUnlock } | null {
  return UNLOCKS.find((u) => u.level > level) ?? null;
}

/** RF-14: el hito de título del nivel (el más alto alcanzado), o null en el nivel 1. */
export function titleLevel(level: number): TitleLevel | null {
  return [...TITLE_LEVELS].reverse().find((l) => level >= l) ?? null;
}

/** Forma mínima de la configuración viva que tocan los efectos (la de `domain/cards/live`). */
interface LiveLike {
  capas: ({ rol?: string; brillo?: { tipo: string; intensidad?: number }; src?: string; key?: string } | { particulas: string })[];
  marco: string;
  marcoColores?: { color: string; brillo: string };
  holo?: boolean;
}

const isImage = (l: LiveLike["capas"][number]): l is Exclude<LiveLike["capas"][number], { particulas: string }> => !("particulas" in l);

/** RF-9 a RF-11: la configuración de la carta con los efectos de su nivel (no cambia la original). */
export function applyBondEffects<T extends LiveLike>(config: T, level: number): T {
  const e = bondEffects(level);
  if (!e.gloss) return config;
  let capas = config.capas.map((l) => (isImage(l) && l.rol === "personaje" && !l.brillo ? { ...l, brillo: { tipo: "destello", intensidad: 0.6 } } : l));
  let out: T = { ...config, capas };
  if (e.holo) out = { ...out, holo: true };
  if (e.frame) {
    const at = capas.findIndex((l) => isImage(l) && l.rol === "personaje");
    capas = [...capas];
    capas.splice(at >= 0 ? at : capas.length, 0, { ...BOND_PARTICLES, semilla: 29 } as never);
    out = { ...out, capas, marco: config.marco === "ninguno" ? config.marco : "personalizado", marcoColores: { ...BOND_FRAME_COLORS } };
  }
  return out;
}
