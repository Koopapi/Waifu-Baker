import { describe, expect, it } from "vitest";
import type { LayersConfig } from "./layers";
import { exportCreatorConfig, parseCreatorConfig, withKeys } from "./layers-io";

const key = (n: number) => `sets/s1/layers/${String(n).padStart(64, "0")}.webp`;
const bg = `sets/s1/backgrounds/${"b".repeat(64)}.webp`;

const config: LayersConfig = {
  capas: [
    { key: bg, rol: "fondo", profundidad: 0.2, margen: 5 },
    { particulas: "destellos-dorados", cantidad: 55, semilla: 7, profundidad: 0.55, margen: 4 },
    { key: key(2), rol: "personaje", encuadre: { x: 4, y: 0, escala: 1.2, giro: 0, ajuste: "contener" } },
    { key: key(3), rol: "extra", mezcla: "overlay", opacidad: 0.8 },
  ],
  marco: "ssr",
  sello: { key: key(9), esquina: "sup-der", tamano: 30 },
  estiloAuto: false,
};

/** Configuración del creador de Bruno, como la de su carta de ejemplo. */
const yuki = {
  id: "yuki",
  etiqueta: "Yuki, rareza SSR",
  marco: "ssr",
  proporcion: 0.7064,
  capas: [
    { src: "cartas/yuki/yuki_1_fondo.webp", profundidad: 0.2, margen: 5 },
    { particulas: "destellos-dorados", cantidad: 60, semilla: 7, profundidad: 0.55, margen: 4 },
    { src: "cartas/yuki/yuki_3_personaje.webp", profundidad: 1 },
    { src: "cartas/yuki/yuki_4_particulas1.webp", profundidad: 1.3, margen: 6, mezcla: "overlay" },
    { src: "cartas/yuki/yuki_5_insignia.webp", profundidad: 1.6 },
  ],
  sello: { src: "cartas/yuki/yuki_ssr.webp", esquina: "sup-izq" },
};

describe("spec 017 — exportar al formato del creador", () => {
  it("test_s017_rf17_exporta_la_configuracion_con_nombres_de_archivo_y_encuadre", () => {
    const { json, files } = exportCreatorConfig(config, "carta-007");
    expect(json).toMatchObject({ id: "carta-007", marco: "ssr", proporcion: 0.7064 });
    expect(json.capas).toEqual([
      { src: "carta-007_1_fondo.webp", rol: "fondo", profundidad: 0.2, margen: 5 },
      { particulas: "destellos-dorados", cantidad: 55, semilla: 7, profundidad: 0.55, margen: 4 },
      { src: "carta-007_2_personaje.webp", rol: "personaje", encuadre: { x: 4, y: 0, escala: 1.2, giro: 0, ajuste: "contener" } },
      { src: "carta-007_3_capa.webp", rol: "extra", mezcla: "overlay", opacidad: 0.8 },
    ]);
    expect(json.sello).toEqual({ src: "carta-007_sello.webp", esquina: "sup-der", tamano: 30 });
    // Cada archivo con la clave del almacén de la que sale.
    expect(files).toEqual([
      { name: "carta-007_1_fondo.webp", key: bg },
      { name: "carta-007_2_personaje.webp", key: key(2) },
      { name: "carta-007_3_capa.webp", key: key(3) },
      { name: "carta-007_sello.webp", key: key(9) },
    ]);
  });

  it("test_s017_rf17_una_imagen_repetida_se_exporta_una_vez", () => {
    const twice: LayersConfig = { ...config, capas: [config.capas[0], { ...(config.capas[0] as object), profundidad: 1 } as LayersConfig["capas"][number], config.capas[2]] };
    const { json, files } = exportCreatorConfig(twice, "c");
    expect((json.capas as { src?: string }[]).map((c) => c.src)).toEqual(["c_1_fondo.webp", "c_1_fondo.webp", "c_2_personaje.webp"]);
    // Fondo (una vez), chica y sello.
    expect(files.map((f) => f.name)).toEqual(["c_1_fondo.webp", "c_2_personaje.webp", "c_sello.webp"]);
  });
});

