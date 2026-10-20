import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FlightLayer } from "./FlightLayer";
import { FLIGHT_STAGGER_MS, createFlightStore, type FlightTarget } from "./flight";

const vp = { width: 390, height: 844 };
const target = (x: number, y: number): FlightTarget & { bounces: () => number } => {
  let n = 0;
  return { rect: { x, y, width: 40, height: 40 }, bounce: () => void (n += 1), bounces: () => n };
};

function setup(targets: FlightTarget[], reduced = false) {
  const events: string[] = [];
  const store = createFlightStore({ targets: () => targets, viewport: () => vp, reducedMotion: () => reduced, emit: (d) => events.push(d) });
  return { store, events };
}

describe("spec 015 — vuelo de premios", () => {
  it("test_s015_rf1_las_galletas_salen_escalonadas_hacia_el_contador_y_la_promesa_espera_a_la_ultima", async () => {
    const t = target(20, 60);
    const { store, events } = setup([t]);
    const landed = vi.fn();
    const p = store.fly({ from: { x: 175, y: 450, width: 40, height: 40 }, to: "cookies", sticker: "cookie", count: 3 }).then(landed);
    const items = store.getItems();
    expect(items).toHaveLength(3);
    expect(items.map((i) => i.delay)).toEqual([0, FLIGHT_STAGGER_MS, 2 * FLIGHT_STAGGER_MS]);
    expect(items[0].from).toEqual({ x: 195, y: 470 });
    expect(items[0].to).toEqual({ x: 40, y: 80 });
    expect(events).toEqual(["cookie>cookies"]);
    store.land(items[0].id);
    store.land(items[1].id);
    await Promise.resolve();
    expect(landed).not.toHaveBeenCalled();
    expect(t.bounces()).toBe(0);
    store.land(items[2].id);
    await p;
    expect(landed).toHaveBeenCalledWith({ landed: true });
    expect(t.bounces()).toBe(1);
    expect(store.getItems()).toEqual([]);
  });

  it("test_s015_rf2_el_sobre_vuela_al_acceso_visible_mas_cercano_y_lo_hace_rebotar", async () => {
    const tab = target(30, 790);
    const menu = target(-300, 100);
    const { store } = setup([menu, tab]);
    const p = store.fly({ from: { x: 100, y: 600, width: 190, height: 50 }, to: "packs", sticker: "pack" });
    expect(store.getItems()[0].to).toEqual({ x: 50, y: 810 });
    store.land(store.getItems()[0].id);
    expect(await p).toEqual({ landed: true });
    expect(tab.bounces()).toBe(1);
    expect(menu.bounces()).toBe(0);
  });

  it("test_s015_rf4_sin_destino_a_la_vista_vuela_al_borde_y_nadie_rebota", async () => {
    const hidden = target(100, 1200);
    const { store } = setup([hidden]);
    const p = store.fly({ from: { x: 100, y: 300, width: 40, height: 40 }, to: "cookies", sticker: "cookie" });
    expect(store.getItems()[0].to).toEqual({ x: 120, y: 820 });
    store.land(store.getItems()[0].id);
    expect(await p).toEqual({ landed: false });
    expect(hidden.bounces()).toBe(0);
  });

  it("test_s015_rf4_con_movimiento_reducido_no_vuela_nada_y_termina_al_momento", async () => {
    const t = target(20, 60);
    const { store, events } = setup([t], true);
    expect(await store.fly({ from: { x: 0, y: 0, width: 10, height: 10 }, to: "cookies", sticker: "cookie", count: 3 })).toEqual({ landed: true });
    expect(store.getItems()).toEqual([]);
    expect(events).toEqual(["cookie>cookies"]);
    expect(t.bounces()).toBe(0);
  });

  it("test_s015_rf4_aterrizar_dos_veces_el_mismo_premio_no_hace_nada", () => {
    const { store } = setup([target(0, 0)]);
    void store.fly({ from: { x: 0, y: 0, width: 10, height: 10 }, to: "x", sticker: "cookie" });
    const id = store.getItems()[0].id;
    store.land(id);
    expect(() => store.land(id)).not.toThrow();
  });

  it("test_s015_rf4_la_capa_no_bloquea_la_pantalla_ni_se_lee", () => {
    const out = renderToStaticMarkup(<FlightLayer />);
    expect(out).toContain('data-testid="flights"');
    expect(out).toContain("pointer-events-none");
    expect(out).toContain('aria-hidden="true"');
  });
});
