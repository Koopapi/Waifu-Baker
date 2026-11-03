import { describe, expect, it } from "vitest";
import type { LayersConfig } from "./layers";
import { changedParts, MAX_VERSIONS, sameSnapshot, sheetOf, versionsToPrune, type CardSheet } from "./versions";

const ficha: CardSheet = { name: "Yuki", flavorText: "", characterId: null, rarity: "rare", variant: "normal" };
const layers: LayersConfig = { capas: [{ key: "sets/s/layers/a.webp", rol: "personaje" }], marco: "r", sello: null };

describe("spec 027 — versiones de una carta", () => {
  it("test_s027_rf17_una_version_guarda_la_ficha_y_las_capas_y_dice_que_cambio", () => {
    const prev = { ficha, layers };
    expect(changedParts(prev, { ficha: { ...ficha, name: "Yuki II" }, layers })).toBe("ficha");
    expect(changedParts(prev, { ficha, layers: { ...layers, holo: true } })).toBe("capas");
    expect(changedParts(prev, { ficha: { ...ficha, rarity: "epic" }, layers: null })).toBe("ambas");
    // Un guardado sin cambios queda como «ficha»; las claves en otro orden son la misma foto (jsonb las reordena).
    expect(changedParts(prev, { ficha: { variant: "normal", rarity: "rare", characterId: null, flavorText: "", name: "Yuki" }, layers })).toBe("ficha");
    expect(sameSnapshot(prev, { ficha: sheetOf({ ...ficha, extra: 1 } as CardSheet), layers: { sello: null, marco: "r", capas: layers.capas } })).toBe(true);
  });

  it("test_s027_rf18_rf21_se_conservan_las_ultimas_10_y_sobran_las_mas_antiguas", () => {
    expect(MAX_VERSIONS).toBe(10);
    expect(versionsToPrune([1, 2, 3])).toEqual([]);
    expect(versionsToPrune([3, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toEqual([2, 1]);
    // Las versiones ya creadas no se tocan: solo se señalan las que sobran, nunca se reescriben.
    expect(versionsToPrune([1, 2, 3, 4], 2)).toEqual([2, 1]);
  });
});
