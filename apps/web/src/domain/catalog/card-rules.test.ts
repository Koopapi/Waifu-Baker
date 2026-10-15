import { describe, expect, it } from "vitest";
import { consecutiveNumbers, isCardComplete, rarityCounts, rarityGaps } from "./card-rules";

describe("RF-15 numeración", () => {
  it("test_rf15_numera de 1 a n en el orden dado", () => {
    expect(consecutiveNumbers(["c", "a", "b"])).toEqual(new Map([["c", 1], ["a", 2], ["b", 3]]));
  });
  it("test_rf15_rechaza ids repetidos", () => {
    expect(() => consecutiveNumbers(["a", "a"])).toThrow();
  });
});

describe("Carta completa", () => {
  it("necesita personaje, nombre, rareza e imagen compuesta", () => {
    const full = { characterId: "x", name: "Aiko", rarity: "rare" as const, keyFull: "k" };
    expect(isCardComplete(full)).toBe(true);
    expect(isCardComplete({ ...full, characterId: null })).toBe(false);
    expect(isCardComplete({ ...full, name: "  " })).toBe(false);
    expect(isCardComplete({ ...full, rarity: null })).toBe(false);
    expect(isCardComplete({ ...full, keyFull: null })).toBe(false);
  });
});

describe("RF-17 recuento por rareza y huecos", () => {
  const cards = [{ rarity: "common" as const }, { rarity: "common" as const }, { rarity: "rare" as const }, { rarity: null }];
  it("test_rf17_cuenta cartas por rareza, incluidas las que no tienen", () => {
    expect(rarityCounts(cards)).toEqual({ common: 2, uncommon: 0, rare: 1, epic: 0, legendary: 0, secret: 0, none: 1 });
  });
  it("test_rf17_avisa de cada rareza con probabilidad pero sin cartas, en orden", () => {
    const slots = [
      { common: 70, uncommon: 25, rare: 5, epic: 0, legendary: 0, secret: 0 },
      { common: 0, uncommon: 0, rare: 75, epic: 18, legendary: 6, secret: 1 },
    ];
    expect(rarityGaps(cards, slots)).toEqual(["uncommon", "epic", "legendary", "secret"]);
  });
});
