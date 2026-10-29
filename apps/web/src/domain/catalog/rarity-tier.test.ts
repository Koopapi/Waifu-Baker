import { describe, expect, it } from "vitest";
import { RARITIES } from "./card-rules";
import { RARITY_TIER, isFlat, rarityTier } from "./rarity-tier";

describe("escalón visual de la rareza", () => {
  it("test_s022_rf9_cada_rareza_tiene_su_propio_escalon_visual", () => {
    expect(RARITIES.map((r) => RARITY_TIER[r])).toEqual(["n", "r", "sr", "ssr", "ur"]);
    expect(new Set(Object.values(RARITY_TIER)).size).toBe(RARITIES.length);
  });

  it("test_cartacapas_sin_rareza_se_ve_como_comun", () => {
    expect(rarityTier(null)).toBe("n");
    expect(rarityTier("ex")).toBe("ur");
  });

  it("test_s022_rf4_solo_la_comun_es_plana", () => {
    expect(RARITIES.filter(isFlat)).toEqual(["common"]);
    expect(isFlat(null)).toBe(true);
  });
});
