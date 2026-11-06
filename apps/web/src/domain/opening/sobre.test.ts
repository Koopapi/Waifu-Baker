// Spec 030: coreografía de la apertura con el sobre por capas y cartas especiales.
import { describe, expect, it } from "vitest";
import { isSpecial, omen, progressDots, sobreTimeline } from "./sobre";

describe("spec 030 — apertura con el sobre de Bruno", () => {
  it("test_s030_rf19_las_cartas_suben_a_0_38_el_sobre_se_va_a_1_25_y_el_mazo_queda_a_1_9", () => {
    expect(sobreTimeline(false)).toEqual({ rise: 380, hide: 1250, ready: 1900 });
    // Movimiento reducido: los tiempos de Bruno bajan a 0, 0,15 y 0,3 s.
    expect(sobreTimeline(true)).toEqual({ rise: 0, hide: 150, ready: 300 });
  });

  it("test_s030_rf22_el_efecto_especial_es_de_la_legendaria_y_la_ex", () => {
    expect((["common", "rare", "epic", "legendary", "ex"] as const).filter(isSpecial)).toEqual(["legendary", "ex"]);
  });

  it("test_s030_rf21_el_mazo_late_antes_de_voltear_una_legendaria_o_ex", () => {
    const cards = [{ rarity: "common" as const }, { rarity: "legendary" as const }, { rarity: "ex" as const }];
    expect(omen(cards, 0, false)).toBe(false);
    expect(omen(cards, 1, false)).toBe(true);
    // Ya revelada, deja de latir.
    expect(omen(cards, 1, true)).toBe(false);
    expect(omen(cards, 2, false)).toBe(true);
    expect(omen(cards, 3, false)).toBe(false);
  });

  it("test_s030_rf23_un_punto_por_carta_y_ninguno_con_una_sola", () => {
    expect(progressDots(5, 2)).toEqual(["done", "done", "current", "next", "next"]);
    expect(progressDots(1, 0)).toEqual([]);
  });
});
