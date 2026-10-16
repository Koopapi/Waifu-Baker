import { describe, expect, it } from "vitest";
import { parseDemoManifest } from "./manifest";

const card = (o: Partial<Record<string, string>> = {}) => ({ file: "output/a/x.webp", character: "Mira Vance", title: "Off Duty", rarity: "common", ...o });

describe("manifiesto de la demo", () => {
  it("test_s010_rf12_acepta_cartas_con_personaje_titulo_y_rareza", () => {
    const m = parseDemoManifest({ code: "FA01", name: "Fan Art", cards: [card(), card({ rarity: "rare", title: "Wink" })] });
    expect(m.cards).toHaveLength(2);
    expect(m.cards[1].rarity).toBe("rare");
  });

  it("test_s010_rf12_rechaza_rarezas_desconocidas_y_titulos_repetidos", () => {
    expect(() => parseDemoManifest({ code: "FA01", name: "Fan Art", cards: [card({ rarity: "mythic" })] })).toThrow();
    expect(() => parseDemoManifest({ code: "FA01", name: "Fan Art", cards: [card(), card()] })).toThrow(/Off Duty/);
  });

  it("test_s010_rf12_solo_archivos_dentro_del_taller", () => {
    expect(() => parseDemoManifest({ code: "FA01", name: "Fan Art", cards: [card({ file: "../secreto.webp" })] })).toThrow();
    expect(() => parseDemoManifest({ code: "FA01", name: "Fan Art", cards: [card({ file: "/etc/passwd" })] })).toThrow();
  });

  it("test_s010_rf12_ningun_nombre_real_de_personaje", () => {
    expect(() => parseDemoManifest({ code: "FA01", name: "Fan Art", cards: [card({ character: "Makima" })] }, ["makima"])).toThrow(/Makima/);
    expect(() => parseDemoManifest({ code: "FA01", name: "Fan Art", cards: [card({ title: "Makima at night" })] }, ["makima"])).toThrow();
  });
});
