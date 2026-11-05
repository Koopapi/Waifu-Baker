// Spec 029: reglas puras del vínculo, el reciclaje, el polvo, fabricar y el simulador.
import { describe, expect, it } from "vitest";
import { BOND_THRESHOLDS, bondLevel, cardPower } from "@/domain/expeditions/rules";
import type { LayersConfig } from "@/domain/cards/layers";
import { FACTORY_BOND_SETTINGS, parseBondSettings } from "./settings";
import { planRecycle, recyclableCopies } from "./recycle";
import { applyBondEffects, bondEffects, nextUnlock, titleLevel } from "./effects";
import { craftCost, craftProblem } from "./craft";
import { PACE, daysToMaxBond } from "./simulate";

const S = FACTORY_BOND_SETTINGS;
const base: LayersConfig = { capas: [{ key: "f", rol: "fondo" }, { key: "c", rol: "personaje" }], marco: "sr", sello: null };

describe("spec 029 — reciclar", () => {
  it("test_s029_rf1_cada_version_conserva_siempre_una_copia", () => {
    expect([0, 1, 2, 5].map(recyclableCopies)).toEqual([0, 0, 1, 4]);
  });

  it("test_s029_rf2_da_los_puntos_de_su_rareza_y_la_mitad_del_polvo_con_holo_por_1_5", () => {
    expect(planRecycle([{ rarity: "common", holo: false, copies: 2 }], 0, S)).toMatchObject({ copies: 2, points: 20, dust: 5, levelBefore: 1, levelAfter: 1 });
    expect(planRecycle([{ rarity: "rare", holo: false, copies: 1 }], 0, S)).toMatchObject({ points: 25, dust: 7 });
    expect(planRecycle([{ rarity: "epic", holo: true, copies: 1 }], 0, S)).toMatchObject({ points: 90, dust: 30 });
    const all = planRecycle([{ rarity: "legendary", holo: false, copies: 1 }, { rarity: "ex", holo: false, copies: 1 }], 0, S);
    expect(all).toMatchObject({ points: 550, dust: 210, levelAfter: bondLevel(550) });
    // La Rara da más que la Común (decisión del dueño).
    expect(S.points.rare).toBeGreaterThan(S.points.common);
  });

  it("test_s029_rf3_al_maximo_da_el_polvo_completo_y_ningun_punto", () => {
    const max = BOND_THRESHOLDS.at(-1)!;
    expect(planRecycle([{ rarity: "rare", holo: false, copies: 2 }], max, S)).toMatchObject({ points: 0, dust: 30, levelBefore: 10, levelAfter: 10 });
    // Si una copia lo lleva al 10, las siguientes ya dan el polvo completo.
    const cross = planRecycle([{ rarity: "ex", holo: false, copies: 2 }], max - 100, S);
    expect(cross).toMatchObject({ points: 400, dust: 150 + 300, levelAfter: 10 });
  });

  it("test_s029_rf8_el_poder_sigue_siendo_2_por_ciento_por_nivel_con_una_sola_barra", () => {
    const at = (level: number) => cardPower({ rarity: "common", holo: false, terrain: null, role: null, bondLevel: level }, "city");
    expect(at(2) / at(1)).toBeCloseTo(1.02);
    expect(at(10) / at(1)).toBeCloseTo(1.18);
  });
});

describe("spec 029 — lo que da el vínculo", () => {
  it("test_s029_rf9_rf10_rf11_rf12_los_efectos_llegan_en_los_niveles_3_5_7_y_10", () => {
    expect(bondEffects(2)).toEqual({ gloss: false, holo: false, frame: false, mastery: false });
    expect(bondEffects(3)).toMatchObject({ gloss: true, holo: false });
    expect(bondEffects(5)).toMatchObject({ holo: true, frame: false });
    expect(bondEffects(7)).toMatchObject({ frame: true, mastery: false });
    expect(bondEffects(10).mastery).toBe(true);
    expect(nextUnlock(1)).toEqual({ level: 3, unlock: "gloss" });
    expect(nextUnlock(6)).toEqual({ level: 7, unlock: "frame" });
    expect(nextUnlock(10)).toBeNull();
  });

  it("test_s029_rf9_el_nivel_3_pone_el_destello_sobre_la_chica_y_no_toca_la_original", () => {
    expect(applyBondEffects(base, 2)).toBe(base);
    const out = applyBondEffects(base, 3);
    expect(out.capas[1]).toMatchObject({ rol: "personaje", brillo: { tipo: "destello" } });
    expect(out.capas[0]).toEqual(base.capas[0]);
    expect("brillo" in base.capas[1]).toBe(false);
    // Una chica con su propio brillo lo conserva.
    const own: LayersConfig = { ...base, capas: [{ key: "c", rol: "personaje", brillo: { tipo: "oro" } }] };
    expect(applyBondEffects(own, 3).capas[0]).toMatchObject({ brillo: { tipo: "oro" } });
  });

  it("test_s029_rf10_rf11_holo_visual_en_el_5_y_marco_de_vinculo_con_particulas_en_el_7", () => {
    expect(applyBondEffects(base, 5)).toMatchObject({ holo: true, marco: "sr" });
    const seven = applyBondEffects(base, 7);
    expect(seven).toMatchObject({ marco: "personalizado", marcoColores: { color: "#ff5fa2", brillo: "#ffd45e" } });
    expect(seven.capas.map((l) => ("particulas" in l ? "particulas" : l.rol))).toEqual(["fondo", "particulas", "personaje"]);
    // El holo visual no suma poder: el poder solo mira la versión holo real.
    expect(cardPower({ rarity: "rare", holo: false, terrain: null, role: null, bondLevel: 5 }, "city")).toBeCloseTo(12 * 1.08);
  });

  it("test_s029_rf14_cada_nivel_tiene_el_titulo_de_su_ultimo_hito", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 9, 10].map(titleLevel)).toEqual([null, 2, 3, 3, 5, 5, 7, 7, 10]);
  });
});

