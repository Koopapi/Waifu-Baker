import { describe, expect, it } from "vitest";
import { TEAR_COMMIT, revealOrder, swipeSide, tearCommits, tearProgress } from "./deck";

describe("spec 023 — rasgado", () => {
  it("test_s023_rf6_el_progreso_crece_con_el_arrastre_en_cualquier_sentido", () => {
    expect(tearProgress(50, 200)).toBe(0.25);
    expect(tearProgress(-50, 200)).toBe(0.25);
    expect(tearProgress(500, 200)).toBe(1);
    expect(tearProgress(10, 0)).toBe(0);
  });

  it("test_s023_rf7_rf8_al_soltar_desde_el_60_se_arranca_y_antes_vuelve", () => {
    expect(TEAR_COMMIT).toBe(0.6);
    expect(tearCommits(0.59)).toBe(false);
    expect(tearCommits(0.6)).toBe(true);
    expect(tearCommits(tearProgress(120, 200))).toBe(true);
  });
});

describe("spec 023 — mazo", () => {
  it("test_s023_rf13_de_menor_a_mayor_rareza_y_estable", () => {
    const pack = [
      { id: "a", rarity: "rare" as const },
      { id: "b", rarity: "common" as const },
      { id: "c", rarity: "ex" as const },
      { id: "d", rarity: "common" as const },
      { id: "e", rarity: "epic" as const },
    ];
    expect(revealOrder(pack).map((c) => c.id)).toEqual(["b", "d", "a", "e", "c"]);
    expect(pack[0].id).toBe("a");
  });

  it("test_s023_rf16_la_carta_sale_hacia_el_lado_del_gesto", () => {
    expect(swipeSide(-120)).toBe("left");
    expect(swipeSide(120)).toBe("right");
    expect(swipeSide(0)).toBe("right");
    expect(swipeSide(-10)).toBe("right");
  });
});
