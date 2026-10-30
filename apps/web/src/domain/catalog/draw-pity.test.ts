import { describe, expect, it } from "vitest";
import { drawPack, drawPackWithPity } from "./draw";
import { seededRng } from "../random";
import { RARITIES, type Rarity } from "./card-rules";
import { isEpicPlus } from "./pity";

const W = (o: Partial<Record<Rarity, number>>) => ({ common: 0, rare: 0, epic: 0, legendary: 0, ex: 0, ...o });
const CARDS = RARITIES.flatMap((r) => [1, 2].map((i) => ({ id: `${r}-${i}`, rarity: r as Rarity })));
const SLOTS = [W({ common: 100 }), W({ rare: 80, epic: 15, legendary: 4, ex: 1 })];

describe("Sorteo con protección (RF-5, RF-13)", () => {
  it("test_s004_rf13_si toca la protección, siempre hay épica o superior", () => {
    const rng = seededRng(11);
    for (let i = 0; i < 3000; i++) {
      const r = drawPackWithPity({ cards: CARDS, slots: SLOTS, holoChance: 0 }, rng, true);
      expect(r.draws.some((d) => isEpicPlus(d.rarity))).toBe(true);
    }
  });

  it("test_s004_rf13_sin protección el resultado es idéntico al sorteo normal", () => {
    const a = drawPackWithPity({ cards: CARDS, slots: SLOTS, holoChance: 0.2 }, seededRng(5), false);
    const b = drawPack({ cards: CARDS, slots: SLOTS, holoChance: 0.2 }, seededRng(5));
    expect(a.draws).toEqual(b);
    expect(a.pityApplied).toBe(false);
  });

  it("test_s004_rf13_solo sustituye la última ranura y lo indica", () => {
    const rng = seededRng(21);
    let applied = 0;
    for (let i = 0; i < 2000; i++) {
      const r = drawPackWithPity({ cards: CARDS, slots: SLOTS, holoChance: 0 }, rng, true);
      expect(r.draws[0].rarity).toBe("common");
      if (r.pityApplied) {
        applied++;
        expect(r.draws[1].pity).toBe(true);
        expect(isEpicPlus(r.draws[1].rarity)).toBe(true);
      }
    }
    expect(applied).toBeGreaterThan(0);
  });

  it("si la última ranura no tiene peso para épica o superior, usa los pesos sumados del sobre", () => {
    const slots = [W({ epic: 10, common: 90 }), W({ rare: 100 })];
    const r = drawPackWithPity({ cards: CARDS, slots, holoChance: 0 }, seededRng(3), true);
    expect(r.draws.some((d) => isEpicPlus(d.rarity))).toBe(true);
  });

  it("si no hay ningún peso de épica o superior, no actúa y lo indica", () => {
    const slots = [W({ common: 100 }), W({ rare: 100 })];
    const r = drawPackWithPity({ cards: CARDS, slots, holoChance: 0 }, seededRng(3), true);
    expect(r.pityApplied).toBe(false);
    expect(r.pityUnavailable).toBe(true);
  });
});
