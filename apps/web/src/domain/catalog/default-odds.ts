// Probabilidades iniciales de una colección nueva: ranuras normales, una ranura "mejorada" y la última con la garantía
// de su tipo de sobre. Spec 022: plata garantiza rara o mejor; gold, épica o mejor, y da más legendaria y EX.
import type { Rarity } from "./card-rules";

export type SlotWeights = Record<Rarity, number>;
export const PACK_KINDS = ["silver", "gold"] as const;
export type PackKind = (typeof PACK_KINDS)[number];

/** Spec 022: lee el tipo de sobre de un parámetro de la URL; cualquier otra cosa es plata. */
export const parsePackKind = (value: unknown): PackKind => (value === "gold" ? "gold" : "silver");

const TABLES: Record<PackKind, { base: SlotWeights; boosted: SlotWeights; guaranteed: SlotWeights }> = {
  silver: {
    base: { common: 75, rare: 20, epic: 4, legendary: 1, ex: 0 },
    boosted: { common: 40, rare: 45, epic: 12, legendary: 3, ex: 0 },
    guaranteed: { common: 0, rare: 78, epic: 17, legendary: 4.5, ex: 0.5 },
  },
  gold: {
    base: { common: 45, rare: 35, epic: 15, legendary: 4, ex: 1 },
    boosted: { common: 0, rare: 50, epic: 35, legendary: 12, ex: 3 },
    guaranteed: { common: 0, rare: 0, epic: 70, legendary: 25, ex: 5 },
  },
};

export function defaultSlots(packSize: number, kind: PackKind = "silver"): SlotWeights[] {
  const t = TABLES[kind];
  if (packSize <= 1) return [{ ...t.guaranteed }];
  if (packSize === 2) return [{ ...t.boosted }, { ...t.guaranteed }];
  return [...Array.from({ length: packSize - 2 }, () => ({ ...t.base })), { ...t.boosted }, { ...t.guaranteed }];
}

/** Rareza mínima de la última ranura de cada tipo (RF-14 y RF-15). */
export const GUARANTEE: Record<PackKind, Rarity> = { silver: "rare", gold: "epic" };

/**
 * Deja en cada ranura solo las rarezas que tienen cartas y reparte su peso en proporción (enteros que suman 100). Una
 * ranura sin ninguna rareza presente queda vacía (la validación lo señala). Para las semillas de desarrollo y la demo.
 */
export function onlyPresent(slots: Partial<SlotWeights>[], present: ReadonlySet<Rarity>): Partial<SlotWeights>[] {
  return slots.map((s) => {
    const kept = Object.entries(s).filter(([r, v]) => present.has(r as Rarity) && (v ?? 0) > 0);
    const total = kept.reduce((a, [, v]) => a + (v ?? 0), 0);
    const out: Partial<SlotWeights> = {};
    let acc = 0;
    kept.forEach(([r, v], i) => {
      const share = i === kept.length - 1 ? 100 - acc : Math.round(((v ?? 0) / total) * 100);
      out[r as Rarity] = share;
      acc += share;
    });
    return out;
  });
}
