// Datos falsos para el prototipo /lab. Las imágenes de public/lab son renders SFW de
// calibración del taller de arte: solo para desarrollo local, nunca entran en un set real.
import type { LiveCard } from "@/domain/cards/live";

// Spec 022: las cinco rarezas del juego.
export type { Rarity } from "@/domain/catalog/card-rules";
import type { Rarity } from "@/domain/catalog/card-rules";

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
  /** Spec 018, RF-6: la carta viva que se monta al revelarla (sin ella, se ve la imagen fija). */
  live?: LiveCard | null;
}

export const RARITY_ORDER: Rarity[] = ["common", "rare", "epic", "legendary", "ex"];

const POOL: Omit<LabCard, "holo">[] = [
  { id: "c01", number: 1, name: "Special Week", rarity: "common", image: "/lab/01.webp" },
  { id: "c02", number: 2, name: "Daiwa Scarlet", rarity: "common", image: "/lab/02.webp" },
  { id: "c03", number: 3, name: "Gold Ship", rarity: "rare", image: "/lab/03.webp" },
  { id: "c04", number: 4, name: "Tokai Teio", rarity: "common", image: "/lab/04.webp" },
  { id: "c05", number: 5, name: "Silence Suzuka", rarity: "epic", image: "/lab/05.webp" },
  { id: "c06", number: 6, name: "Mejiro McQueen", rarity: "rare", image: "/lab/06.webp" },
  { id: "c07", number: 7, name: "Momo", rarity: "common", image: "/lab/07.webp" },
  { id: "c08", number: 8, name: "Rouge", rarity: "legendary", image: "/lab/08.webp" },
  { id: "c09", number: 9, name: "Seiko", rarity: "rare", image: "/lab/09.webp" },
  { id: "c10", number: 10, name: "Prueba", rarity: "ex", image: "/lab/03.webp" },
  { id: "c11", number: 11, name: "Boceto", rarity: "common", image: "/lab/11.webp" },
];

// Misma forma que la tabla plata por defecto (spec 022): ranuras 1-3, ranura 4 y ranura 5 (rara o mejor garantizada).
const SLOTS: Record<Rarity, number>[] = [
  { common: 75, rare: 20, epic: 4, legendary: 1, ex: 0 },
  { common: 75, rare: 20, epic: 4, legendary: 1, ex: 0 },
  { common: 75, rare: 20, epic: 4, legendary: 1, ex: 0 },
  { common: 40, rare: 45, epic: 12, legendary: 3, ex: 0 },
  { common: 0, rare: 78, epic: 17, legendary: 4.5, ex: 0.5 },
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
