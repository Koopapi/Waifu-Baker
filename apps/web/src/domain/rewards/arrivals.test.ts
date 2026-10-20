import { describe, expect, it } from "vitest";
import { arrivalsKey, groupArrivals, isArrival, newArrivalsBySet, originOf, type ArrivalPack } from "./arrivals";

const at = (iso: string) => new Date(iso);
const pack = (id: string, over: Partial<ArrivalPack> = {}): ArrivalPack => ({
  id,
  setId: "fa01",
  code: "FA01",
  name: "Fan Art · Vol. 1",
  source: "manual",
  reason: null,
  grantedAt: at("2026-10-18T10:00:00Z"),
  ...over,
});

describe("spec 015 — llegadas", () => {
  it("test_s015_rf6_son_llegadas_los_sobres_sellados_de_bienvenida_regalo_y_suscripcion", () => {
    expect(isArrival({ source: "promo", status: "sealed" })).toBe(true);
    expect(isArrival({ source: "manual", status: "sealed" })).toBe(true);
    expect(isArrival({ source: "tier_grant", status: "sealed" })).toBe(true);
    expect(isArrival({ source: "free", status: "sealed" })).toBe(false);
    expect(isArrival({ source: "daily", status: "sealed" })).toBe(false);
    expect(isArrival({ source: "manual", status: "void" })).toBe(false);
    expect(isArrival({ source: "manual", status: "opened" })).toBe(false);
  });

  it("test_s015_rf6_el_origen_dice_de_donde_vienen", () => {
    expect(originOf({ source: "promo", reason: "welcome" })).toBe("welcome");
    expect(originOf({ source: "promo", reason: "promo:x" })).toBe("gift");
    expect(originOf({ source: "manual", reason: "gift" })).toBe("gift");
    expect(originOf({ source: "tier_grant", reason: null })).toBe("tier");
  });

  it("test_s015_rf6_una_sola_celebracion_junta_las_llegadas_por_coleccion_y_con_su_origen", () => {
    const g = groupArrivals([pack("a"), pack("b"), pack("c", { setId: "aa01", code: "AA01", name: "Alfa" })])!;
    expect(g.total).toBe(3);
    expect(g.ids).toEqual(["a", "b", "c"]);
    expect(g.sets).toEqual([
      { setId: "aa01", code: "AA01", name: "Alfa", count: 1 },
      { setId: "fa01", code: "FA01", name: "Fan Art · Vol. 1", count: 2 },
    ]);
    expect(g.origin).toBe("gift");
    expect(groupArrivals([pack("a", { source: "tier_grant" }), pack("b")])!.origin).toBe("mixed");
    expect(groupArrivals([])).toBeNull();
  });

  it("test_s015_rf7_la_misma_tanda_tiene_la_misma_identidad_en_cualquier_orden", () => {
    expect(arrivalsKey(["b", "a"])).toBe(arrivalsKey(["a", "b"]));
    expect(arrivalsKey(["a"])).not.toBe(arrivalsKey(["a", "b"]));
  });

  it("test_s015_rf8_son_nuevas_las_llegadas_posteriores_a_la_ultima_visita", () => {
    const packs = [pack("a", { grantedAt: at("2026-10-18T09:00:00Z") }), pack("b"), pack("c", { setId: "aa01" })];
    expect([...newArrivalsBySet(packs, at("2026-10-18T09:30:00Z"))]).toEqual([
      ["fa01", 1],
      ["aa01", 1],
    ]);
    expect([...newArrivalsBySet(packs, null)]).toEqual([
      ["fa01", 2],
      ["aa01", 1],
    ]);
    expect(newArrivalsBySet(packs, at("2026-10-18T11:00:00Z")).size).toBe(0);
  });
});
