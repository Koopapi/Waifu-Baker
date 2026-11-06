// Spec 029, RF-23: cuántos días tarda un coleccionista en llevar a un personaje al nivel 10 con el ritmo de sobres y
// expediciones. Valor esperado, sin azar: cada carta llega a un ritmo fijo de copias al día (por las tablas publicadas),
// las repetidas se reciclan todas y cada versión guarda una copia. Puro.
import { RARITIES, type Rarity } from "@/domain/catalog/card-rules";
import type { Slot } from "@/domain/catalog/odds";
import { BOND_THRESHOLDS, BOND_XP } from "@/domain/expeditions/rules";
import type { BondSettings } from "./settings";

export interface PaceProfile {
  silverPerMonth: number;
  goldPerMonth: number;
  /** Expediciones de 8 h al día en las que va el personaje. */
  expeditionsPerDay: number;
}

/** Supuestos de la spec 028 (60 plata y 4 gold al mes) y de la 021 (el patron, 8 sobres más y 3 espacios). */
export const PACE: Record<"free" | "patron", PaceProfile> = {
  free: { silverPerMonth: 60, goldPerMonth: 4, expeditionsPerDay: 2 },
  patron: { silverPerMonth: 68, goldPerMonth: 4, expeditionsPerDay: 3 },
};
export const SIM_MAX_DAYS = 3650;

export interface SimTable {
  slots: Partial<Slot>[];
  holoChance: number;
}

/** Copias esperadas por sobre de una carta de rareza `r` en una colección con `count[r]` cartas de esa rareza. */
function perPack(t: SimTable, r: Rarity, count: Record<Rarity, number>): number {
  if (!count[r]) return 0;
  return t.slots.reduce((a, s) => {
    const total = RARITIES.reduce((x, k) => x + (s[k] ?? 0), 0);
    return a + (total > 0 ? (s[r] ?? 0) / total : 0);
  }, 0) / count[r];
}

/** E[max(0, N − 1)] con N de Poisson de media m: las copias que se pueden reciclar. */
const spare = (m: number) => (m <= 0 ? 0 : m - 1 + Math.exp(-m));

/** Días hasta el nivel 10 (null si no llega en 10 años). */
export function daysToMaxBond(input: {
  character: Rarity[];
  setCards: Rarity[];
  silver: SimTable;
  gold: SimTable | null;
  pace: PaceProfile;
  settings: BondSettings;
}): number | null {
  const count = Object.fromEntries(RARITIES.map((r) => [r, input.setCards.filter((x) => x === r).length])) as Record<Rarity, number>;
  const s = input.settings;
  const rates = input.character.map((r) => {
    const silver = (input.pace.silverPerMonth / 30) * perPack(input.silver, r, count);
    const gold = input.gold ? (input.pace.goldPerMonth / 30) * perPack(input.gold, r, count) : 0;
    const holo = silver * input.silver.holoChance + (input.gold ? gold * input.gold.holoChance : 0);
    return { r, normal: silver + gold - holo, holo };
  });
  const target = BOND_THRESHOLDS[BOND_THRESHOLDS.length - 1];
  const daily = input.pace.expeditionsPerDay * BOND_XP[480];
  for (let d = 1; d <= SIM_MAX_DAYS; d++) {
    const xp = daily * d + rates.reduce((a, c) => a + s.points[c.r] * spare(c.normal * d) + s.points[c.r] * s.holoFactor * spare(c.holo * d), 0);
    if (xp >= target) return d;
  }
  return null;
}
