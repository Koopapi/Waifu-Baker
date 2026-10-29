import { describe, expect, it } from "vitest";
import { BLEND_MODES, DEFAULT_FRAMING, characterLayer, checkCharacterSize, checkLayerSize, checkLayersConfig, framingOf, imageKeys, isAssembled, isSetLayerKey, isTempKey, missingParts, repeatedImages, resetFraming, setBackground, type ImageLayer, type LayersConfig } from "./layers";

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

describe("spec 017 — armado por capas", () => {
  const chica = (extra: Record<string, unknown> = {}) => img(1, { rol: "personaje", ...extra });
  const fondo = (extra: Record<string, unknown> = {}) => img(2, { rol: "fondo", ...extra });
  const parse = (input: unknown) => (checkLayersConfig(input) as { ok: true; config: LayersConfig }).config;

  it("test_s017_rf10_cada_capa_de_imagen_lleva_rol_y_encuadre_opcionales", () => {
    const c = checkLayersConfig(base([fondo(), chica({ encuadre: { x: 10, y: -5, escala: 1.4, giro: 12, ajuste: "contener" } })], { estiloAuto: true }));
    expect(c.ok).toBe(true);
    // Las configuraciones de la spec 016 (sin rol ni encuadre) siguen siendo válidas.
    expect(checkLayersConfig(base([img(1)])).ok).toBe(true);
    expect(checkLayersConfig(base([img(1, { rol: "jefa" })])).ok).toBe(false);
    expect(checkLayersConfig(base([chica({ encuadre: { ajuste: "estirar" } })])).ok).toBe(false);
  });

  it("test_s017_rf11_escala_entre_10_y_400_por_ciento_y_giro_entre_menos_180_y_180", () => {
    const con = (encuadre: Record<string, unknown>) => checkLayersConfig(base([chica({ encuadre })])).ok;
    expect(con({ escala: 0.1 })).toBe(true);
    expect(con({ escala: 4 })).toBe(true);
    expect(con({ escala: 0.09 })).toBe(false);
    expect(con({ escala: 4.01 })).toBe(false);
    expect(con({ giro: -180 })).toBe(true);
    expect(con({ giro: 181 })).toBe(false);
    expect(con({ x: 101 })).toBe(false);
  });

  it("test_s017_rf11_restablecer_el_encuadre_de_una_capa", () => {
    const c = parse(base([fondo({ encuadre: { x: 30, escala: 2 } }), chica({ encuadre: { x: -20, y: 8, escala: 0.5, giro: 40 } })]));
    expect(framingOf(c.capas[0] as ImageLayer)).toEqual({ x: 30, y: 0, escala: 2, giro: 0, ajuste: "cubrir" });
    const [f, p] = c.capas.map((l) => resetFraming(l as ImageLayer));
    // El personaje se dibuja entero (contener); el fondo cubre el lienzo.
    expect(framingOf(p)).toEqual({ ...DEFAULT_FRAMING, ajuste: "contener" });
    expect(framingOf(f)).toEqual({ ...DEFAULT_FRAMING, ajuste: "cubrir" });
    expect(p.key).toBe(chica().key);
  });

  it("test_s017_rf15_carta_armada_con_personaje_y_fondo_visibles", () => {
    expect(isAssembled(parse(base([fondo(), chica()])))).toBe(true);
    expect(missingParts(parse(base([chica()])))).toEqual(["fondo"]);
    expect(missingParts(parse(base([fondo(), chica({ visible: false })])))).toEqual(["personaje"]);
    expect(missingParts(parse(base([fondo({ opacidad: 0 }), chica()])))).toEqual(["fondo"]);
    // Capas sin rol (spec 016) no cuentan como armado; sin configuración falta todo.
    expect(missingParts(parse(base([img(1), img(2)])))).toEqual(["personaje", "fondo"]);
    expect(missingParts(null)).toEqual(["personaje", "fondo"]);
  });

  it("test_s017_rf5_una_carta_tiene_como_mucho_un_personaje", () => {
    expect(checkLayersConfig(base([chica(), img(3, { rol: "personaje" })]))).toEqual({ ok: false, issue: { code: "two_characters" } });
    expect(characterLayer(parse(base([fondo(), chica()])))?.key).toBe(chica().key);
  });

  it("test_s017_rf5_no_se_puede_quitar_el_personaje", () => {
    const before = parse(base([fondo(), chica()]));
    expect(checkLayersConfig(base([fondo()]), before)).toEqual({ ok: false, issue: { code: "character_required" } });
    // Ocultarlo tampoco: el personaje debe seguir visible.
    expect(checkLayersConfig(base([fondo(), chica({ visible: false })]), before)).toEqual({ ok: false, issue: { code: "character_required" } });
    // Sustituirlo por otra imagen sí.
    expect(checkLayersConfig(base([fondo(), img(7, { rol: "personaje" })]), before).ok).toBe(true);
    // Sin personaje antes (configuración antigua), no se exige.
    expect(checkLayersConfig(base([fondo()]), parse(base([img(1)]))).ok).toBe(true);
  });
});

describe("spec 017 — tamaño de la imagen de la chica", () => {
  it("test_s017_rf2_al_menos_991_px_de_alto_y_cualquier_proporcion", () => {
    expect(checkCharacterSize(400, 990)).toEqual({ ok: false, code: "character_too_short", min: 991 });
    expect(checkCharacterSize(400, 991)).toEqual({ ok: true });
    expect(checkCharacterSize(3000, 1000)).toEqual({ ok: true });
  });
});

describe("spec 017 — elegir el fondo", () => {
  const parse = (input: unknown) => (checkLayersConfig(input) as { ok: true; config: LayersConfig }).config;

  it("test_s017_rf8_poner_un_fondo_lo_coloca_detras_de_todo", () => {
    const c = parse(base([img(1, { rol: "personaje" })]));
    const out = setBackground(c, "sets/s1/backgrounds/x.webp");
    expect(out.capas[0]).toMatchObject({ key: "sets/s1/backgrounds/x.webp", rol: "fondo", profundidad: 0.2, margen: 5 });
    expect(out.capas[1]).toEqual(c.capas[0]);
  });

  it("test_s017_rf8_cambiar_el_fondo_conserva_sus_ajustes", () => {
    const c = parse(base([img(2, { rol: "fondo", profundidad: 0.1, encuadre: { escala: 1.2 } }), img(1, { rol: "personaje" })]));
    const out = setBackground(c, "sets/s1/backgrounds/y.webp");
    expect(out.capas[0]).toEqual({ key: "sets/s1/backgrounds/y.webp", rol: "fondo", profundidad: 0.1, encuadre: { escala: 1.2 } });
    expect(out.capas).toHaveLength(2);
  });
});
