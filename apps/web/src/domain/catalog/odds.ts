// RF-20: validación y cálculo de probabilidades. Los pesos de cada ranura son porcentajes.
import { RARITIES, RARITY_LABEL, type Rarity } from "./card-rules";

export type Slot = Record<Rarity, number>;

export type ProblemTarget =
  | { kind: "slot"; index: number }
  | { kind: "rarity"; rarity: Rarity }
  | { kind: "card"; id: string; number: number }
  | { kind: "set" };

export interface Problem {
  code: string;
  message: string;
  target: ProblemTarget;
}

const EPS = 1e-6;

export function validateOdds(slots: Partial<Slot>[], packSize: number, holoChance: number): Problem[] {
  const out: Problem[] = [];
  if (slots.length !== packSize) {
    out.push({
      code: "slot_count",
      message: `El sobre tiene ${packSize} carta(s) pero hay ${slots.length} ranura(s) de probabilidad.`,
      target: { kind: "set" },
    });
  }
  slots.forEach((slot, index) => {
    const values = RARITIES.map((r) => slot[r] ?? 0);
    if (values.some((v) => v < 0 || !Number.isFinite(v))) {
      out.push({ code: "negative_weight", message: `La ranura ${index + 1} tiene pesos negativos o no válidos.`, target: { kind: "slot", index } });
    }
    const sum = values.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > EPS) {
      out.push({ code: "slot_sum", message: `La ranura ${index + 1} suma ${+sum.toFixed(4)} % en vez de 100 %.`, target: { kind: "slot", index } });
    }
  });
  if (!(holoChance >= 0 && holoChance <= 1)) {
    out.push({ code: "holo_range", message: "La probabilidad de holo debe estar entre 0 % y 100 %.", target: { kind: "set" } });
  }
  return out;
}

/** Probabilidad (0–1) de cada rareza en cada ranura. */
export function rarityTable(slots: Partial<Slot>[]): Record<Rarity, number[]> {
  return Object.fromEntries(RARITIES.map((r) => [r, slots.map((s) => (s[r] ?? 0) / 100)])) as Record<Rarity, number[]>;
}

/** Probabilidad de que cada carta salga al menos una vez en un sobre: 1 − Π(1 − p_ranura / n_rareza). */
export function cardChances(cards: { id: string; rarity: Rarity | null }[], slots: Partial<Slot>[]): Map<string, number> {
  const count = new Map<Rarity, number>();
  for (const c of cards) if (c.rarity) count.set(c.rarity, (count.get(c.rarity) ?? 0) + 1);
  const out = new Map<string, number>();
  for (const c of cards) {
    if (!c.rarity) {
      out.set(c.id, 0);
      continue;
    }
    const n = count.get(c.rarity)!;
    const miss = slots.reduce((acc, s) => acc * (1 - (s[c.rarity!] ?? 0) / 100 / n), 1);
    out.set(c.id, 1 - miss);
  }
  return out;
}

export const rarityName = (r: Rarity) => RARITY_LABEL[r];
