// Sorteo de un sobre: una carta por ranura según los pesos publicados. Puro y con RNG inyectado;
// lo usan la simulación del panel (RF-23) y la apertura real (spec 004, en el servidor).
import type { Rng } from "../random";
import { RARITIES, type Rarity } from "./card-rules";
import type { Slot } from "./odds";

export interface DrawInput {
  cards: { id: string; rarity: Rarity | null }[];
  slots: Partial<Slot>[];
  holoChance: number;
}

export interface DrawnCard {
  slot: number;
  rarity: Rarity;
  cardId: string;
  holo: boolean;
  /** Solo en simulaciones de borrador: la rareza sorteada no tenía cartas y se usó la inferior. */
  substitutedFrom?: Rarity;
}

const RARE_INDEX = RARITIES.indexOf("rare");

function pickRarity(slot: Partial<Slot>, rng: Rng): Rarity {
  const total = RARITIES.reduce((a, r) => a + (slot[r] ?? 0), 0);
  let roll = rng.next() * total;
  for (const r of RARITIES) {
    roll -= slot[r] ?? 0;
    if (roll < 0) return r;
  }
  return [...RARITIES].reverse().find((r) => (slot[r] ?? 0) > 0) ?? "common";
}

export interface DrawOptions {
  /**
   * Spec 014, RF-21 (sorteo v2): no repetir carta dentro del sobre. La rareza se sortea igual; la carta se elige
   * entre las de esa rareza que aún no están en el sobre (si no queda ninguna, se permite repetir).
   */
  unique?: boolean;
  /** Cartas que ya están en el sobre (para la protección, que vuelve a sortear una ranura). */
  exclude?: readonly string[];
}

export function drawPack(input: DrawInput, rng: Rng, opts: DrawOptions = {}): DrawnCard[] {
  const byRarity = new Map<Rarity, string[]>();
  for (const c of input.cards) if (c.rarity) byRarity.set(c.rarity, [...(byRarity.get(c.rarity) ?? []), c.id]);
  if (byRarity.size === 0) throw new Error("La colección no tiene cartas con rareza.");
  const taken = new Set(opts.exclude ?? []);

  return input.slots.map((slot, i) => {
    const wanted = pickRarity(slot, rng);
    let idx = RARITIES.indexOf(wanted);
    while (idx >= 0 && !byRarity.has(RARITIES[idx])) idx -= 1;
    if (idx < 0) idx = RARITIES.findIndex((r) => byRarity.has(r));
    const rarity = RARITIES[idx];
    const all = byRarity.get(rarity)!;
    const free = opts.unique ? all.filter((id) => !taken.has(id)) : all;
    const pool = free.length > 0 ? free : all;
    const cardId = pool[Math.floor(rng.next() * pool.length)];
    taken.add(cardId);
    const holo = idx >= RARE_INDEX && rng.next() < input.holoChance;
    return { slot: i, rarity, cardId, holo, ...(rarity !== wanted ? { substitutedFrom: wanted } : {}) };
  });
}

export interface PityDraw extends DrawnCard {
  /** La protección sustituyó esta carta. */
  pity?: boolean;
}

export interface PityResult {
  draws: PityDraw[];
  pityApplied: boolean;
  /** Tocaba la protección pero la tabla no tiene ningún peso de épica o superior. */
  pityUnavailable?: boolean;
}

/**
 * RF-13: sorteo normal y, si toca la protección y no salió épica o superior, la última ranura se
 * vuelve a sortear solo entre épica, legendaria y secreta (con sus pesos en esa ranura; si suman
 * cero, con los pesos sumados de todo el sobre).
 */
export function drawPackWithPity(input: DrawInput, rng: Rng, pity: boolean, opts: DrawOptions = {}): PityResult {
  const draws: PityDraw[] = drawPack(input, rng, opts);
  const epicIdx = RARITIES.indexOf("epic");
  if (!pity || draws.some((d) => RARITIES.indexOf(d.rarity) >= epicIdx)) return { draws, pityApplied: false };

  const top = RARITIES.slice(epicIdx);
  const last = input.slots[input.slots.length - 1] ?? {};
  let weights: Partial<Slot> = Object.fromEntries(top.map((r) => [r, last[r] ?? 0]));
  if (top.every((r) => !weights[r])) {
    weights = Object.fromEntries(top.map((r) => [r, input.slots.reduce((a, s) => a + (s[r] ?? 0), 0)]));
  }
  const available = top.filter((r) => (weights[r] ?? 0) > 0 && input.cards.some((c) => c.rarity === r));
  if (available.length === 0) return { draws, pityApplied: false, pityUnavailable: true };

  const restricted = Object.fromEntries(RARITIES.map((r) => [r, available.includes(r) ? weights[r] ?? 0 : 0])) as Partial<Slot>;
  const [replacement] = drawPack({ ...input, slots: [restricted] }, rng, { ...opts, exclude: draws.slice(0, -1).map((d) => d.cardId) });
  draws[draws.length - 1] = { ...replacement, slot: draws.length - 1, pity: true };
  return { draws, pityApplied: true };
}
