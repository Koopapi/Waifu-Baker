// Spec 026, RF-1 a RF-3: dos temas y el kawaii por defecto.
import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, THEMES, isTheme, parseTheme } from "./theme";

describe("temas", () => {
  it("test_s026_rf1_hay_dos_temas_kawaii_y_street_pop", () => {
    expect(THEMES).toEqual(["kawaii", "street"]);
  });

  it("test_s026_rf3_sin_eleccion_o_con_un_valor_raro_es_kawaii", () => {
    expect(DEFAULT_THEME).toBe("kawaii");
    for (const v of [undefined, null, "", "dark", "STREET", 1]) expect(parseTheme(v)).toBe("kawaii");
    expect(parseTheme("street")).toBe("street");
    expect(isTheme("street")).toBe(true);
    expect(isTheme("pastel")).toBe(false);
  });
});
