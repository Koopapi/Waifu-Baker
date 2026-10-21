import { describe, expect, it } from "vitest";
import { RARITIES } from "./card-rules";
import { RARITY_TIER, rarityTier } from "./rarity-tier";

describe("escalón visual de la rareza", () => {
  it("test_cartacapas_cada_rareza_tiene_su_escalon_visual", () => {
    expect(RARITIES.map((r) => RARITY_TIER[r])).toEqual(["n", "n", "r", "sr", "ssr", "ur"]);
  });

  it("test_cartacapas_sin_rareza_se_ve_como_comun", () => {
    expect(rarityTier(null)).toBe("n");
    expect(rarityTier("secret")).toBe("ur");
  });
});
