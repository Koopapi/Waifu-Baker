// Spec 028, RF-21 y RF-23: el abanico de la portada (componente del sistema). Puro.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CardFan, fanLayout } from "./CardFan";

describe("spec 028 — abanico de cartas", () => {
  it("test_s028_rf21_el_abanico_de_5_es_el_de_la_demo_y_el_centro_va_delante", () => {
    expect(fanLayout(5)).toEqual([
      { rot: -14, x: -190, y: 34, z: 6 },
      { rot: -7, x: -95, y: 10, z: 8 },
      { rot: 0, x: 0, y: 0, z: 10 },
      { rot: 7, x: 95, y: 10, z: 8 },
      { rot: 14, x: 190, y: 34, z: 6 },
    ]);
    const three = fanLayout(3);
    expect(three.map((p) => p.x)).toEqual([-95, 0, 95]);
    expect(fanLayout(4).map((p) => p.rot)).toEqual([-10.5, -3.5, 3.5, 10.5]);
  });

  it("test_s028_rf21_muestra_cada_carta_en_su_orden_y_es_decorativo", () => {
    const out = renderToStaticMarkup(<CardFan cards={["a", "b", "c"].map((k) => ({ key: k, src: `/api/cover/${k}` }))} data-testid="fan" />);
    expect(out).toContain('aria-hidden="true"');
    expect(out).toContain('data-count="3"');
    expect([...out.matchAll(/src="([^"]+)"/g)].map((m) => m[1])).toEqual(["/api/cover/a", "/api/cover/b", "/api/cover/c"]);
    expect(out).toContain('alt=""');
  });

  it("test_s028_rf23_sin_cartas_no_dibuja_nada", () => {
    expect(renderToStaticMarkup(<CardFan cards={[]} />)).toBe("");
  });
});
