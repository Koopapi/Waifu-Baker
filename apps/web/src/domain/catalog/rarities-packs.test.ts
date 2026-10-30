// Spec 022: cinco rarezas y dos tipos de sobre (plata y gold) con sus tablas, garantías y comprobaciones al publicar.
import { describe, expect, it } from "vitest";
import { RARITIES, type Rarity } from "./card-rules";
import { GUARANTEE, PACK_KINDS, defaultSlots, parsePackKind, type PackKind } from "./default-odds";
import { drawPack } from "./draw";
import { goldImproves, legendaryPlusRate, validateOdds } from "./odds";
import { publishProblems, type PublishInput } from "./publish-check";
import { seededRng } from "../random";

const CARDS = RARITIES.flatMap((r) => [1, 2, 3].map((i) => ({ id: `${r}-${i}`, rarity: r as Rarity })));
const rank = (r: Rarity) => RARITIES.indexOf(r);

const card = (number: number, rarity: Rarity): PublishInput["cards"][number] => ({
  id: `c${number}`,
  number,
  name: `Carta ${number}`,
  characterId: "x",
  rarity,
  keyFull: "k",
  adultReviewedAt: null,
  pendingOriginalKey: null,
  layers: null,
});
const input = (gold: PublishInput["gold"], cards = RARITIES.map((r, i) => card(i + 1, r))): PublishInput => ({
  isAdult: false,
  packSize: 5,
  slots: defaultSlots(5, "silver"),
  holoChance: 0.1,
  gold,
  cards,
});
// Las cartas de prueba no están armadas por capas: aquí solo cuentan los problemas de las tablas.
const codes = (i: PublishInput) => publishProblems(i).map((p) => p.code).filter((c) => !c.startsWith("card_"));

describe("spec 022 — rarezas", () => {
  it("test_s022_rf1_cinco_rarezas_de_menor_a_mayor", () => {
    expect(RARITIES).toEqual(["common", "rare", "epic", "legendary", "ex"]);
  });
});

describe("spec 022 — sobres plata y gold", () => {
  it("test_s022_rf11_dos_tipos_de_sobre_y_lo_que_no_es_gold_es_plata", () => {
    expect(PACK_KINDS).toEqual(["silver", "gold"]);
    expect(parsePackKind("gold")).toBe("gold");
    expect(parsePackKind("silver")).toBe("silver");
    expect(parsePackKind(undefined)).toBe("silver");
    expect(parsePackKind("diamante")).toBe("silver");
  });

  it("test_s022_rf12_rf17_las_tablas_por_defecto_de_cada_tipo_son_validas_y_del_mismo_tamano", () => {
    for (const size of [1, 2, 3, 5, 8]) {
      for (const kind of PACK_KINDS) {
        expect(defaultSlots(size, kind)).toHaveLength(size);
        expect(validateOdds(defaultSlots(size, kind), size, 0.1, kind), `${kind} de ${size}`).toEqual([]);
      }
    }
  });

  it("test_s022_rf14_rf15_cada_sobre_trae_su_garantia_en_2000_sorteos_por_tipo", () => {
    const rng = seededRng(22);
    for (const kind of PACK_KINDS) {
      for (let i = 0; i < 2000; i++) {
        const draws = drawPack({ cards: CARDS, slots: defaultSlots(5, kind), holoChance: 0.1 }, rng);
        expect(Math.max(...draws.map((d) => rank(d.rarity))), kind).toBeGreaterThanOrEqual(rank(GUARANTEE[kind]));
      }
    }
  });

  it("test_s022_rf14_la_ultima_ranura_plata_no_puede_dar_comun", () => {
    const slots = defaultSlots(5, "silver");
    slots[4] = { common: 10, rare: 70, epic: 15, legendary: 4.5, ex: 0.5 };
    expect(validateOdds(slots, 5, 0.1, "silver").map((p) => [p.code, p.params])).toEqual([["guarantee_slot", { kind: "silver", rarity: "rare" }]]);
  });

  it("test_s022_rf15_la_ultima_ranura_gold_no_puede_dar_comun_ni_rara", () => {
    const slots = defaultSlots(5, "gold");
    slots[4] = { common: 0, rare: 5, epic: 65, legendary: 25, ex: 5 };
    expect(validateOdds(slots, 5, 0.1, "gold").map((p) => p.code)).toEqual(["guarantee_slot"]);
    // La misma ranura sí vale para plata.
    expect(validateOdds(slots, 5, 0.1, "silver")).toEqual([]);
  });

  it("test_s022_rf16_gold_da_mas_legendaria_o_ex_que_plata", () => {
    const silver = defaultSlots(5, "silver");
    const gold = defaultSlots(5, "gold");
    expect(legendaryPlusRate(gold)).toBeGreaterThan(legendaryPlusRate(silver));
    expect(goldImproves(silver, gold)).toBe(true);
    expect(goldImproves(silver, silver)).toBe(false);
  });

  it("test_s022_rf13_sin_la_tabla_gold_no_se_publica_e_indica_cual_falta", () => {
    const problems = publishProblems(input(null));
    expect(problems.find((p) => p.code === "missing_table")?.params).toEqual({ kind: "gold" });
    expect(codes(input({ slots: defaultSlots(5, "gold"), holoChance: 0.1 }))).not.toContain("missing_table");
  });

  it("test_s022_rf16_una_tabla_gold_que_no_mejora_no_se_publica", () => {
    // Una gold válida (épica garantizada) pero con menos legendaria y EX que la plata.
    const weak = defaultSlots(5, "gold").map((s, i) => (i === 4 ? { common: 0, rare: 0, epic: 100, legendary: 0, ex: 0 } : { common: 100, rare: 0, epic: 0, legendary: 0, ex: 0 }));
    expect(codes(input({ slots: weak, holoChance: 0.1 }))).toEqual(["gold_not_better"]);
  });

  it("test_s022_rf17_la_tabla_gold_tiene_tantas_ranuras_como_cartas_el_sobre", () => {
    const problems = publishProblems(input({ slots: defaultSlots(4, "gold"), holoChance: 0.1 }));
    expect(problems.find((p) => p.code === "slot_count")?.params).toMatchObject({ packSize: 5, slots: 4, kind: "gold" });
  });

  it("test_s022_rf15_sin_cartas_epicas_o_mejores_la_tabla_gold_no_se_puede_publicar", () => {
    const onlyLow = [card(1, "common"), card(2, "rare")];
    const silverOnlyLow = defaultSlots(5, "silver").map(() => ({ common: 0, rare: 100, epic: 0, legendary: 0, ex: 0 }));
    const problems = publishProblems({ ...input({ slots: defaultSlots(5, "gold"), holoChance: 0.1 }, onlyLow), slots: silverOnlyLow });
    expect(problems.filter((p) => p.code === "rarity_without_cards").map((p) => p.params?.rarity)).toEqual(["epic", "legendary", "ex"]);
  });
});

describe("spec 022 — tipo de cada tabla en los problemas", () => {
  it("test_s022_rf13_los_problemas_de_la_tabla_gold_dicen_que_son_del_gold", () => {
    const broken = defaultSlots(5, "gold");
    broken[0] = { ...broken[0], common: 0 };
    const sum = publishProblems(input({ slots: broken, holoChance: 0.1 })).find((p) => p.code === "slot_sum");
    expect(sum?.params).toMatchObject({ slot: 1, kind: "gold" as PackKind });
  });
});
