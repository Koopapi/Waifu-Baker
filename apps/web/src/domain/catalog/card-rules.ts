// Reglas puras sobre cartas: numeración (RF-15), carta completa y recuento por rareza (RF-17).

// Spec 022, RF-1: cinco rarezas (la poco común pasó a común y la secreta a EX).
export const RARITIES = ["common", "rare", "epic", "legendary", "ex"] as const;
export type Rarity = (typeof RARITIES)[number];

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Común",
  rare: "Rara",
  epic: "Épica",
  legendary: "Legendaria",
  ex: "EX",
};

export function consecutiveNumbers(orderedIds: string[]): Map<string, number> {
  if (new Set(orderedIds).size !== orderedIds.length) throw new Error("ids repetidos en el orden");
  return new Map(orderedIds.map((id, i) => [id, i + 1]));
}

export function isCardComplete(c: { characterId: string | null; name: string; rarity: Rarity | null; keyFull: string | null }) {
  return Boolean(c.characterId && c.name.trim() && c.rarity && c.keyFull);
}

export type RarityCounts = Record<Rarity | "none", number>;

export function rarityCounts(cards: { rarity: Rarity | null }[]): RarityCounts {
  const out = Object.fromEntries([...RARITIES, "none"].map((r) => [r, 0])) as RarityCounts;
  for (const c of cards) out[c.rarity ?? "none"] += 1;
  return out;
}

/** Rarezas que pueden salir en algún hueco del sobre pero no tienen ninguna carta. */
export function rarityGaps(cards: { rarity: Rarity | null }[], slots: Partial<Record<Rarity, number>>[]): Rarity[] {
  const counts = rarityCounts(cards);
  return RARITIES.filter((r) => slots.some((s) => (s[r] ?? 0) > 0) && counts[r] === 0);
}
