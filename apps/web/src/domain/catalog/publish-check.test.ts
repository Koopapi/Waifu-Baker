import { describe, expect, it } from "vitest";
import type { LayersConfig } from "@/domain/cards/layers";
import { publishProblems, type PublishInput } from "./publish-check";

/** Spec 017: carta armada (chica y fondo visibles). */
const assembled: LayersConfig = { capas: [{ key: "f", rol: "fondo" }, { key: "c", rol: "personaje" }], marco: "n", sello: null };

const W = (o: Partial<Record<string, number>>) => ({ common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0, secret: 0, ...o });
const card = (n: number, o: Partial<PublishInput["cards"][number]> = {}) => ({
  id: `id${n}`,
  number: n,
  name: `Carta ${n}`,
  characterId: "ch",
  rarity: "common" as const,
  keyFull: "k",
  adultReviewedAt: null,
  pendingOriginalKey: null,
  layers: assembled,
  ...o,
});
const base: PublishInput = {
  isAdult: false,
  packSize: 2,
  slots: [W({ common: 100 }), W({ rare: 100 })],
  holoChance: 0.2,
  cards: [card(1), card(2, { rarity: "rare" })],
};
const codes = (i: PublishInput) => publishProblems(i).map((p) => p.code);

describe("RF-6 y RF-7 comprobaciones de publicación", () => {
  it("test_rf6_una colección completa no tiene problemas", () => {
    expect(publishProblems(base)).toEqual([]);
  });

  it("test_rf6_detecta ranuras mal sumadas", () => {
    expect(codes({ ...base, slots: [W({ common: 90 }), W({ rare: 100 })] })).toEqual(["slot_sum"]);
  });

  it("test_rf6_detecta rarezas con probabilidad pero sin cartas", () => {
    const p = publishProblems({ ...base, slots: [W({ common: 100 }), W({ rare: 90, epic: 10 })] });
    expect(p).toEqual([expect.objectContaining({ code: "rarity_without_cards", target: { kind: "rarity", rarity: "epic" } })]);
  });

  it("test_rf6_detecta cartas incompletas, una por una y enlazadas", () => {
    const p = publishProblems({ ...base, cards: [card(1, { name: " " }), card(2, { rarity: "rare", characterId: null })] });
    expect(p.map((x) => x.target)).toEqual([
      { kind: "card", id: "id1", number: 1 },
      { kind: "card", id: "id2", number: 2 },
    ]);
  });

  it("test_rf6_en 18+ exige revisión y bloquea arte pendiente", () => {
    const adult = { ...base, isAdult: true };
    expect(codes(adult)).toEqual(["card_unreviewed", "card_unreviewed"]);
    const ok = { ...adult, cards: base.cards.map((c) => ({ ...c, adultReviewedAt: new Date() })) };
    expect(codes(ok)).toEqual([]);
    expect(codes({ ...ok, cards: [ok.cards[0], { ...ok.cards[1], pendingOriginalKey: "p" }] })).toEqual(["card_pending_art"]);
  });

  it("test_rf7_lista todos los problemas a la vez, no solo el primero", () => {
    const p = codes({ ...base, cards: [], slots: [W({ common: 50 })] });
    expect(p).toEqual(expect.arrayContaining(["no_cards", "slot_count", "slot_sum", "rarity_without_cards"]));
  });
});

describe("spec 017 — publicar solo con cartas armadas", () => {
  it("test_s017_rf15_una_carta_sin_fondo_o_sin_chica_impide_publicar_y_se_enlaza", () => {
    const sinFondo: LayersConfig = { ...assembled, capas: [{ key: "c", rol: "personaje" }] };
    const p = publishProblems({ ...base, cards: [card(1, { layers: sinFondo }), card(2, { rarity: "rare", layers: null })] });
    expect(p).toEqual([
      expect.objectContaining({ code: "card_not_assembled", target: { kind: "card", id: "id1", number: 1 }, params: { number: 1, missing: "fondo" } }),
      expect.objectContaining({ code: "card_not_assembled", target: { kind: "card", id: "id2", number: 2 }, params: { number: 2, missing: "personaje,fondo" } }),
    ]);
  });

  it("test_s017_rf16_las_demas_comprobaciones_siguen", () => {
    const p = publishProblems({ ...base, isAdult: true, cards: [card(1, { name: "", layers: null }), card(2, { rarity: "rare", adultReviewedAt: new Date() })] });
    expect(p.map((x) => x.code)).toEqual(["card_incomplete", "card_not_assembled", "card_unreviewed"]);
  });
});
