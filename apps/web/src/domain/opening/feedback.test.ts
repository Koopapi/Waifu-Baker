import { describe, expect, it } from "vitest";
import { bestRarity, celebrates, confettiCount, openAllFinale, revealSound, teaseLevel, vibrationPattern } from "./feedback";

describe("spec 013 — sonido y vibración por rareza", () => {
  it("test_s013_rf4_rara_o_mejor_suena_su_nivel_y_comunes_y_poco_comunes_no", () => {
    expect(revealSound("common")).toBeNull();
    expect(revealSound("uncommon")).toBeNull();
    expect(revealSound("rare")).toBe("rare");
    expect(revealSound("epic")).toBe("epic");
    expect(revealSound("legendary")).toBe("legendary");
    expect(revealSound("secret")).toBe("secret");
  });

  it("test_s013_rf9_vibra_en_rara_o_mejor_y_mas_largo_en_legendaria_y_secreta", () => {
    expect(vibrationPattern("common")).toBeNull();
    expect(vibrationPattern("uncommon")).toBeNull();
    const total = (r: Parameters<typeof vibrationPattern>[0]) => (vibrationPattern(r) ?? []).reduce((a, b) => a + b, 0);
    expect(total("rare")).toBeGreaterThan(0);
    expect(total("epic")).toBeGreaterThanOrEqual(total("rare"));
    expect(total("legendary")).toBeGreaterThan(total("epic"));
    expect(total("secret")).toBeGreaterThan(total("legendary"));
  });

  it("test_s013_rf5_abrir_todos_suena_una_vez_con_la_mejor_carta", () => {
    expect(bestRarity(["common", "epic", "rare", "uncommon"])).toBe("epic");
    expect(bestRarity([])).toBeNull();
    expect(openAllFinale(["common", "legendary", "rare"])).toEqual({ sound: "legendary", vibration: vibrationPattern("legendary") });
  });

  it("test_s013_rf5_sin_ninguna_rara_suena_el_volteo_y_no_vibra", () => {
    expect(openAllFinale(["common", "uncommon"])).toEqual({ sound: "flip", vibration: null });
    expect(openAllFinale([])).toBeNull();
  });
});

describe("spec 014 — suspense de la apertura", () => {
  it("test_s014_rf12_solo_brillan_antes_de_voltear_las_raras_o_mejores_y_mas_cuanto_mas_raras", () => {
    expect(teaseLevel("common")).toBe(0);
    expect(teaseLevel("uncommon")).toBe(0);
    expect([teaseLevel("rare"), teaseLevel("epic"), teaseLevel("legendary"), teaseLevel("secret")]).toEqual([1, 2, 3, 4]);
  });

  it("test_s014_rf13_confeti_en_rara_o_mejor_y_celebracion_en_legendaria_y_secreta", () => {
    expect(confettiCount("common")).toBe(0);
    expect(confettiCount("uncommon")).toBe(0);
    expect(confettiCount("rare")).toBeGreaterThan(0);
    expect(confettiCount("secret")).toBeGreaterThan(confettiCount("legendary"));
    expect(confettiCount("legendary")).toBeGreaterThan(confettiCount("epic"));
    expect(confettiCount("epic")).toBeGreaterThan(confettiCount("rare"));
    expect(["common", "uncommon", "rare", "epic", "legendary", "secret"].filter((r) => celebrates(r as never))).toEqual(["legendary", "secret"]);
  });
});
