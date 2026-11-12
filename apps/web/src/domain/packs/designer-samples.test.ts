import { describe, expect, it } from "vitest";
import type { LayersConfig } from "@/domain/cards/layers";
import { designerSamples } from "./designer-samples";

const layers: LayersConfig = { capas: [{ key: "sets/s1/layers/chica.webp" }], marco: "r", sello: { texto: "R", estilo: "plata", esquina: "sup-izq" } };
const armada = { name: "Aiko", rarity: "rare" as const, layers, keyMid: "sets/s1/cards/a/mid.aa.webp", keyHoloMid: null };

describe("spec 039 — las cartas de muestra del diseñador de sobres", () => {
  it("test_s039_rf13_una_carta_armada_sale_con_la_vista_del_armador", () => {
    const [s] = designerSamples([armada], "S1");
    expect(s.live?.tier).toBe("r");
    expect(s.live?.config.capas[0]).toMatchObject({ src: "/api/admin/assets/sets/s1/layers/chica.webp" });
    expect(s).toMatchObject({ image: "/api/admin/assets/sets/s1/cards/a/mid.aa.webp", rarity: "rare", name: "Aiko" });
  });

  it("test_s039_rf15_una_carta_sin_capas_sale_con_su_imagen_fija", () => {
    const [s] = designerSamples([{ ...armada, layers: null, name: "" }], "S1");
    expect(s.live).toBeNull();
    expect(s).toMatchObject({ image: "/api/admin/assets/sets/s1/cards/a/mid.aa.webp", name: "S1" });
    expect(s.raw).toBeUndefined();
  });

  it("test_s039_rf16_sin_cartas_con_rareza_usa_la_carta_de_ejemplo", () => {
    const samples = designerSamples([{ ...armada, rarity: null }, { ...armada, keyMid: null }], "S1");
    expect(samples).toHaveLength(5);
    expect(samples.every((s) => s.raw && !s.live && s.image.startsWith("/api/admin/pack-example/"))).toBe(true);
  });

  it("test_s039_rf13_como_mucho_15_cartas_de_muestra", () => {
    expect(designerSamples(Array.from({ length: 20 }, () => armada), "S1")).toHaveLength(15);
  });
});
