// Probabilidades iniciales de una colección nueva: ranuras normales, una ranura "mejorada" y la última con la garantía
// de su tipo de sobre. Spec 022: plata garantiza rara o mejor; gold, épica o mejor, y da más legendaria y EX.
import type { Rarity } from "./card-rules";

export type SlotWeights = Record<Rarity, number>;
export const PACK_KINDS = ["silver", "gold"] as const;
export type PackKind = (typeof PACK_KINDS)[number];

/** Spec 022: lee el tipo de sobre de un parámetro de la URL; cualquier otra cosa es plata. */
export const parsePackKind = (value: unknown): PackKind => (value === "gold" ? "gold" : "silver");

/** Las tres filas de una tabla inicial: ranuras normales, la ranura mejorada (penúltima) y la última (garantía). */
export const TABLE_ROWS = ["base", "boosted", "guaranteed"] as const;
export type TableRow = (typeof TABLE_ROWS)[number];
export type KindTable = Record<TableRow, SlotWeights>;
export type OddsTables = Record<PackKind, KindTable>;

/**
 * Spec 028, RF-8 y RF-9 (5 nov 2026, «justas, pero que la EX sea difícil»): con 5 cartas, el plata trae al menos una EX
 * en el 0,20 % de los sobres y una legendaria en el 9,5 %; el gold, EX en el 5,9 % y legendaria en el 43 %. El panel
 * puede cambiarlas (RF-16); valen para las colecciones que se creen después.
 */
export const FACTORY_ODDS_TABLES: OddsTables = {
  silver: {
    base: { common: 72, rare: 22, epic: 5, legendary: 1, ex: 0 },
    boosted: { common: 35, rare: 48, epic: 14, legendary: 3, ex: 0 },
    guaranteed: { common: 0, rare: 80, epic: 16, legendary: 3.8, ex: 0.2 },
  },
  gold: {
    base: { common: 40, rare: 38, epic: 17, legendary: 4.5, ex: 0.5 },
    boosted: { common: 0, rare: 52, epic: 34, legendary: 12.5, ex: 1.5 },
    guaranteed: { common: 0, rare: 0, epic: 72, legendary: 25, ex: 3 },
  },
};

/**
 * Spec 028, RF-12 y RF-17: garantías que se proponen a una colección nueva, en sobres. La de épica cuenta los sobres
 * plata (spec 004); la de EX, los gold. 0 la desactiva.
 */
export interface PityDefaults {
  epic: number;
  ex: number;
}
export const FACTORY_PITY: PityDefaults = { epic: 10, ex: 20 };
export const PITY_RANGE = { min: 0, max: 100 } as const;

export function defaultSlots(packSize: number, kind: PackKind = "silver", tables: OddsTables = FACTORY_ODDS_TABLES): SlotWeights[] {
  const t = tables[kind];
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
