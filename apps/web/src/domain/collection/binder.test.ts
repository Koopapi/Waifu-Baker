import { describe, expect, it } from "vitest";
import { buildBinder, filterBinder } from "./binder";

const cards = [1, 2, 3, 4].map((n) => ({ id: `c${n}`, number: n, name: `Carta ${n}`, rarity: (n === 4 ? "epic" : "common") as "common" | "epic", flavorText: "" }));
const owned = [
  { cardId: "c1", holo: false, qty: 2, firstObtainedAt: new Date("2026-10-01") },
  { cardId: "c1", holo: true, qty: 1, firstObtainedAt: new Date("2026-10-03") },
  { cardId: "c4", holo: true, qty: 1, firstObtainedAt: new Date("2026-10-02") },
];

describe("RF-1 a RF-3 álbum con huecos", () => {
  it("test_s006_rf2_todas las cartas en orden, las que tiene con cantidades", () => {
    const b = buildBinder(cards, owned);
    expect(b.slots.map((s) => s.number)).toEqual([1, 2, 3, 4]);
    expect(b.slots[0].owned).toMatchObject({ cardId: "c1", qty: 2, holoQty: 1, name: "Carta 1", firstObtainedAt: new Date("2026-10-01") });
  });

  it("test_s006_rf1_progreso: distintas obtenidas sobre el total, la holo no cuenta aparte", () => {
    expect(buildBinder(cards, owned).progress).toEqual({ owned: 2, total: 4 });
  });

  it("test_s006_rf3_de una carta que falta solo se sabe el número", () => {
    const missing = buildBinder(cards, owned).slots[1];
    expect(missing).toEqual({ number: 2, owned: null });
  });

  it("test_s006_rf6_señala si tiene la versión holo", () => {
    const b = buildBinder(cards, owned);
    expect(b.slots[3].owned).toMatchObject({ qty: 0, holoQty: 1 });
  });
});

describe("RF-7 filtros", () => {
  const b = buildBinder(cards, owned);
  it("test_s006_rf7_tengo, me faltan, holo y rareza", () => {
    expect(filterBinder(b.slots, { mode: "owned" }).map((s) => s.number)).toEqual([1, 4]);
    expect(filterBinder(b.slots, { mode: "missing" }).map((s) => s.number)).toEqual([2, 3]);
    expect(filterBinder(b.slots, { mode: "holo" }).map((s) => s.number)).toEqual([1, 4]);
    expect(filterBinder(b.slots, { mode: "all", rarity: "epic" }).map((s) => s.number)).toEqual([4]);
  });
});
