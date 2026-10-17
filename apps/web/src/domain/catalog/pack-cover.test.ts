import { describe, expect, it } from "vitest";
import { resolveCover } from "./pack-cover";

const cards = [
  { id: "c1", number: 1, rarity: "common" as const },
  { id: "c2", number: 2, rarity: "legendary" as const },
  { id: "c3", number: 3, rarity: "legendary" as const },
  { id: "c4", number: 4, rarity: null },
];

describe("spec 014 — portada del sobre", () => {
  it("test_s014_rf6_se_usa_la_portada_elegida", () => {
    expect(resolveCover(cards, "c1")).toBe("c1");
  });

  it("test_s014_rf6_sin_eleccion_se_usa_la_de_mayor_rareza_y_menor_numero", () => {
    expect(resolveCover(cards, null)).toBe("c2");
  });

  it("test_s014_rf6_una_portada_que_ya_no_esta_o_sin_rareza_no_vale", () => {
    expect(resolveCover(cards, "borrada")).toBe("c2");
    expect(resolveCover(cards, "c4")).toBe("c2");
  });

  it("test_s014_rf5_sin_cartas_con_rareza_no_hay_portada", () => {
    expect(resolveCover([{ id: "c4", number: 4, rarity: null }], null)).toBeNull();
  });
});
