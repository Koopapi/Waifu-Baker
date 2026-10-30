import { describe, expect, it } from "vitest";
import type { LayersConfig } from "./layers";
import { addParticles, byNaturalName, placeUpload, planUpload, trimBox, layerToSeal } from "./layers-editing";

const k = (n: number) => `tmp/layers/${String(n).repeat(8)}-1111-1111-1111-${"1".repeat(12)}.webp`;
const empty: LayersConfig = { capas: [], marco: "ssr", sello: null };
const withGirl: LayersConfig = { ...empty, capas: [{ key: k(1), rol: "fondo", profundidad: 0.2, margen: 5 }, { key: k(2), rol: "personaje", profundidad: 1 }] };

describe("spec 025 — subir capas por nombre (RF-20)", () => {
  it("test_s025_rf20_los_archivos_se_ordenan_por_nombre_natural", () => {
    expect(["yuki_10_luz.webp", "yuki_2_personaje.webp", "yuki_1_fondo.webp"].sort(byNaturalName)).toEqual(["yuki_1_fondo.webp", "yuki_2_personaje.webp", "yuki_10_luz.webp"]);
  });

  it("test_s025_rf20_el_nombre_propone_el_papel_de_cada_archivo", () => {
    expect(planUpload("yuki_ssr.webp", empty)).toEqual({ kind: "seal" });
    expect(planUpload("yuki_1_fondo.webp", empty)).toEqual({ kind: "background" });
    expect(planUpload("yuki_3_personaje.webp", empty)).toEqual({ kind: "character" });
    expect(planUpload("yuki_3_personaje.webp", withGirl)).toEqual({ kind: "layer", defaults: { profundidad: 1 } });
    expect(planUpload("yuki_4_overlay.webp", empty)).toEqual({ kind: "layer", defaults: { profundidad: 1.3, margen: 6, mezcla: "overlay" } });
    expect(planUpload("yuki_4_glitter.webp", empty)).toEqual({ kind: "layer", defaults: { profundidad: 1.3, margen: 6 } });
    // Cualquier otro: un poco más adelante que la capa más cercana (mínimo 0,5; máximo 2,5).
    expect(planUpload("yuki_5_insignia.webp", withGirl)).toEqual({ kind: "layer", defaults: { profundidad: 1.3 } });
    expect(planUpload("x.webp", empty)).toEqual({ kind: "layer", defaults: { profundidad: 0.5 } });
    // Con un sello de imagen ya puesto, otro archivo «sello» es una capa más.
    expect(planUpload("sello.webp", { ...empty, sello: { key: k(9), esquina: "sup-izq" } }).kind).toBe("layer");
  });

  it("test_s025_rf20_cada_archivo_va_a_su_sitio", () => {
    let c = placeUpload(empty, k(3), { kind: "layer", defaults: { profundidad: 0.5 } });
    c = placeUpload(c, k(1), { kind: "background" });
    c = placeUpload(c, k(2), { kind: "character" });
    c = placeUpload(c, k(9), { kind: "seal" });
    expect(c.capas.map((l) => ("key" in l ? l.rol : "p"))).toEqual(["fondo", "extra", "personaje"]);
    expect(c.sello).toEqual({ key: k(9), esquina: "sup-izq", tamano: 36 });
    // Un segundo fondo va detrás de todo como capa más.
    expect(placeUpload(c, k(4), { kind: "background" }).capas[0]).toEqual({ key: k(4), rol: "extra", profundidad: 0.2, margen: 5 });
  });
});

describe("spec 025 — acciones del configurador", () => {
  it("test_s025_las_particulas_nuevas_van_justo_detras_de_la_chica", () => {
    const c = addParticles(withGirl, 7);
    expect(c.capas[1]).toMatchObject({ particulas: "destellos-dorados", semilla: 7 });
    expect(c.capas[2]).toMatchObject({ rol: "personaje" });
  });

  it("test_s025_rf12_usar_como_sello_pasa_la_capa_al_sello_y_la_quita", () => {
    const c: LayersConfig = { ...withGirl, capas: [...withGirl.capas, { key: k(5), rol: "extra" }], sello: { texto: "LEG", estilo: "oro", esquina: "inf-der" } };
    const out = layerToSeal(c, 2);
    expect(out.capas).toHaveLength(2);
    expect(out.sello).toEqual({ key: k(5), esquina: "inf-der", tamano: 36 });
    // La chica no.
    expect(layerToSeal(c, 1)).toBe(c);
  });

  it("test_s025_rf13_el_sello_se_recorta_a_su_contenido_con_margen", () => {
    // 100 × 50 con contenido opaco en x 10..29, y 5..14.
    const w = 100, h = 50;
    const alpha = (i: number) => {
      const x = i % w, y = Math.floor(i / w);
      return x >= 10 && x < 30 && y >= 5 && y < 15 ? 255 : 0;
    };
    expect(trimBox(alpha, w, h)).toEqual({ recorte: [0.08, 0.06, 0.24, 0.28], relacion: 1.7143 });
  });

  it("test_s025_rf13_sin_mucho_espacio_transparente_o_vacio_no_se_recorta", () => {
    expect(trimBox(() => 255, 10, 10)).toBeNull();
    expect(trimBox(() => 0, 10, 10)).toBeNull();
  });
});