describe("spec 017 — importar el formato del creador", () => {
  it("test_s017_rf18_lee_la_configuracion_del_creador_y_los_archivos_que_pide", () => {
    const r = parseCreatorConfig(yuki);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.files).toEqual([
      { name: "yuki_1_fondo.webp", kind: "layer" },
      { name: "yuki_3_personaje.webp", kind: "character" },
      { name: "yuki_4_particulas1.webp", kind: "layer" },
      { name: "yuki_5_insignia.webp", kind: "layer" },
      { name: "yuki_ssr.webp", kind: "seal" },
    ]);
    // Sin `rol` (formato original), el papel sale del nombre del archivo, como en el creador.
    expect(r.config.capas.map((l) => ("src" in l ? l.rol : "particulas"))).toEqual(["fondo", "particulas", "personaje", "extra", "extra"]);
    expect(r.config).toMatchObject({ marco: "ssr", sello: { src: "yuki_ssr.webp", esquina: "sup-izq" } });
    expect(r.changedBlends).toEqual([]);
  });

  it("test_s017_rf18_lo_exportado_se_vuelve_a_importar_igual", () => {
    const { json } = exportCreatorConfig(config, "carta-007");
    const r = parseCreatorConfig(JSON.parse(JSON.stringify(json)));
    expect(r.ok && r.config.capas[2]).toEqual({ src: "carta-007_2_personaje.webp", rol: "personaje", encuadre: { x: 4, y: 0, escala: 1.2, giro: 0, ajuste: "contener" } });
  });

  it("test_s017_rf18_una_configuracion_no_valida_indica_que_parte_falla", () => {
    expect(parseCreatorConfig("hola")).toEqual({ ok: false, path: "" });
    expect(parseCreatorConfig({ ...yuki, marco: "linear-gradient(red,blue)" })).toEqual({ ok: false, path: "marco" });
    expect(parseCreatorConfig({ ...yuki, capas: [{ profundidad: 1 }] })).toEqual({ ok: false, path: "capas.0" });
    expect(parseCreatorConfig({ ...yuki, capas: [...yuki.capas, { src: "a.webp", encuadre: { escala: 9 } }] })).toEqual({ ok: false, path: "capas.5.encuadre.escala" });
  });

  it("test_s017_rf18_mas_de_ocho_capas_de_imagen_se_rechaza", () => {
    const nine = Array.from({ length: 9 }, (_, i) => ({ src: `c${i}.webp` }));
    expect(parseCreatorConfig({ ...yuki, capas: nine })).toEqual({ ok: false, path: "capas", max: 8 });
  });

  it("test_s017_rf19_una_mezcla_que_no_se_ofrece_pasa_a_normal_y_se_avisa", () => {
    const r = parseCreatorConfig({ ...yuki, capas: [yuki.capas[0], { ...yuki.capas[2], mezcla: "hue" }, { particulas: "nieve", mezcla: "luminosity" }] });
    expect(r.ok && r.changedBlends).toEqual([2, 3]);
    expect(r.ok && r.config.capas.map((l) => l.mezcla)).toEqual([undefined, "normal", "normal"]);
  });
});

describe("spec 017 — colocar cada archivo en su capa", () => {
  it("test_s017_rf18_cada_archivo_subido_ocupa_su_capa", () => {
    const r = parseCreatorConfig(yuki);
    if (!r.ok) throw new Error("no válida");
    const keys = Object.fromEntries(r.files.map((f, i) => [f.name, `tmp/layers/${i}.webp`]));
    const c = withKeys(r.config, keys);
    expect(c.capas.map((l) => ("key" in l ? l.key : "p"))).toEqual(["tmp/layers/0.webp", "p", "tmp/layers/1.webp", "tmp/layers/2.webp", "tmp/layers/3.webp"]);
    expect(c.sello).toEqual({ key: "tmp/layers/4.webp", esquina: "sup-izq" });
  });
});
