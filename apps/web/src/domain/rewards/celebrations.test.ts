import { describe, expect, it } from "vitest";
import { current, dismiss, enqueue, isOpeningRoute } from "./celebrations";

describe("spec 015 — cola de celebraciones", () => {
  it("test_s015_rf9_salen_de_una_en_una_y_en_orden", () => {
    let q = enqueue([], { key: "streak:7" });
    q = enqueue(q, { key: "arrivals:a,b" });
    expect(current(q, false)).toEqual({ key: "streak:7" });
    q = dismiss(q);
    expect(current(q, false)).toEqual({ key: "arrivals:a,b" });
    expect(current(dismiss(q), false)).toBeNull();
  });

  it("test_s015_rf7_la_misma_celebracion_no_se_encola_dos_veces", () => {
    const q = enqueue(enqueue([], { key: "arrivals:a" }), { key: "arrivals:a" });
    expect(q).toHaveLength(1);
  });

  it("test_s015_rf9_en_la_apertura_no_sale_ninguna_pero_la_cola_se_conserva", () => {
    const q = enqueue([], { key: "arrivals:a" });
    expect(current(q, true)).toBeNull();
    expect(current(q, false)).toEqual({ key: "arrivals:a" });
  });

  it("test_s015_rf9_las_rutas_de_apertura_son_las_de_un_sobre_y_abrir_todos", () => {
    expect(isOpeningRoute("/packs/abc-123")).toBe(true);
    expect(isOpeningRoute("/packs/abc-123/all")).toBe(true);
    expect(isOpeningRoute("/packs")).toBe(false);
    expect(isOpeningRoute("/rewards")).toBe(false);
    expect(isOpeningRoute("/collection/abc")).toBe(false);
  });
});
