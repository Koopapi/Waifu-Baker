import { describe, expect, it } from "vitest";
import { drawPack } from "./draw";
import { seededRng } from "../random";
import { RARITIES, type Rarity } from "./card-rules";

const W = (o: Partial<Record<Rarity, number>>) => ({ common: 0, rare: 0, epic: 0, legendary: 0, ex: 0, ...o });
const SLOTS = [
  W({ common: 70, rare: 25, epic: 5 }),
  W({ common: 70, rare: 25, epic: 5 }),
  W({ common: 70, rare: 25, epic: 5 }),
  W({ common: 60, rare: 30, epic: 8, legendary: 2 }),
  W({ rare: 75, epic: 18, legendary: 6, ex: 1 }),
];
const CARDS = RARITIES.flatMap((r) => [1, 2, 3].map((i) => ({ id: `${r}-${i}`, rarity: r as Rarity })));

describe("Sorteo de un sobre (base de RF-23 y de la spec 004)", () => {
  it("es reproducible con la misma semilla y devuelve una carta por ranura", () => {
    const a = drawPack({ cards: CARDS, slots: SLOTS, holoChance: 0.2 }, seededRng(42));
    const b = drawPack({ cards: CARDS, slots: SLOTS, holoChance: 0.2 }, seededRng(42));
    expect(a).toEqual(b);
    expect(a).toHaveLength(5);
    for (const d of a) expect(CARDS.map((c) => c.id)).toContain(d.cardId);
  });

  it("la última ranura siempre trae Rara o superior", () => {
    const rng = seededRng(7);
    for (let i = 0; i < 2000; i++) {
      const last = drawPack({ cards: CARDS, slots: SLOTS, holoChance: 0 }, rng)[4];
      expect(["rare", "epic", "legendary", "ex"]).toContain(last.rarity);
    }
  });

  it("las frecuencias por ranura se ajustan a los porcentajes publicados (50 000 sobres, ±0,7 puntos)", () => {
    const rng = seededRng(2026);
    const N = 50_000;
    const counts = SLOTS.map(() => Object.fromEntries(RARITIES.map((r) => [r, 0])) as Record<Rarity, number>);
    for (let i = 0; i < N; i++) {
      drawPack({ cards: CARDS, slots: SLOTS, holoChance: 0 }, rng).forEach((d, s) => counts[s][d.rarity] += 1);
    }
    SLOTS.forEach((slot, s) => {
      for (const r of RARITIES) expect(Math.abs((counts[s][r] / N) * 100 - slot[r])).toBeLessThan(0.7);
    });
  });

  it("dentro de una rareza todas las cartas salen con la misma frecuencia", () => {
    const rng = seededRng(99);
    const hits = new Map<string, number>();
    for (let i = 0; i < 30_000; i++) {
      const d = drawPack({ cards: CARDS, slots: [W({ common: 100 })], holoChance: 0 }, rng)[0];
      hits.set(d.cardId, (hits.get(d.cardId) ?? 0) + 1);
    }
    for (const id of ["common-1", "common-2", "common-3"]) expect(Math.abs(hits.get(id)! / 30_000 - 1 / 3)).toBeLessThan(0.015);
  });

  it("test_s022_rf3_holo_en_cualquier_rareza_tambien_la_comun_y_con_la_probabilidad_indicada", () => {
    const rng = seededRng(5);
    const seen = Object.fromEntries(RARITIES.map((r) => [r, { n: 0, holo: 0 }])) as Record<Rarity, { n: number; holo: number }>;
    for (let i = 0; i < 20_000; i++) {
      for (const d of drawPack({ cards: CARDS, slots: SLOTS, holoChance: 0.2 }, rng)) {
        seen[d.rarity].n += 1;
        if (d.holo) seen[d.rarity].holo += 1;
      }
    }
    for (const r of ["common", "rare", "epic"] as const) expect(Math.abs(seen[r].holo / seen[r].n - 0.2)).toBeLessThan(0.01);
    expect(seen.legendary.holo).toBeGreaterThan(0);
  });

  it("en una simulación de borrador, una rareza sin cartas baja a la inmediatamente inferior y lo indica", () => {
    const onlyCommonRare = CARDS.filter((c) => c.rarity === "common" || c.rarity === "rare");
    const rng = seededRng(3);
    for (let i = 0; i < 500; i++) {
      const [d] = drawPack({ cards: onlyCommonRare, slots: [W({ epic: 100 })], holoChance: 0 }, rng);
      expect(d.rarity).toBe("rare");
      expect(d.substitutedFrom).toBe("epic");
    }
  });

  it("falla si la colección no tiene cartas", () => {
    expect(() => drawPack({ cards: [], slots: SLOTS, holoChance: 0 }, seededRng(1))).toThrow();
  });
});
