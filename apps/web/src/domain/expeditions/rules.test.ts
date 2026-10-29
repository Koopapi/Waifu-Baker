import { describe, expect, it } from "vitest";
import { RARITIES } from "@/domain/catalog/card-rules";
import {
  BOND_THRESHOLDS,
  BOND_XP,
  DURATIONS,
  RARITY_POWER,
  bondLevel,
  bondProgress,
  cardPower,
  lootFor,
  rateTeam,
  teamPower,
  type TeamMember,
} from "./rules";

const member = (over: Partial<TeamMember> = {}): TeamMember => ({ rarity: "common", holo: false, terrain: "city", role: null, bondLevel: 1, ...over });

describe("spec 020 — poder del equipo", () => {
  it("test_s020_rf11_una_carta_en_su_terreno_supera_a_otra_dos_rarezas_por_encima_fuera_del_suyo", () => {
    for (let i = 0; i + 2 < RARITIES.length; i++) {
      const home = cardPower(member({ rarity: RARITIES[i], terrain: "forest" }), "forest");
      const away = cardPower(member({ rarity: RARITIES[i + 2], terrain: "city" }), "forest");
      expect(home, `${RARITIES[i]} frente a ${RARITIES[i + 2]}`).toBeGreaterThan(away);
    }
  });

  it("test_s020_rf11_sin_terreno_asignado_no_hay_bonus", () => {
    expect(cardPower(member({ terrain: null }), "city")).toBe(RARITY_POWER.common);
    expect(cardPower(member({ terrain: "city" }), "city")).toBe(RARITY_POWER.common * 1.5);
  });

  it("test_s020_rf12_cada_nivel_de_vinculo_suma_un_2_por_ciento", () => {
    const base = cardPower(member({ terrain: null, bondLevel: 1 }), "city");
    expect(cardPower(member({ terrain: null, bondLevel: 6 }), "city")).toBeCloseTo(base * 1.1, 10);
    expect(cardPower(member({ terrain: null, bondLevel: 10 }), "city")).toBeCloseTo(base * 1.18, 10);
  });

  it("test_s020_rf13_la_holo_da_un_15_por_ciento_mas", () => {
    expect(cardPower(member({ holo: true, terrain: null }), "city")).toBeCloseTo(RARITY_POWER.common * 1.15, 10);
  });

  it("test_s020_rf14_el_poder_del_equipo_es_la_suma_y_la_calificacion_sale_de_la_dificultad", () => {
    const team = [member({ rarity: "rare" }), member({ rarity: "common", terrain: "forest" })];
    expect(teamPower(team, "city")).toBeCloseTo(14 * 1.5 + 10, 10);
    expect(rateTeam(42, 30)).toBe("excellent");
    expect(rateTeam(30, 30)).toBe("good");
    expect(rateTeam(18, 30)).toBe("normal");
    expect(rateTeam(17.9, 30)).toBe("hard");
  });
});

describe("spec 020 — botín fijo", () => {
  const base = { cookies: 20, fragments: 2, packChance: 0.02 };

  it("test_s020_rf14_cada_calificacion_aplica_su_porcentaje", () => {
    expect(lootFor(base, "good", [])).toEqual({ cookies: 20, fragments: 2, packChance: 0.02 });
    expect(lootFor(base, "excellent", [])).toEqual({ cookies: 25, fragments: 2, packChance: 0.02 });
    expect(lootFor(base, "normal", [])).toEqual({ cookies: 16, fragments: 1, packChance: 0.02 });
    expect(lootFor(base, "hard", [])).toEqual({ cookies: 10, fragments: 1, packChance: 0.02 });
  });

  it("test_s020_rf14_los_roles_cambian_que_trae_el_equipo", () => {
    expect(lootFor(base, "good", ["gatherer"]).cookies).toBe(26);
    expect(lootFor(base, "good", ["cartographer"]).fragments).toBe(4);
    expect(lootFor(base, "good", ["treasure_hunter"]).packChance).toBeCloseTo(0.03, 10);
    // Un rol repetido no suma dos veces.
    expect(lootFor(base, "good", ["gatherer", "gatherer"]).cookies).toBe(26);
  });

  it("test_s020_rf14_hay_al_menos_una_galleta_si_la_zona_da_galletas", () => {
    expect(lootFor({ cookies: 1, fragments: 0, packChance: 0 }, "hard", []).cookies).toBe(1);
    expect(lootFor({ cookies: 0, fragments: 0, packChance: 0 }, "hard", []).cookies).toBe(0);
  });

  it("test_s020_rf21_la_probabilidad_de_sobre_no_pasa_de_1", () => {
    expect(lootFor({ cookies: 0, fragments: 0, packChance: 0.9 }, "good", ["treasure_hunter"]).packChance).toBe(1);
  });
});

describe("spec 020 — vínculo", () => {
  it("test_s020_rf12_el_nivel_sube_con_la_experiencia_hasta_10", () => {
    expect(BOND_THRESHOLDS).toHaveLength(10);
    expect(bondLevel(0)).toBe(1);
    expect(bondLevel(49)).toBe(2 - 1);
    expect(bondLevel(50)).toBe(2);
    expect(bondLevel(2499)).toBe(9);
    expect(bondLevel(2500)).toBe(10);
    expect(bondLevel(99_999)).toBe(10);
    expect(bondProgress(75)).toEqual({ level: 2, xp: 75, from: 50, to: 150 });
    expect(bondProgress(3000)).toEqual({ level: 10, xp: 3000, from: 2500, to: null });
  });

  it("test_s020_rf20_la_experiencia_depende_de_la_duracion", () => {
    expect(DURATIONS).toEqual([30, 120, 480]);
    expect(DURATIONS.map((d) => BOND_XP[d])).toEqual([4, 12, 30]);
  });
});
