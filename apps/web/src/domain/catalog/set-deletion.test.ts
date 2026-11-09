import { describe, expect, it } from "vitest";
import { canOfferArchive, deletionBlockers, matchesCode } from "./set-deletion";

describe("spec 032: eliminar una colección", () => {
  it("test_s032_rf4_el_codigo_vale_sin_mayusculas_ni_espacios_alrededor", () => {
    expect(matchesCode("wb01", "WB01")).toBe(true);
    expect(matchesCode("  Wb01 ", "WB01")).toBe(true);
    expect(matchesCode("WB0", "WB01")).toBe(false);
    expect(matchesCode("WB 01", "WB01")).toBe(false);
    expect(matchesCode("", "WB01")).toBe(false);
  });

  it("test_s032_rf8_con_duenos_no_se_puede_eliminar", () => {
    expect(deletionBlockers({ owners: 0, uses: [] })).toEqual([]);
    expect(deletionBlockers({ owners: 3, uses: [] })).toEqual([{ kind: "owners", count: 3 }]);
  });

  it("test_s032_rf11_en_uso_no_se_puede_eliminar", () => {
    const uses = [{ kind: "welcome" as const }, { kind: "cover_cards" as const, count: 2 }, { kind: "tier_rule" as const, name: "Booster" }];
    expect(deletionBlockers({ owners: 0, uses })).toEqual(uses);
    expect(deletionBlockers({ owners: 1, uses })).toHaveLength(4);
  });

  it("test_s032_rf10_archivar_en_su_lugar_solo_si_esta_publicada_y_tiene_duenos", () => {
    const owners = deletionBlockers({ owners: 2, uses: [] });
    expect(canOfferArchive("published", owners)).toBe(true);
    expect(canOfferArchive("archived", owners)).toBe(false);
    expect(canOfferArchive("draft", owners)).toBe(false);
    expect(canOfferArchive("published", deletionBlockers({ owners: 0, uses: [{ kind: "welcome" }] }))).toBe(false);
  });
});
