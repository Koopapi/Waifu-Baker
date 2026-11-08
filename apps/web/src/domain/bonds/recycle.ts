// Spec 029, RF-1 a RF-3: reciclar repetidas. Cada versión (normal y holo) de cada carta conserva siempre una copia; cada
// copia reciclada suma los puntos de su rareza al vínculo del personaje y da la mitad del polvo; con el vínculo al
// máximo, el polvo completo y ningún punto. Sin azar. Puro.
import type { Rarity } from "@/domain/catalog/card-rules";
import { BOND_THRESHOLDS, bondLevel } from "@/domain/expeditions/rules";
import type { BondSettings } from "./settings";

export const MAX_BOND_LEVEL = BOND_THRESHOLDS.length;

/** RF-1: copias que se pueden reciclar de una versión (todas menos una). */
export const recyclableCopies = (qty: number) => Math.max(0, Math.floor(qty) - 1);

export interface RecycleItem {
  rarity: Rarity;
  holo: boolean;
  copies: number;
}

export interface RecyclePlan {
  copies: number;
  points: number;
  dust: number;
  xpBefore: number;
  xpAfter: number;
  levelBefore: number;
  levelAfter: number;
}

/**
 * RF-2 y RF-3: lo que da reciclar `items` partiendo de `xp`, copia a copia (si una copia lleva el vínculo al nivel
 * máximo, las siguientes ya dan el polvo completo). El polvo se suma con sus fracciones y se redondea hacia abajo al
 * final; los puntos, igual.
 */
export function planRecycle(items: readonly RecycleItem[], xp: number, s: BondSettings): RecyclePlan {
  let points = 0;
  let dust = 0;
  let copies = 0;
  let cur = xp;
  for (const it of items) {
    const f = it.holo ? s.holoFactor : 1;
    for (let i = 0; i < it.copies; i++) {
      copies++;
      if (bondLevel(Math.floor(cur)) >= MAX_BOND_LEVEL) {
        dust += s.dust[it.rarity] * f;
      } else {
        const p = s.points[it.rarity] * f;
        points += p;
        cur += p;
        dust += (s.dust[it.rarity] * f) / 2;
      }
    }
  }
  const gained = Math.floor(points + 1e-9);
  return {
    copies,
    points: gained,
    dust: Math.floor(dust + 1e-9),
    xpBefore: xp,
    xpAfter: xp + gained,
    levelBefore: bondLevel(xp),
    levelAfter: bondLevel(xp + gained),
  };
}
