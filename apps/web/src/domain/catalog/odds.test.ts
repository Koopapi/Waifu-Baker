import { describe, expect, it } from "vitest";
import { cardChances, rarityTable, validateOdds } from "./odds";

const W = (o: Partial<Record<string, number>>) => ({ common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0, secret: 0, ...o });

describe("RF-20 probabilidades", () => {
  it("test_rf20_valida que cada ranura sume 100 y que haya una ranura por carta del sobre", () => {
    expect(validateOdds([W({ common: 70, rare: 30 }), W({ rare: 100 })], 2, 0.2)).toEqual([]);
    const errs = validateOdds([W({ common: 70, rare: 20 }), W({ rare: 100 })], 3, 0.2);
    expect(errs.map((e) => e.code)).toEqual(["slot_count", "slot_sum"]);
    expect(errs[1].target).toEqual({ kind: "slot", index: 0 });
  });

  it("test_rf20_rechaza pesos negativos y probabilidad de holo fuera de 0–1", () => {
    expect(validateOdds([W({ common: 110, rare: -10 })], 1, 0.2).map((e) => e.code)).toContain("negative_weight");
    expect(validateOdds([W({ rare: 100 })], 1, 1.5).map((e) => e.code)).toContain("holo_range");
  });

  it("test_rf20_porcentaje por rareza y ranura", () => {
    const t = rarityTable([W({ common: 70, uncommon: 25, rare: 5 }), W({ rare: 75, epic: 25 })]);
    expect(t.rare).toEqual([0.05, 0.75]);
    expect(t.epic).toEqual([0, 0.25]);
  });

  it("test_rf20_probabilidad de cada carta por sobre: 1 − Π(1 − p/n)", () => {
    const slots = [W({ common: 100 }), W({ common: 50, rare: 50 })];
    const cards = [
      { id: "c1", rarity: "common" as const },
      { id: "c2", rarity: "common" as const },
      { id: "r1", rarity: "rare" as const },
    ];
    const ch = cardChances(cards, slots);
    expect(ch.get("r1")).toBeCloseTo(0.5, 10);
    expect(ch.get("c1")).toBeCloseTo(1 - (1 - 0.5) * (1 - 0.25), 10);
  });

  it("test_rf20_una carta sin rareza o de rareza que no sale tiene 0", () => {
    const ch = cardChances([{ id: "x", rarity: null }, { id: "e", rarity: "epic" as const }], [W({ common: 100 })]);
    expect(ch.get("x")).toBe(0);
    expect(ch.get("e")).toBe(0);
  });
});
