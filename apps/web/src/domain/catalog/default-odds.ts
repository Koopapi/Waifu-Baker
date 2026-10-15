// Probabilidades iniciales de una colección nueva, con la forma de WB01 v1:
// ranuras normales, una ranura "mejorada" y la última con Rare+ garantizada.

export type SlotWeights = Record<"common" | "uncommon" | "rare" | "epic" | "legendary" | "secret", number>;

const BASE: SlotWeights = { common: 70, uncommon: 25, rare: 5, epic: 0, legendary: 0, secret: 0 };
const BOOSTED: SlotWeights = { common: 0, uncommon: 60, rare: 30, epic: 8, legendary: 2, secret: 0 };
const GUARANTEED: SlotWeights = { common: 0, uncommon: 0, rare: 75, epic: 18, legendary: 6, secret: 1 };

export function defaultSlots(packSize: number): SlotWeights[] {
  if (packSize <= 1) return [{ ...GUARANTEED }];
  if (packSize === 2) return [{ ...BOOSTED }, { ...GUARANTEED }];
  return [...Array.from({ length: packSize - 2 }, () => ({ ...BASE })), { ...BOOSTED }, { ...GUARANTEED }];
}
