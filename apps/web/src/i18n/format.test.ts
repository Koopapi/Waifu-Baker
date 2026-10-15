import { describe, expect, it } from "vitest";
import { formatDate, formatMoney, formatNumber, formatPercent } from "./format";

describe("spec 008 — formato por idioma", () => {
  it("test_s008_rf6_fechas_segun_el_idioma", () => {
    const d = new Date("2026-10-15T12:00:00Z");
    expect(formatDate("en", d)).toBe("October 15, 2026");
    expect(formatDate("es", d)).toBe("15 de octubre de 2026");
  });

  it("test_s008_rf6_numeros_porcentajes_y_precios_segun_el_idioma", () => {
    expect(formatNumber("en", 1234.5)).toBe("1,234.5");
    expect(formatNumber("es", 1234.5)).toBe("1234,5");
    expect(formatPercent("en", 12.5)).toBe("12.5 %");
    expect(formatPercent("es", 12.5)).toBe("12,5 %");
    expect(formatMoney("en", 300)).toBe("$3.00");
    expect(formatMoney("es", 300)).toMatch(/^3,00\sUS\$$/);
  });
});
