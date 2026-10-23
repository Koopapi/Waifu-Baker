import { describe, expect, it } from "vitest";
import { BLEND_MODES, checkLayerSize, checkLayersConfig, imageKeys, isSetLayerKey, isTempKey, repeatedImages, type LayersConfig } from "./layers";

const img = (n: number, extra: Record<string, unknown> = {}) => ({ key: `sets/s1/layers/${String(n).padStart(64, "0")}.webp`, ...extra });
const base = (capas: unknown[], extra: Record<string, unknown> = {}) => ({ capas, marco: "ssr", sello: null, ...extra });

describe("spec 016 — configuración por capas", () => {
  it("test_s016_rf13_sin_ninguna_capa_visible_no_se_guarda", () => {
    expect(checkLayersConfig(base([img(1, { visible: false }), img(2, { opacidad: 0 })]))).toEqual({ ok: false, issue: { code: "no_visible_layer" } });
    expect(checkLayersConfig(base([{ particulas: "nieve" }]))).toMatchObject({ ok: false, issue: { code: "no_visible_layer" } });
    expect(checkLayersConfig(base([img(1, { visible: false }), img(2)])).ok).toBe(true);
  });

  it("test_s016_rf13_una_carta_por_capas_necesita_al_menos_una_capa_de_imagen_visible", () => {
    // La regla de RF-67 es la misma comprobación: una configuración sin capa de imagen visible no es válida.
    expect(checkLayersConfig(base([])).ok).toBe(false);
  });

  it("test_s016_rf22_como_mucho_ocho_capas_de_imagen", () => {
    const nine = Array.from({ length: 9 }, (_, i) => img(i));
    expect(checkLayersConfig(base(nine))).toEqual({ ok: false, issue: { code: "too_many_layers", max: 8 } });
    expect(checkLayersConfig(base(nine.slice(0, 8))).ok).toBe(true);
  });

  it("test_s016_rf22_las_particulas_no_cuentan_en_el_limite", () => {
    const eight = Array.from({ length: 8 }, (_, i) => img(i));
    const particles = Array.from({ length: 5 }, () => ({ particulas: "destellos-dorados", cantidad: 30 }));
    expect(checkLayersConfig(base([...eight, ...particles])).ok).toBe(true);
  });

  it("test_s016_rf20_capa_de_menos_de_700_px_de_ancho_se_rechaza", () => {
    expect(checkLayerSize(600, 849)).toEqual({ ok: false, code: "layer_too_narrow", min: 700 });
  });

  it("test_s016_rf20_proporcion_distinta_del_lienzo_se_rechaza_con_el_tamano_esperado", () => {
    expect(checkLayerSize(1500, 2100)).toEqual({ ok: false, code: "layer_ratio", expected: "1400 × 1982" });
    expect(checkLayerSize(1000, 1000)).toMatchObject({ ok: false, code: "layer_ratio" });
  });

  it("test_s016_rf20_misma_proporcion_con_otro_tamano_se_acepta_y_se_escala", () => {
    expect(checkLayerSize(700, 991)).toEqual({ ok: true, scaled: true });
    expect(checkLayerSize(1400, 1982)).toEqual({ ok: true, scaled: false });
    // Dentro del 1 %: 2100 × 2960 (0,7095 frente a 0,7064).
    expect(checkLayerSize(2100, 2960)).toEqual({ ok: true, scaled: true });
  });

  it("test_s016_rf24_la_misma_imagen_dos_veces_en_la_carta_se_avisa", () => {
    const c = checkLayersConfig(base([img(1), img(2), img(1)]));
    expect(c.ok && repeatedImages(c.config)).toEqual([img(1).key]);
  });

  it("test_s016_rf7_solo_los_modos_de_mezcla_que_reproduce_la_imagen_plana", () => {
    expect(BLEND_MODES).not.toContain("hue");
    expect(BLEND_MODES).not.toContain("luminosity");
    expect(checkLayersConfig(base([img(1, { mezcla: "overlay" })])).ok).toBe(true);
    expect(checkLayersConfig(base([img(1, { mezcla: "hue" })]))).toMatchObject({ ok: false, issue: { code: "invalid_layers" } });
  });

  it("test_s016_rf10_sello_de_texto_o_de_imagen_en_una_esquina", () => {
    expect(checkLayersConfig(base([img(1)], { sello: { texto: "SSR", estilo: "oro", esquina: "sup-izq" } })).ok).toBe(true);
    expect(checkLayersConfig(base([img(1)], { sello: { key: img(9).key, esquina: "inf-der", tamano: 30 } })).ok).toBe(true);
    expect(checkLayersConfig(base([img(1)], { sello: { texto: "SSR", estilo: "oro", esquina: "centro" } })).ok).toBe(false);
  });

  it("test_s016_claves_de_imagen_de_la_configuracion", () => {
    const c = checkLayersConfig(base([img(1), { particulas: "nieve" }], { sello: { key: img(9).key, esquina: "sup-izq" } })) as { ok: true; config: LayersConfig };
    expect(imageKeys(c.config)).toEqual([img(1).key, img(9).key]);
    expect(isTempKey("tmp/layers/0b6f3c4e-8a1d-4c7e-9f2a-1d2e3f4a5b6c.webp")).toBe(true);
    expect(isSetLayerKey("s1", img(1).key)).toBe(true);
    expect(isSetLayerKey("s2", img(1).key)).toBe(false);
  });
});

describe("spec 016 — capas de partículas", () => {
  it("test_s016_rf8_las_particulas_llevan_tipo_cantidad_tamano_velocidad_y_color", () => {
    const ok = checkLayersConfig(base([img(1), { particulas: "petalos", cantidad: 40, tamano: 1.5, velocidad: 0.8, color: "#ff7eb6" }]));
    expect(ok.ok).toBe(true);
    // Un color que no es hexadecimal o una cantidad fuera de rango no se guardan.
    expect(checkLayersConfig(base([img(1), { particulas: "petalos", color: "red;x" }])).ok).toBe(false);
    expect(checkLayersConfig(base([img(1), { particulas: "petalos", cantidad: 500 }])).ok).toBe(false);
    expect(checkLayersConfig(base([img(1), { particulas: "no-existe" }])).ok).toBe(false);
  });
});
