import { describe, expect, it } from "vitest";
import { seededRng } from "@/domain/random";
import { PHRASES, phraseCount, pickPhrases, rollPack } from "./report";
import { simulate } from "./simulate";

describe("spec 020 — reporte", () => {
  it("test_s020_rf24_de_1_a_3_frases_segun_la_duracion", () => {
    expect([30, 120, 480].map((d) => phraseCount(d as 30 | 120 | 480))).toEqual([1, 2, 3]);
  });

  it("test_s020_rf24_las_frases_son_distintas_y_caben_en_el_equipo", () => {
    for (let seed = 1; seed < 200; seed++) {
      for (const size of [1, 2, 3]) {
        const picked = pickPhrases(seededRng(seed), { count: 3, teamSize: size, terrain: "ruins" });
        expect(new Set(picked.map((p) => p.key)).size).toBe(3);
        for (const p of picked) {
          const tpl = PHRASES.find((x) => x.key === p.key)!;
          expect(tpl.minTeam).toBeLessThanOrEqual(size);
          expect(tpl.terrain === null || tpl.terrain === "ruins").toBe(true);
          // El orden de las personajes es una permutación del equipo.
          expect([...p.order].sort()).toEqual([...Array(size).keys()]);
        }
      }
    }
  });

  it("test_s020_rf24_hay_frases_para_cada_terreno_y_generales_para_una_sola_carta", () => {
    for (const t of ["city", "forest", "coast", "ruins", "mountain"]) expect(PHRASES.filter((p) => p.terrain === t).length).toBeGreaterThanOrEqual(2);
    expect(PHRASES.filter((p) => p.terrain === null && p.minTeam === 1).length).toBeGreaterThanOrEqual(3);
    expect(PHRASES.filter((p) => p.terrain === null).length).toBeGreaterThanOrEqual(20);
  });

  it("test_s020_rf21_el_sobre_sale_con_su_probabilidad", () => {
    expect(rollPack(seededRng(1), 0)).toBe(false);
    expect(rollPack(seededRng(1), 1)).toBe(true);
    const rng = seededRng(42);
    let wins = 0;
    for (let i = 0; i < 20_000; i++) if (rollPack(rng, 0.05)) wins++;
    expect(wins / 20_000).toBeGreaterThan(0.045);
    expect(wins / 20_000).toBeLessThan(0.055);
  });
});

describe("spec 020 — simulador", () => {
  const zone = { terrain: "city" as const, difficulty: 30, loot: { "30": { cookies: 7, fragments: 1, packChance: 0.01 }, "120": { cookies: 21, fragments: 2, packChance: 0.04 }, "480": { cookies: 60, fragments: 4, packChance: 0.1 } } };

  it("test_s020_rf30_muestra_calificacion_botin_y_sobres_por_dia_con_2_espacios", () => {
    const r = simulate(zone, [{ rarity: "common", holo: false, terrain: "city", role: null, bondLevel: 1 }], 120, { runs: 10_000, seed: 7 });
    expect(r.rating).toBe("hard");
    expect(r.loot).toEqual({ cookies: 10, fragments: 1, packChance: 0.04 });
    // 2 espacios × 12 expediciones de 2 h al día × 4 %.
    expect(r.packsPerDay).toBeCloseTo(0.96, 10);
    expect(r.cookiesPerDay).toBe(240);
    expect(r.simulatedPackRate).toBeGreaterThan(0.03);
    expect(r.simulatedPackRate).toBeLessThan(0.05);
  });

  it("test_s020_rf30_un_equipo_fuerte_en_su_terreno_sale_excelente", () => {
    const strong = Array.from({ length: 3 }, () => ({ rarity: "rare" as const, holo: false, terrain: "city" as const, role: "gatherer" as const, bondLevel: 1 }));
    const r = simulate(zone, strong, 480, { runs: 100, seed: 1 });
    expect(r.rating).toBe("excellent");
    expect(r.loot.cookies).toBe(Math.floor(60 * 1.25 * 1.3));
  });
});
