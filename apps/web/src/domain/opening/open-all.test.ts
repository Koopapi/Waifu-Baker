import { describe, expect, it } from "vitest";
import { BURST_END_MS, burstPlan, groupByRarity, highlights, MAX_HIGHLIGHTS, soundGate, type LotCard } from "./open-all";

const card = (number: number, rarity: LotCard["rarity"], o: Partial<LotCard> = {}): LotCard => ({ key: `k${number}-${Math.random()}`, number, rarity, holo: false, isNew: false, qtyAfter: 1, ...o });

describe("spec 019 — ráfaga", () => {
  it("test_s019_rf2_la_rafaga_no_pasa_de_6_segundos_y_va_pausada_con_pocos_sobres", () => {
    expect(burstPlan(2)).toEqual({ interval: 600, total: 1200 });
    expect(burstPlan(9)).toEqual({ interval: 600, total: 5400 });
    expect(burstPlan(50)).toEqual({ interval: 108, total: 5400 });
    // Con la pausa final (y el margen para pintar), la ráfaga completa no pasa de 6 s.
    for (const n of [1, 7, 23, 37, 50]) expect(burstPlan(n).total + BURST_END_MS).toBeLessThan(6000);
  });

  it("test_s019_rf3_como_mucho_un_sonido_cada_120_ms", () => {
    const gate = soundGate(120);
    expect([0, 0.2, 50, 100, 130, 200, 260, 300].filter((t) => gate(t))).toEqual([0, 130, 260]);
  });
});

describe("spec 019 — foco", () => {
  it("test_s019_rf4_destacadas_epicas_o_mejores_siempre_y_raras_solo_nuevas_de_mayor_a_menor", () => {
    const lot = [
      card(1, "common", { isNew: true }),
      card(2, "rare"),
      card(3, "rare", { isNew: true }),
      card(4, "epic"),
      card(5, "secret"),
      card(6, "legendary", { isNew: true }),
    ];
    expect(highlights(lot).map((c) => c.number)).toEqual([5, 6, 4, 3]);
  });

  it("test_s019_rf4_cada_version_se_destaca_una_vez_nuevas_y_holo_primero", () => {
    const lot = [card(4, "epic"), card(4, "epic", { isNew: true }), card(7, "epic", { holo: true }), card(4, "epic", { holo: true })];
    expect(highlights(lot).map((c) => [c.number, c.holo, c.isNew])).toEqual([
      [4, false, true],
      [4, true, false],
      [7, true, false],
    ]);
  });

  it("test_s019_rf5_como_mucho_10_destacadas_las_mejores", () => {
    const lot = Array.from({ length: 14 }, (_, i) => card(i + 1, i < 3 ? "legendary" : "epic"));
    const h = highlights(lot);
    expect(h).toHaveLength(MAX_HIGHLIGHTS);
    expect(h.slice(0, 3).every((c) => c.rarity === "legendary")).toBe(true);
  });

  it("test_s019_rf8_un_lote_sin_destacadas_no_tiene_foco", () => {
    expect(highlights([card(1, "common"), card(2, "uncommon", { isNew: true }), card(3, "rare")])).toEqual([]);
  });
});

describe("spec 019 — resumen", () => {
  it("test_s019_rf10_rf11_rf12_grupos_de_la_mas_rara_a_la_mas_comun_con_copias_nuevas_y_holo", () => {
    const lot = [
      card(1, "common"),
      card(1, "common", { qtyAfter: 3 }),
      card(2, "common", { isNew: true }),
      card(9, "epic", { holo: true, isNew: true }),
      card(1, "common", { qtyAfter: 4 }),
    ];
    const groups = groupByRarity(lot);
    expect(groups.map((g) => [g.rarity, g.count])).toEqual([
      ["epic", 1],
      ["common", 4],
    ]);
    // Dentro de cada grupo, las nuevas primero.
    expect(groups[1].versions.map((v) => [v.number, v.copies, v.isNew, v.qtyAfter])).toEqual([
      [2, 1, true, 1],
      [1, 3, false, 4],
    ]);
    expect(groups[0].versions[0]).toMatchObject({ number: 9, holo: true, isNew: true, copies: 1 });
  });
});
