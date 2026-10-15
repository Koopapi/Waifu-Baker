// Datos falsos para el prototipo /lab. Las imágenes de public/lab son renders SFW de
// calibración del taller de arte: solo para desarrollo local, nunca entran en un set real.

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "secret";

export interface LabCard {
  id: string;
  name: string;
  number: number;
  rarity: Rarity;
  holo: boolean;
  image: string;
  /** La imagen ya es la carta compuesta (marco, sello y número): no se dibujan etiquetas encima. */
  framed?: boolean;
  /** Aclaración para el resumen (p. ej. rareza sustituida en una simulación de borrador). */
  note?: string;
}

export const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary", "secret"];

const POOL: Omit<LabCard, "holo">[] = [
  { id: "c01", number: 1, name: "Special Week", rarity: "common", image: "/lab/01.webp" },
  { id: "c02", number: 2, name: "Daiwa Scarlet", rarity: "uncommon", image: "/lab/02.webp" },
  { id: "c03", number: 3, name: "Gold Ship", rarity: "rare", image: "/lab/03.webp" },
  { id: "c04", number: 4, name: "Tokai Teio", rarity: "common", image: "/lab/04.webp" },
  { id: "c05", number: 5, name: "Silence Suzuka", rarity: "epic", image: "/lab/05.webp" },
  { id: "c06", number: 6, name: "Mejiro McQueen", rarity: "rare", image: "/lab/06.webp" },
  { id: "c07", number: 7, name: "Momo", rarity: "common", image: "/lab/07.webp" },
  { id: "c08", number: 8, name: "Rouge", rarity: "legendary", image: "/lab/08.webp" },
  { id: "c09", number: 9, name: "Seiko", rarity: "uncommon", image: "/lab/09.webp" },
  { id: "c10", number: 10, name: "Prueba", rarity: "secret", image: "/lab/03.webp" },
  { id: "c11", number: 11, name: "Boceto", rarity: "common", image: "/lab/11.webp" },
];

// Misma forma que la drop table WB01 v1: ranuras 1-3, ranura 4 y ranura 5 (Rare+ garantizada).
const SLOTS: Record<Rarity, number>[] = [
  { common: 70, uncommon: 25, rare: 5, epic: 0, legendary: 0, secret: 0 },
  { common: 70, uncommon: 25, rare: 5, epic: 0, legendary: 0, secret: 0 },
  { common: 70, uncommon: 25, rare: 5, epic: 0, legendary: 0, secret: 0 },
  { common: 0, uncommon: 60, rare: 30, epic: 8, legendary: 2, secret: 0 },
  { common: 0, uncommon: 0, rare: 75, epic: 18, legendary: 6, secret: 1 },
];

const HOLO_CHANCE = 0.2;

function pickRarity(weights: Record<Rarity, number>): Rarity {
  const total = RARITY_ORDER.reduce((sum, r) => sum + weights[r], 0);
  let roll = Math.random() * total;
  for (const r of RARITY_ORDER) {
    roll -= weights[r];
    if (roll < 0) return r;
  }
  return "common";
}

function pickCard(rarity: Rarity): Omit<LabCard, "holo"> {
  // Si el pool de prueba no tiene esa rareza, baja hasta encontrar una.
  let idx = RARITY_ORDER.indexOf(rarity);
  while (idx >= 0) {
    const candidates = POOL.filter((c) => c.rarity === RARITY_ORDER[idx]);
    if (candidates.length) return candidates[Math.floor(Math.random() * candidates.length)];
    idx -= 1;
  }
  return POOL[0];
}

export function drawFakePack(): LabCard[] {
  return SLOTS.map((weights) => {
    const base = pickCard(pickRarity(weights));
    const rareOrBetter = RARITY_ORDER.indexOf(base.rarity) >= RARITY_ORDER.indexOf("rare");
    return { ...base, holo: rareOrBetter && Math.random() < HOLO_CHANCE };
  });
}
