import { describe, expect, it } from "vitest";
import { arcPoints, center, flightDestination, isVisible } from "./flight";

const vp = { width: 390, height: 844 };
const r = (x: number, y: number, width = 40, height = 40) => ({ x, y, width, height });

describe("spec 015 — destino de un premio que vuela", () => {
  it("test_s015_rf4_vuela_al_destino_visible_mas_cercano", () => {
    const far = r(300, 60);
    const near = r(40, 780);
    const d = flightDestination([far, near], vp, { x: 60, y: 600 });
    expect(d).toEqual({ point: center(near), landed: true, index: 1 });
  });

  it("test_s015_rf4_si_el_destino_no_esta_a_la_vista_vuela_hacia_su_borde_sin_rebote", () => {
    const below = r(100, 1200);
    const d = flightDestination([below], vp, { x: 200, y: 400 });
    expect(d.landed).toBe(false);
    expect(d.index).toBe(-1);
    expect(d.point.y).toBe(vp.height - 24);
    expect(d.point.x).toBe(120);
    expect(isVisible(below, vp)).toBe(false);
  });

  it("test_s015_rf4_sin_destinos_vuela_hacia_arriba", () => {
    expect(flightDestination([], vp, { x: 150, y: 500 })).toEqual({ point: { x: 150, y: 24 }, landed: false, index: -1 });
  });

  it("test_s015_rf1_el_arco_sale_del_origen_llega_al_destino_y_se_eleva", () => {
    const from = { x: 195, y: 470 };
    const to = { x: 110, y: 82 };
    const pts = arcPoints(from, to, 10);
    expect(pts).toHaveLength(11);
    expect(pts[0]).toEqual(from);
    expect(pts[10].x).toBeCloseTo(to.x);
    expect(pts[10].y).toBeCloseTo(to.y);
    expect(Math.min(...pts.map((p) => p.y))).toBeLessThan(to.y);
  });
});
