// Spec 028, RF-8, RF-9, RF-11, RF-12, RF-13 y RF-16: probabilidades iniciales, «al menos una por sobre» y garantía de EX.
import { describe, expect, it } from "vitest";
import { RARITIES, type Rarity } from "./card-rules";
import { FACTORY_ODDS_TABLES, FACTORY_PITY, defaultSlots } from "./default-odds";
import { drawPackWithGuarantee } from "./draw";
import { oddsTablesProblems, parseOddsTables, parsePityDefaults } from "./odds-defaults";
import { atLeastOneChance } from "./pack-chances";
import { isEx, nextPityCounter, pityActive } from "./pity";
import { seededRng } from "../random";

const W = (o: Partial<Record<Rarity, number>>) => ({ common: 0, rare: 0, epic: 0, legendary: 0, ex: 0, ...o });
const round = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;

describe("spec 028 — probabilidades iniciales", () => {
  it("test_s028_rf8_el_sobre_plata_propone_las_probabilidades_de_la_spec", () => {
    expect(defaultSlots(5, "silver")).toEqual([
      W({ common: 72, rare: 22, epic: 5, legendary: 1 }),
      W({ common: 72, rare: 22, epic: 5, legendary: 1 }),
      W({ common: 72, rare: 22, epic: 5, legendary: 1 }),
      W({ common: 35, rare: 48, epic: 14, legendary: 3 }),
      W({ rare: 80, epic: 16, legendary: 3.8, ex: 0.2 }),
    ]);
  });

  it("test_s028_rf9_el_sobre_gold_propone_las_probabilidades_de_la_spec", () => {
    expect(defaultSlots(5, "gold")).toEqual([
      W({ common: 40, rare: 38, epic: 17, legendary: 4.5, ex: 0.5 }),
      W({ common: 40, rare: 38, epic: 17, legendary: 4.5, ex: 0.5 }),
      W({ common: 40, rare: 38, epic: 17, legendary: 4.5, ex: 0.5 }),
      W({ rare: 52, epic: 34, legendary: 12.5, ex: 1.5 }),
      W({ epic: 72, legendary: 25, ex: 3 }),
    ]);
    expect(oddsTablesProblems(FACTORY_ODDS_TABLES)).toEqual([]);
  });

  it("test_s028_rf11_probabilidad_de_al_menos_una_de_cada_rareza_por_sobre", () => {
    const silver = atLeastOneChance(defaultSlots(5, "silver"));
    const gold = atLeastOneChance(defaultSlots(5, "gold"));
    // Los números de «Resultado esperado» de la spec.
    expect(round(silver.ex, 2)).toBe(0.2);
    expect(round(silver.legendary, 1)).toBe(9.5);
    expect(round(gold.ex, 1)).toBe(5.9);
    expect(round(gold.legendary, 0)).toBe(43);
    // Una rareza sin peso en ninguna ranura nunca sale; una con 100 en una ranura, siempre.
    expect(atLeastOneChance([W({ common: 100 }), W({ rare: 100 })])).toEqual({ common: 100, rare: 100, epic: 0, legendary: 0, ex: 0 });
    for (const r of RARITIES) expect(gold[r]).toBeGreaterThanOrEqual(0);
  });

  it("test_s028_rf16_una_fila_que_no_suma_100_dice_que_sobre_y_que_ranura_falla", () => {
    const bad = structuredClone(FACTORY_ODDS_TABLES);
    bad.gold.boosted.rare = 60;
    bad.silver.base.common = 70;
    expect(oddsTablesProblems(bad)).toEqual([
      { kind: "silver", row: "base", code: "slot_sum", sum: 98 },
      { kind: "gold", row: "boosted", code: "slot_sum", sum: 108 },
    ]);
    // La última ranura debe respetar la garantía de su sobre.
    const weak = structuredClone(FACTORY_ODDS_TABLES);
    weak.gold.guaranteed = W({ rare: 10, epic: 62, legendary: 25, ex: 3 });
    expect(oddsTablesProblems(weak)).toEqual([{ kind: "gold", row: "guaranteed", code: "guarantee_slot" }]);
    // Lo guardado que no vale no se usa.
    expect(parseOddsTables(bad)).toEqual(FACTORY_ODDS_TABLES);
    expect(parseOddsTables({ nada: 1 })).toEqual(FACTORY_ODDS_TABLES);
  });

  it("test_s028_rf17_las_garantias_de_fabrica_son_10_plata_y_20_gold", () => {
    expect(FACTORY_PITY).toEqual({ epic: 10, ex: 20 });
    expect(parsePityDefaults({ epic: 8, ex: 30 })).toEqual({ epic: 8, ex: 30 });
    expect(parsePityDefaults({ epic: 8.5, ex: 30 })).toEqual(FACTORY_PITY);
    expect(parsePityDefaults({ epic: 8, ex: 101 })).toEqual(FACTORY_PITY);
  });
});

describe("spec 028 — garantía de EX", () => {
  const CARDS = RARITIES.flatMap((r) => [1, 2].map((i) => ({ id: `${r}-${i}`, rarity: r as Rarity })));
  const slots = defaultSlots(5, "gold");

  it("test_s028_rf12_tras_19_gold_sin_ex_el_siguiente_trae_una", () => {
    expect(pityActive(18, FACTORY_PITY.ex)).toBe(false);
    expect(pityActive(19, FACTORY_PITY.ex)).toBe(true);
    const rng = seededRng(28);
    for (let i = 0; i < 2000; i++) {
      const r = drawPackWithGuarantee({ cards: CARDS, slots, holoChance: 0 }, rng, "ex", { unique: true });
      expect(r.draws.some((d) => isEx(d.rarity))).toBe(true);
      // Solo cambia la última ranura y lo marca.
      if (r.pityApplied) expect(r.draws[4]).toMatchObject({ rarity: "ex", pity: true });
    }
  });

  it("test_s028_rf12_sin_cartas_ex_la_garantia_no_actua_y_lo_indica", () => {
    const sinEx = CARDS.filter((c) => c.rarity !== "ex");
    const r = drawPackWithGuarantee({ cards: sinEx, slots, holoChance: 0 }, seededRng(1), "ex");
    expect(r.pityApplied).toBe(false);
    expect(r.pityUnavailable).toBe(true);
  });

  it("test_s028_rf13_una_ex_pone_el_contador_a_cero", () => {
    expect(nextPityCounter(19, true)).toBe(0);
    expect(nextPityCounter(12, false)).toBe(13);
    expect(["common", "rare", "epic", "legendary", "ex"].map((r) => isEx(r as Rarity))).toEqual([false, false, false, false, true]);
  });
});
