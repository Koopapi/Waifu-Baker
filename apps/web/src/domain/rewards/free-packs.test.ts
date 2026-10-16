import { describe, expect, it } from "vitest";
import { FREE_INTERVAL_MS, FREE_MAX, currentFree, spendFree } from "./free-packs";

const t0 = new Date("2026-10-15T08:00:00Z");
const at = (h: number) => new Date(t0.getTime() + h * 3_600_000);

describe("spec 009 — cargas de sobre gratis", () => {
  it("test_s009_rf1_una_carga_cada_12_horas_hasta_2", () => {
    expect(FREE_INTERVAL_MS).toBe(12 * 3_600_000);
    expect(currentFree({ charges: 0, anchor: t0 }, at(11.9))).toMatchObject({ charges: 0, nextAt: at(12) });
    expect(currentFree({ charges: 0, anchor: t0 }, at(12))).toMatchObject({ charges: 1, nextAt: at(24) });
    expect(currentFree({ charges: 0, anchor: t0 }, at(24))).toMatchObject({ charges: 2, nextAt: null });
    expect(currentFree({ charges: 0, anchor: t0 }, at(24 * 30)).charges).toBe(FREE_MAX);
  });

  it("test_s009_rf2_con_2_cargas_no_empieza_la_siguiente_hasta_gastar_una", () => {
    const full = { charges: 2, anchor: t0 };
    expect(currentFree(full, at(100))).toMatchObject({ charges: 2, nextAt: null });
    const after = spendFree(full, at(100))!;
    expect(after).toEqual({ charges: 1, anchor: at(100) });
    expect(currentFree(after, at(111)).charges).toBe(1);
    expect(currentFree(after, at(112)).charges).toBe(2);
  });

  it("test_s009_rf6_sin_cargas_no_se_puede_gastar_y_gastar_conserva_el_progreso", () => {
    expect(spendFree({ charges: 0, anchor: t0 }, at(5))).toBeNull();
    // Con 1 carga y 5 h de progreso hacia la siguiente, gastar no pierde ese progreso.
    const s = spendFree({ charges: 1, anchor: t0 }, at(5))!;
    expect(s).toEqual({ charges: 0, anchor: t0 });
    expect(currentFree(s, at(12)).charges).toBe(1);
  });
});
