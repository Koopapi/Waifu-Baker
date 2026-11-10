import { describe, expect, it } from "vitest";
import { NO_FILTERS, activeFilterCount, filtersToParams, isFiltered, matches, optionCounts, parseFilters, pendingOf, sortCards, visibleCards, type CardFilters, type FilterableCard } from "./card-filters";

const card = (number: number, over: Partial<FilterableCard> = {}): FilterableCard => ({
  number,
  name: `Carta ${number}`,
  rarity: "common",
  characterId: "yuki",
  status: "ready",
  assembled: true,
  adultReviewedAt: "2026-11-01T00:00:00.000Z",
  pendingArtUrl: null,
  pendingLayersUrl: null,
  ...over,
});
const f = (over: Partial<CardFilters>): CardFilters => ({ ...NO_FILTERS, ...over });
const nums = (cs: FilterableCard[]) => cs.map((c) => c.number);

const SET = [
  card(1, { name: "Yuki en la playa", rarity: "common" }),
  card(2, { name: "Ámbar", rarity: "rare", characterId: "mio" }),
  card(3, { name: "yuki nocturna", rarity: "epic", assembled: false }),
  card(4, { name: null, rarity: "legendary", characterId: null, status: "processing" }),
  card(12, { name: "Mio", rarity: "ex", characterId: "mio", pendingLayersUrl: "/p.webp" }),
];

describe("spec 033 — filtros de la cuadrícula", () => {
  it("test_s033_rf1_filtra_por_personaje_y_sin_personaje", () => {
    expect(nums(visibleCards(SET, f({ characters: ["mio"] }), false))).toEqual([2, 12]);
    expect(nums(visibleCards(SET, f({ characters: ["none"] }), false))).toEqual([4]);
  });

  it("test_s033_rf2_filtra_por_rareza", () => {
    expect(nums(visibleCards(SET, f({ rarities: ["ex"] }), false))).toEqual([12]);
    expect(matches(card(9, { rarity: null }), f({ rarities: ["common"] }), false)).toBe(false);
  });

  it("test_s033_rf3_pendientes_sin_armar_procesando_capas_y_18_sin_revisar_solo_en_18", () => {
    expect(nums(visibleCards(SET, f({ pending: ["unassembled"] }), false))).toEqual([3]);
    expect(nums(visibleCards(SET, f({ pending: ["processing"] }), false))).toEqual([4]);
    expect(nums(visibleCards(SET, f({ pending: ["layers_review"] }), false))).toEqual([12]);
    expect(pendingOf(card(1, { adultReviewedAt: null }), false)).toEqual([]);
    expect(pendingOf(card(1, { adultReviewedAt: null }), true)).toEqual(["adult_review"]);
    expect(pendingOf(card(1, { pendingArtUrl: "/a.webp" }), true)).toEqual(["adult_review"]);
  });

  it("test_s033_rf4_cada_opcion_dice_cuantas_cartas_tiene", () => {
    const n = optionCounts(SET, false);
    expect(n.characters).toEqual({ yuki: 2, mio: 2, none: 1 });
    expect(n.rarities).toEqual({ common: 1, rare: 1, epic: 1, legendary: 1, ex: 1 });
    expect(n.pending).toEqual({ unassembled: 1, processing: 1, layers_review: 1, adult_review: 0 });
  });

  it("test_s033_rf5_varias_opciones_de_un_filtro_suman", () => {
    expect(nums(visibleCards(SET, f({ rarities: ["rare", "epic"] }), false))).toEqual([2, 3]);
  });

  it("test_s033_rf6_filtros_distintos_se_combinan", () => {
    expect(nums(visibleCards(SET, f({ characters: ["mio"], rarities: ["rare", "epic"] }), false))).toEqual([2]);
    expect(nums(visibleCards(SET, f({ characters: ["yuki"], q: "playa" }), false))).toEqual([1]);
  });

  it("test_s033_rf7_busca_por_nombre_sin_acentos_ni_mayusculas_y_por_numero", () => {
    expect(nums(visibleCards(SET, f({ q: "YUKI" }), false))).toEqual([1, 3]);
    expect(nums(visibleCards(SET, f({ q: "ambar" }), false))).toEqual([2]);
    expect(nums(visibleCards(SET, f({ q: "12" }), false))).toEqual([12]);
    expect(nums(visibleCards(SET, f({ q: "012" }), false))).toEqual([12]);
    expect(nums(visibleCards(SET, f({ q: "  mio  " }), false))).toEqual([12]);
    expect(nums(visibleCards(SET, f({ q: "zzz" }), false))).toEqual([]);
  });

  it("test_s033_rf8_el_orden_no_cuenta_como_filtro", () => {
    expect(isFiltered(NO_FILTERS)).toBe(false);
    expect(isFiltered(f({ sort: "rarity" }))).toBe(false);
    expect(isFiltered(f({ q: "  " }))).toBe(false);
    expect(isFiltered(f({ q: "a" }))).toBe(true);
    expect(activeFilterCount(f({ characters: ["a", "b"], rarities: ["ex"], q: "x" }))).toBe(4);
  });

  it("test_s033_rf10_ordena_por_numero_rareza_o_nombre", () => {
    const shuffled = [SET[3], SET[0], SET[4], SET[2], SET[1]];
    expect(nums(sortCards(shuffled, "number"))).toEqual([1, 2, 3, 4, 12]);
    expect(nums(sortCards(shuffled, "rarity"))).toEqual([12, 4, 3, 2, 1]);
    // Sin acentos ni mayúsculas; la carta sin nombre al final.
    expect(nums(sortCards(shuffled, "name"))).toEqual([2, 12, 1, 3, 4]);
    expect(nums(sortCards([card(5, { rarity: "rare" }), card(2, { rarity: "rare" })], "rarity"))).toEqual([2, 5]);
  });

  it("test_s033_rf11_ordenar_no_cambia_el_numero_ni_la_lista_original", () => {
    const copy = SET.map((c) => ({ ...c }));
    sortCards(SET, "name");
    expect(SET).toEqual(copy);
  });

  it("test_s033_rf16_rf19_la_direccion_guarda_solo_lo_puesto", () => {
    expect(filtersToParams(NO_FILTERS).toString()).toBe("");
    const p = filtersToParams(f({ characters: ["mio", "none"], rarities: ["ex"], pending: ["unassembled"], q: "yuki", sort: "rarity" }));
    expect(p.toString()).toBe("character=mio%2Cnone&rarity=ex&pending=unassembled&q=yuki&sort=rarity");
  });

  it("test_s033_rf17_la_direccion_vuelve_a_dar_los_mismos_filtros", () => {
    const want = f({ characters: ["mio"], rarities: ["rare", "ex"], pending: ["processing"], q: "Ámbar", sort: "name" });
    expect(parseFilters(filtersToParams(want), { characterIds: ["mio", "yuki"], isAdultSet: false })).toEqual(want);
  });

  it("test_s033_rf18_lo_que_no_existe_en_la_coleccion_se_ignora", () => {
    const p = new URLSearchParams("character=borrado,mio&rarity=mythic,rare&pending=adult_review,bogus&sort=price");
    expect(parseFilters(p, { characterIds: ["mio"], isAdultSet: false })).toEqual(f({ characters: ["mio"], rarities: ["rare"] }));
    expect(parseFilters(p, { characterIds: ["mio"], isAdultSet: true }).pending).toEqual(["adult_review"]);
  });
});
