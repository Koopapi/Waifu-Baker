// Spec 028, RF-1 a RF-5: valores con los que nace o se re-estila una carta (sello de texto 15 y borde 3,0). Puro.
import { describe, expect, it } from "vitest";
import { FACTORY_CARD_DEFAULTS } from "./card-defaults";
import { parseCardDefaults } from "./card-defaults-schema";
import type { LayersConfig, TextSeal } from "./layers";
import { parseCreatorConfig } from "./layers-io";
import { applyTierStyle, configFromCharacter, retierLayers, settleAutoStyle, tierTextSeal } from "./layers-rarity";

const key = (n: number) => `sets/s1/layers/${String(n).padStart(64, "0")}.webp`;
const TIERS = ["n", "r", "sr", "ssr", "ur"] as const;
const other = { sealSize: 22, border: 5.5 };

describe("spec 028 — valores por defecto de las cartas", () => {
  it("test_s028_rf1_la_carta_nueva_sale_con_sello_15_y_borde_3_en_cualquier_rareza", () => {
    expect(FACTORY_CARD_DEFAULTS).toEqual({ sealSize: 15, border: 3 });
    for (const tier of TIERS) {
      const c = configFromCharacter(key(1), tier, 7);
      expect((c.sello as TextSeal).tamano, tier).toBe(15);
      expect(c.borde, tier).toBe(3);
      expect(c.estiloAuto).toBe(true);
    }
  });

  it("test_s028_rf1_rf15_con_otros_valores_del_panel_la_carta_nueva_sale_con_ellos", () => {
    const c = configFromCharacter(key(1), "ssr", 7, other);
    expect(c.sello).toMatchObject({ texto: "LEG", tamano: 22 });
    expect(c.borde).toBe(5.5);
  });

  it("test_s028_rf2_aplicar_el_estilo_de_la_rareza_vuelve_a_15_y_3", () => {
    const tocada: LayersConfig = { capas: [{ key: key(2), rol: "personaje" }], marco: "personalizado", marcoColores: { color: "#112233", brillo: "#ffffff" }, borde: 6.4, sello: { texto: "Z", estilo: "rosa", esquina: "inf-der", tamano: 30 } };
    for (const tier of TIERS) {
      const out = applyTierStyle(tocada, tier, 1);
      expect(out.borde).toBe(3);
      expect(out.sello).toMatchObject({ tamano: 15, esquina: "sup-izq" });
    }
    expect(tierTextSeal("ur")).toEqual({ texto: "EX", estilo: "arcoiris", tamano: 15 });
  });

  it("test_s028_rf3_al_cambiar_la_rareza_con_estilo_automatico_se_conservan_15_y_3", () => {
    let c = configFromCharacter(key(1), "n", 7);
    for (const tier of ["r", "ur", "sr", "n"] as const) {
      c = retierLayers(c, tier).config;
      expect(c.borde).toBe(3);
      expect((c.sello as TextSeal).tamano).toBe(15);
      expect(c.estiloAuto).toBe(true);
    }
  });

  it("test_s028_rf3_tocar_el_borde_apaga_el_estilo_automatico_y_aplicarlo_lo_devuelve", () => {
    const auto = configFromCharacter(key(1), "sr", 7);
    expect(settleAutoStyle(auto, { ...auto, borde: 4 }, "sr").estiloAuto).toBe(false);
    expect(settleAutoStyle(auto, { ...auto }, "sr").estiloAuto).toBe(true);
    // Con los valores del panel, el estilo del escalón es el que los lleva.
    const conOtros = applyTierStyle(auto, "sr", 7, other);
    expect(settleAutoStyle({ ...auto, estiloAuto: false }, { ...conOtros, estiloAuto: true }, "sr", other).estiloAuto).toBe(true);
  });

  it("test_s028_rf5_importar_sin_tamano_de_sello_ni_borde_usa_15_y_3", () => {
    const r = parseCreatorConfig({ marco: "sr", capas: [{ src: "a_personaje.webp" }], sello: { texto: "E", estilo: "morado", esquina: "sup-izq" } });
    expect(r.ok && r.config).toMatchObject({ borde: 3, sello: { tamano: 15 } });
    // Lo que trae la configuración se respeta; los valores del panel cubren lo que falta.
    const kept = parseCreatorConfig({ marco: "sr", borde: 1.2, capas: [{ src: "a_personaje.webp" }], sello: { texto: "E", estilo: "morado", esquina: "sup-izq", tamano: 9 } });
    expect(kept.ok && kept.config).toMatchObject({ borde: 1.2, sello: { tamano: 9 } });
    const panel = parseCreatorConfig({ marco: "sr", capas: [{ src: "a_personaje.webp" }], sello: { texto: "E", estilo: "morado", esquina: "sup-izq" } }, other);
    expect(panel.ok && panel.config).toMatchObject({ borde: 5.5, sello: { tamano: 22 } });
    // Un sello de imagen no cambia de tamaño (decisión del dueño).
    const img = parseCreatorConfig({ marco: "sr", capas: [{ src: "a_personaje.webp" }], sello: { src: "s.webp", esquina: "sup-izq" } });
    expect(img.ok && img.config.sello).toEqual({ src: "s.webp", esquina: "sup-izq" });
  });

  it("test_s028_rf15_ajustes_no_validos_vuelven_a_los_de_fabrica", () => {
    expect(parseCardDefaults({ sealSize: 20, border: 2.5 })).toEqual({ sealSize: 20, border: 2.5 });
    expect(parseCardDefaults(null)).toEqual(FACTORY_CARD_DEFAULTS);
    expect(parseCardDefaults({ sealSize: 41, border: 2 })).toEqual(FACTORY_CARD_DEFAULTS);
    expect(parseCardDefaults({ sealSize: 15, border: -1 })).toEqual(FACTORY_CARD_DEFAULTS);
  });
});
