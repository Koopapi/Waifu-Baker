// Spec 014, RF-21 y RF-22: ninguna carta se repite dentro de un mismo sobre, sin cambiar las probabilidades.
import { describe, expect, it } from "vitest";
import { drawPack, drawPackWithPity } from "./draw";
import { seededRng } from "../random";
import type { Rarity } from "./card-rules";
import { dictionaries } from "@/i18n";

const card = (id: string, rarity: Rarity) => ({ id, rarity });
const CARDS = [
  ...["c1", "c2", "c3", "c4", "c5", "c6"].map((id) => card(id, "common")),
  ...["u1", "u2", "u3"].map((id) => card(id, "common")),
  ...["r1", "r2"].map((id) => card(id, "rare")),
  card("e1", "epic"),
];
const SLOTS = [{ common: 100 }, { common: 100 }, { common: 100 }, { common: 60, rare: 40 }, { rare: 80, epic: 20 }];

describe("spec 014 — sin cartas repetidas en un sobre", () => {
  it("test_s014_rf21_ninguna_carta_se_repite_en_un_sobre", () => {
    const rng = seededRng(14);
    const poolSize = (r: Rarity) => CARDS.filter((c) => c.rarity === r).length;
    for (let i = 0; i < 20000; i++) {
      const draws = drawPack({ cards: CARDS, slots: SLOTS, holoChance: 0.2 }, rng, { unique: true });
      // Solo se repite si en ese sobre hay más ranuras de una rareza que cartas distintas de esa rareza.
      for (const r of new Set(draws.map((d) => d.rarity))) {
        const ids = draws.filter((d) => d.rarity === r).map((d) => d.cardId);
        expect(new Set(ids).size, ids.join(",")).toBe(Math.min(ids.length, poolSize(r)));
      }
    }
  });

  it("test_s014_rf21_las_probabilidades_por_rareza_no_cambian", () => {
    // Mismo generador y misma semilla: las rarezas salen idénticas con y sin la regla (solo cambia qué carta).
    for (const seed of [1, 2, 3, 99, 2026]) {
      const before = drawPack({ cards: CARDS, slots: SLOTS, holoChance: 0.2 }, seededRng(seed)).map((d) => [d.rarity, d.holo]);
      const after = drawPack({ cards: CARDS, slots: SLOTS, holoChance: 0.2 }, seededRng(seed), { unique: true }).map((d) => [d.rarity, d.holo]);
      expect(after).toEqual(before);
    }
  });

  it("test_s014_rf21_si_no_quedan_cartas_distintas_de_esa_rareza_se_permite_repetir", () => {
    // Una sola común y tres ranuras de común: el sobre se completa repitiendo.
    const ids = drawPack({ cards: [card("c1", "common")], slots: [{ common: 1 }, { common: 1 }, { common: 1 }], holoChance: 0 }, seededRng(5), { unique: true }).map((d) => d.cardId);
    expect(ids).toEqual(["c1", "c1", "c1"]);
  });

  it("test_s014_rf21_la_proteccion_tambien_respeta_la_regla", () => {
    const cards = [card("c1", "common"), card("c2", "common"), card("e1", "epic"), card("e2", "epic")];
    const slots = [{ common: 1 }, { epic: 1 }, { common: 1, epic: 1 }];
    for (let seed = 0; seed < 300; seed++) {
      const r = drawPackWithPity({ cards, slots, holoChance: 0 }, seededRng(seed), true, { unique: true });
      const ids = r.draws.map((d) => d.cardId);
      expect(new Set(ids).size, ids.join(",")).toBe(ids.length);
    }
  });

  it("test_s014_rf22_sin_la_opcion_el_sorteo_es_el_de_siempre", () => {
    const a = drawPack({ cards: CARDS, slots: SLOTS, holoChance: 0.2 }, seededRng(42));
    const b = drawPack({ cards: CARDS, slots: SLOTS, holoChance: 0.2 }, seededRng(42), { unique: false });
    expect(b).toEqual(a);
  });

  it("test_s014_rf21_la_pagina_de_probabilidades_lo_explica", () => {
    expect(dictionaries.es.site.dropRates.intro).toContain("Un mismo sobre no repite carta");
    expect(dictionaries.en.site.dropRates.intro).toContain("A pack never repeats a card");
  });
});
