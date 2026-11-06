// Spec 030: reglas del editor de sobres (las del creador de Bruno).
import { describe, expect, it } from "vitest";
import { emptyDesign, toRegistro, type PackDesign, type PackImageLayer } from "./design";
import { addParticles, analyzePixels, byName, exportRegistro, placeUpload, reviewDesign, uploadRole, type ImageFacts } from "./editor";

const empty = () => emptyDesign("silver");
const ok = (w = 1000, h = 1750, a: ImageFacts["analysis"] = { transparent: false, crossesLine: false }): ImageFacts => ({ width: w, height: h, analysis: a });

describe("spec 030 — valores iniciales por nombre", () => {
  it("test_s030_rf4_cada_archivo_toma_sus_valores_iniciales_por_el_nombre", () => {
    expect(["sobre_fa01_fondo.webp", "bg.png", "background.jpg"].map(uploadRole)).toEqual(["fondo", "fondo", "fondo"]);
    expect(["sobre_fa01_personaje.webp", "Waifu.png", "chica-2.webp"].map(uploadRole)).toEqual(["personaje", "personaje", "personaje"]);
    expect(["sobre_fa01_efecto.webp", "glitter.png", "luz.webp"].map(uploadRole)).toEqual(["efecto", "efecto", "efecto"]);
    expect(["mi_logo.png", "logo.webp", "logotipo.png"].map(uploadRole)).toEqual(["logo", "logo", "otra"]);

    let d = placeUpload(empty(), "upload:a", "sobre_fa01_personaje.webp");
    d = placeUpload(d, "upload:b", "sobre_fa01_efecto.webp");
    d = placeUpload(d, "upload:c", "sobre_fa01_fondo.webp");
    d = placeUpload(d, "upload:d", "estrellas.png");
    d = placeUpload(d, "upload:e", "sobre_logo.png");
    const layers = d.capas as PackImageLayer[];
    expect(layers.map((l) => [l.nombre, l.profundidad, l.margen, l.mezcla])).toEqual([
      ["sobre_fa01_fondo.webp", 0.25, 3, undefined],
      ["sobre_fa01_personaje.webp", 1, 2, undefined],
      ["sobre_fa01_efecto.webp", 1.3, 3, "overlay"],
      ["estrellas.png", 1.6, 2, undefined],
    ]);
    expect(d.logo).toEqual({ key: "upload:e", nombre: "sobre_logo.png" });
    // La misma imagen no se repite.
    expect(placeUpload(d, "upload:a", "sobre_fa01_personaje.webp").capas).toHaveLength(4);
    expect(["sobre_10.png", "sobre_2.png"].sort(byName)).toEqual(["sobre_2.png", "sobre_10.png"]);
  });

  it("test_s030_rf6_mas_particulas_va_detras_del_personaje", () => {
    let d = placeUpload(empty(), "upload:f", "fondo.webp");
    d = placeUpload(d, "upload:p", "personaje.webp");
    const withP = addParticles(d, 41);
    expect(withP.capas[1]).toEqual({ particulas: "destellos-arcoiris", cantidad: 18, tamano: 1, velocidad: 1, semilla: 41, profundidad: 0.6, margen: 4 });
    expect(addParticles(empty(), 3).capas).toHaveLength(1);
  });
});

describe("spec 030 — revisión automática", () => {
  const info = { nombre: "FAN ART · VOL. 1", codigo: "FA01" };
  const design = (): PackDesign => ({
    ...empty(),
    capas: [
      { key: "k1", nombre: "fondo.webp" },
      { key: "k2", nombre: "personaje.webp" },
    ],
  });

  it("test_s030_rf9_todo_en_orden_no_da_avisos", () => {
    expect(reviewDesign(design(), info, () => ok())).toEqual([]);
  });

  it("test_s030_rf9_avisa_de_medidas_transparencia_linea_nombre_largo_y_archivos_que_faltan", () => {
    const facts: Record<string, ImageFacts> = {
      k1: ok(1000, 1750, { transparent: true, crossesLine: false }),
      k2: ok(800, 1200, { transparent: true, crossesLine: true }),
    };
    const d = { ...design(), logo: { key: "logo-x" }, sellos: { ...design().sellos, patron: { key: "pat-x" } } };
    const issues = reviewDesign(d, { nombre: "UN NOMBRE MUY LARGO DE SET", codigo: "X" }, (k) => facts[k]);
    expect(issues.map((i) => i.code)).toEqual(["transparent_background", "size", "crosses_line", "long_name", "logo_missing", "pattern_missing"]);
    expect(issues.find((i) => i.code === "size")).toMatchObject({ level: "bad", width: 800, height: 1200, sameRatio: false });
    // Con la proporción correcta es un aviso, no un error.
    expect(reviewDesign(design(), info, (k) => (k === "k2" ? ok(500, 875) : ok()))[0]).toMatchObject({ code: "size", level: "warn", sameRatio: true });
    expect(reviewDesign(design(), info, (k) => (k === "k1" ? ok() : undefined))).toEqual([{ level: "bad", code: "missing_file", name: "personaje.webp" }]);
    expect(reviewDesign(empty(), { nombre: "", codigo: "" }, () => undefined).map((i) => i.code)).toEqual(["no_background", "no_band"]);
  });

  it("test_s030_rf9_la_lectura_de_pixeles_ve_transparencia_y_arte_en_la_linea", () => {
    const w = 50;
    const h = 88;
    const opaque = new Uint8ClampedArray(w * h * 4).fill(255);
    expect(analyzePixels(opaque, w, h)).toEqual({ transparent: false, crossesLine: true });
    const clear = new Uint8ClampedArray(w * h * 4);
    expect(analyzePixels(clear, w, h)).toEqual({ transparent: true, crossesLine: false });
  });

  it("test_s030_rf3_el_registro_que_se_ensena_omite_lo_que_vale_por_defecto", () => {
    const r = exportRegistro(toRegistro(design(), { ...info, cartas: 5 }, (k) => `${k}.webp`));
    expect(Object.keys(r)).toEqual(["nombre", "codigo", "cartas", "vista", "apertura", "capas", "sellos"]);
    const full = exportRegistro(toRegistro({ ...design(), holo: true, holoIntensidad: 0.35, foilIntensidad: 0.8, plastico: 1.2, logo: false }, { ...info, cartas: 5 }, (k) => k));
    expect(full).toMatchObject({ logo: false, holo: true, holoIntensidad: 0.35, foilIntensidad: 0.8, plastico: 1.2 });
  });
});
