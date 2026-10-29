import { describe, expect, it } from "vitest";
import type { LayersConfig } from "./layers";
import { kindForLayer, layerFromPreset, libraryKey, libraryName, presetFromLayer, uploadKindFor, usesByKey } from "./library";

describe("spec 017 — biblioteca de elementos", () => {
  it("test_s017_rf7_fondos_y_adornos_siguen_las_reglas_del_lienzo_y_los_sellos_las_del_sello", () => {
    expect(uploadKindFor("fondo")).toBe("layer");
    expect(uploadKindFor("adorno")).toBe("layer");
    expect(uploadKindFor("sello")).toBe("seal");
    expect(libraryKey("a".repeat(64))).toBe(`library/${"a".repeat(64)}.webp`);
  });

  it("test_s017_rf21_una_capa_de_la_carta_se_guarda_como_fondo_o_adorno_y_la_chica_no", () => {
    expect(kindForLayer({ key: "k", rol: "fondo" })).toBe("fondo");
    expect(kindForLayer({ key: "k", rol: "extra" })).toBe("adorno");
    expect(kindForLayer({ key: "k" })).toBe("adorno");
    expect(kindForLayer({ key: "k", rol: "personaje" })).toBeNull();
  });

  it("test_s017_rf9_las_particulas_guardadas_se_copian_sin_semilla_ni_posicion", () => {
    const preset = presetFromLayer({ particulas: "petalos", cantidad: 40, tamano: 1.5, color: "#ff7eb6", semilla: 9, profundidad: 0.3, margen: 2, visible: false });
    expect(preset).toEqual({ particulas: "petalos", cantidad: 40, tamano: 1.5, color: "#ff7eb6" });
    // Al usarla se copia a la carta, con su propia semilla y la posición por defecto.
    expect(layerFromPreset(preset, 77)).toEqual({ particulas: "petalos", cantidad: 40, tamano: 1.5, color: "#ff7eb6", semilla: 77, profundidad: 0.55, margen: 4 });
  });

  it("test_s017_rf6_el_nombre_se_limpia_y_tiene_un_limite", () => {
    expect(libraryName("  Sello SSR dorado.png ")).toBe("Sello SSR dorado");
    expect(libraryName("   ")).toBeNull();
    expect(libraryName("x".repeat(100))).toHaveLength(60);
  });

  it("test_s017_rf9_el_uso_cuenta_cartas_y_colecciones_por_imagen", () => {
    const cfg = (keys: string[], sello?: string): LayersConfig => ({ capas: keys.map((key) => ({ key })), marco: "n", sello: sello ? { key: sello, esquina: "sup-izq" } : null });
    const uses = usesByKey([
      { setCode: "FA01", layers: cfg(["library/f", "x"], "library/s"), pending: null },
      { setCode: "FA01", layers: cfg(["library/f"]), pending: cfg(["library/f"]) },
      { setCode: "KAW1", layers: cfg(["library/f", "library/f"]), pending: null },
    ]);
    // Cada carta cuenta una vez aunque use la imagen dos veces o también en lo pendiente.
    expect(uses.get("library/f")).toEqual({ cards: 3, sets: ["FA01", "KAW1"] });
    expect(uses.get("library/s")).toEqual({ cards: 1, sets: ["FA01"] });
  });
});