describe("spec 029 — fabricar", () => {
  const ok = { rarity: "rare" as const, setStatus: "published", setIsAdult: false, adultUnlocked: false, dust: 300 };

  it("test_s029_rf18_cuesta_el_polvo_de_su_rareza", () => {
    expect((["common", "rare", "epic", "legendary"] as const).map((r) => craftCost(r, S))).toEqual([100, 300, 800, 2500]);
    expect(craftProblem(ok, S)).toBeNull();
  });

  it("test_s029_rf19_no_se_fabrica_la_ex_la_del_mes_sin_publicar_18_sin_filtro_ni_sin_polvo", () => {
    expect(craftCost("ex", S)).toBeNull();
    expect(craftProblem({ ...ok, rarity: "ex" }, S)).toBe("ex");
    expect(craftProblem({ ...ok, monthly: true }, S)).toBe("monthly");
    expect(craftProblem({ ...ok, setStatus: "archived" }, S)).toBe("unpublished");
    expect(craftProblem({ ...ok, setStatus: "draft" }, S)).toBe("unpublished");
    expect(craftProblem({ ...ok, setIsAdult: true }, S)).toBe("adult");
    expect(craftProblem({ ...ok, setIsAdult: true, adultUnlocked: true }, S)).toBeNull();
    expect(craftProblem({ ...ok, dust: 299 }, S)).toBe("dust");
  });

  it("test_s029_rf16_fabricar_y_reciclar_la_misma_carta_no_da_vueltas", () => {
    // Reciclar devuelve mucho menos de lo que cuesta fabricar (no hay ciclo que gane polvo).
    for (const r of ["common", "rare", "epic", "legendary"] as const) expect(planRecycle([{ rarity: r, holo: true, copies: 1 }], 0, S).dust).toBeLessThan(S.craftCost[r] / 10);
  });
});

describe("spec 029 — ajustes y simulador", () => {
  it("test_s029_rf22_ajustes_no_validos_vuelven_a_los_de_fabrica", () => {
    expect(parseBondSettings(null)).toEqual(S);
    expect(parseBondSettings({ ...S, holoFactor: 0.5 })).toEqual(S);
    expect(parseBondSettings({ ...S, titles: { "2": "Vecina", "3": "" } }).titles).toEqual({ "2": "Vecina" });
  });

  it("test_s029_rf23_el_patron_llega_antes_al_nivel_10_que_el_gratuito", () => {
    const silver = { slots: [{ common: 72, rare: 22, epic: 5, legendary: 1 }, { common: 72, rare: 22, epic: 5, legendary: 1 }, { common: 72, rare: 22, epic: 5, legendary: 1 }, { common: 35, rare: 48, epic: 14, legendary: 3 }, { rare: 80, epic: 16, legendary: 3.8, ex: 0.2 }], holoChance: 0.2 };
    const setCards = ["common", "common", "common", "common", "rare", "rare", "rare", "epic", "epic", "legendary", "ex"] as const;
    const input = { character: ["common", "rare", "epic"] as ("common" | "rare" | "epic")[], setCards: [...setCards], silver, gold: null, settings: S };
    const free = daysToMaxBond({ ...input, pace: PACE.free });
    const patron = daysToMaxBond({ ...input, pace: PACE.patron });
    expect(free).not.toBeNull();
    expect(patron!).toBeLessThan(free!);
    // Solo con expediciones (2 de 8 h al día): 2500 / 60 → 42 días.
    expect(daysToMaxBond({ ...input, character: [], pace: PACE.free })).toBe(42);
  });
});
