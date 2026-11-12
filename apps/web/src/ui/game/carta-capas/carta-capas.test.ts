// La configuración de una carta por capas puede venir de la base de datos: lo que el script mete en `style` o en
// atributos solo puede ser de una lista cerrada (si no, una config manipulada inyectaría HTML o CSS).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import lib from "./carta-capas.js";
import type { CartaCapasApi } from "./carta-capas";
import { DEFAULT_BORDER, LEGACY_FRAME_BORDER } from "@/domain/cards/card-defaults";

const api = lib as unknown as CartaCapasApi;
const src = readFileSync(path.resolve(__dirname, "carta-capas.js"), "utf8");

describe("carta por capas — valores seguros", () => {
  it("solo acepta modos de mezcla conocidos", () => {
    expect(api.seguro.mezcla("screen")).toBe("screen");
    expect(api.seguro.mezcla('screen;" onmouseover="alert(1)')).toBe("normal");
    expect(api.seguro.mezcla(undefined)).toBe("normal");
  });

  it("solo acepta las cuatro esquinas del sello", () => {
    expect(api.seguro.esquina("inf-der")).toBe("inf-der");
    expect(api.seguro.esquina('x"><img src=x onerror=alert(1)>')).toBe("sup-izq");
  });

  it("solo acepta colores hexadecimales", () => {
    expect(api.seguro.color("#ff7eb6")).toBe("#ff7eb6");
    expect(api.seguro.color("red;background:url(https://evil)")).toBeNull();
    expect(api.seguro.color(42)).toBeNull();
  });

  it("el script ya no mete la mezcla, la esquina ni el color sin pasar por la lista", () => {
    expect(src).not.toMatch(/'mix-blend-mode:' \+ c\.mezcla/);
    expect(src).not.toMatch(/var esq = s\.esquina/);
    expect(src).not.toMatch(/c\.color \? \[c\.color\]/);
  });
});

describe("spec 017 — encuadre de cada capa", () => {
  it("test_s017_rf12_el_encuadre_es_un_transform_de_la_imagen", () => {
    expect(api.seguro.encuadre({ x: 10, y: -5, escala: 1.5, giro: 12 })).toBe("transform:translate(10%,-5%) scale(1.5) rotate(12deg);");
    // Lo que no trae toma el valor por defecto; el ajuste «contener» dibuja la imagen entera.
    expect(api.seguro.encuadre({ escala: 0.5, ajuste: "contener" })).toBe("transform:translate(0%,0%) scale(0.5) rotate(0deg);object-fit:contain;");
    expect(api.seguro.encuadre({ ajuste: "contener" })).toBe("object-fit:contain;");
  });

  it("test_s017_rf12_sin_encuadre_la_capa_se_dibuja_como_antes", () => {
    expect(api.seguro.encuadre(undefined)).toBe("");
    expect(api.seguro.encuadre({ x: 0, y: 0, escala: 1, giro: 0, ajuste: "cubrir" })).toBe("");
  });

  it("test_s017_rf11_valores_fuera_de_rango_o_no_numericos_se_acotan", () => {
    expect(api.seguro.encuadre({ x: 500, escala: 99, giro: -900 })).toBe("transform:translate(100%,0%) scale(4) rotate(-180deg);");
    expect(api.seguro.encuadre({ x: '1%;background:url(x)', escala: "a" })).toBe("");
    expect(api.seguro.encuadre({ ajuste: "fill;color:red" })).toBe("");
  });

  it("test_s017_rf12_el_encuadre_va_en_la_imagen_y_el_parallax_en_la_capa", () => {
    // La capa (.cc-capa) recibe el translate3d del parallax; el encuadre va en su <img>, así no se pisan.
    expect(src).toMatch(/draggable="false" style="' \+ encuadreEstilo\(c\.encuadre\)/);
    expect(src).toMatch(/capas\[i\]\.style\.transform = 'translate3d\(/);
  });
});

describe("spec 018 — giroscopio", () => {
  it("test_s018_rf12_el_giroscopio_se_puede_activar_y_apagar", () => {
    expect(src).toMatch(/habilitarGiroscopio: function/);
    expect(src).toMatch(/deshabilitarGiroscopio: function \(\) \{\s*global\.removeEventListener\('deviceorientation', onOri\);/);
  });
});

describe("spec 022 — marcos de las cinco rarezas", () => {
  const tiers = ["n", "r", "sr", "ssr", "ur"] as const;
  const marcos = (api as unknown as { marcos: Record<string, [string, string, number]> }).marcos;
  const presets = (api as unknown as { presets: Record<string, { sello: { texto: string } | null }> }).presets;

  it("test_s022_rf9_cada_escalon_tiene_su_marco_distinto_y_mas_grueso_cuanto_mas_raro", () => {
    expect(new Set(tiers.map((t) => marcos[t][0])).size).toBe(5);
    const grosor = tiers.map((t) => marcos[t][2]);
    expect([...grosor].sort((a, b) => a - b)).toEqual(grosor);
    expect(new Set(grosor).size).toBe(5);
  });

  it("test_s038_rf6_los_sellos_son_c_r_ur_ssr_y_ex", () => {
    expect(tiers.map((t) => presets[t].sello?.texto)).toEqual(["C", "R", "UR", "SSR", "EX"]);
  });
});

describe("spec 025 — carta-capas v4 en nuestra copia", () => {
  it("test_s025_rf1_rf2_el_brillo_va_dentro_de_la_capa_con_su_imagen_como_mascara", () => {
    expect(api.version).toBe(4);
    // Spec 030: más «ondas», que solo usan los sobres (el editor de cartas sigue con los cuatro de GLOSS_TYPES).
    expect(Object.keys(api.brillos)).toEqual(["holo", "destello", "oro", "plata", "ondas"]);
    // El brillo es un hijo de la capa (se mueve con ella) y usa la imagen de la capa como máscara.
    expect(src).toMatch(/'<div class="cc-brillo cc-brillo-' \+ b\.tipo/);
    expect(src).toMatch(/mask-image:' \+ m/);
  });

  it("test_s025_la_imagen_de_la_mascara_solo_admite_rutas_sin_caracteres_que_rompan_el_css", () => {
    expect(api.seguro.url("/api/cards/layer?k=abc&e=123&s=%2F")).toBe("/api/cards/layer?k=abc&e=123&s=%2F");
    expect(api.seguro.url("data:image/webp;base64,UklGRg+/=")).toBe("data:image/webp;base64,UklGRg+/=");
    expect(api.seguro.url('x") ; background:url(https://evil')).toBeNull();
    expect(api.seguro.url("a\\b")).toBeNull();
    expect(api.seguro.url(7)).toBeNull();
  });

  it("test_s025_rf3_la_intensidad_del_holo_mueve_la_opacidad_del_holo", () => {
    expect(src).toMatch(/\.cc-card\.cc-con-holo \.cc-holo\{opacity:calc\(var\(--cc-holo-i,\.4\)/);
    expect(src).toMatch(/setProperty\('--cc-holo-i', intensidad\(op\.holoIntensidad, \.4\)\)/);
  });

  it("test_s025_rf6_con_movimiento_reducido_el_destello_queda_quieto_en_el_centro", () => {
    expect(src).toMatch(/prefers-reduced-motion:reduce\)\{\.cc-brillo-destello\{animation:none;background-position:50% 0\}/);
  });

  it("test_s025_ex_es_sinonimo_de_ur_y_conserva_los_sellos_de_la_022", () => {
    const presets = (api as unknown as { presets: Record<string, unknown> }).presets;
    const marcos = (api as unknown as { marcos: Record<string, unknown> }).marcos;
    expect(presets.ex).toBe(presets.ur);
    expect(marcos.ex).toBe(marcos.ur);
  });

  it("test_s025_rf16_el_marco_personalizado_sale_de_dos_colores_validos", () => {
    const [grad, aura] = api.marcoPersonalizado({ color: "#6d5cff", brillo: "#d7ff3a" })!;
    expect(grad).toBe("linear-gradient(135deg,#312973 0%,#d7ff3a 18%,#6d5cff 34%,#ffffff 48%,#6d5cff 62%,#d7ff3a 80%,#312973 100%)");
    expect(aura).toBe("rgba(109,92,255,.25)");
    expect(api.marcoPersonalizado({ color: "red;x:url(y)", brillo: "#fff" })).toBeNull();
    expect(api.marcoPersonalizado(null)).toBeNull();
  });
});

describe("spec 025 — grosor del marco", () => {
  it("test_s025_rf11_sin_grosor_guardado_el_marco_se_sigue_viendo", () => {
    // Antes `num(null, …)` devolvía 0 y el marco no se veía. Desde la spec 028, el grosor sin guardar es 3.
    expect(src).toMatch(/op\.borde == null \? BORDE : num\(op\.borde, BORDE\)/);
  });
});

describe("spec 028 — grosor por defecto del marco", () => {
  it("test_s028_rf4_sin_grosor_guardado_la_carta_viva_y_la_imagen_fija_usan_3", () => {
    // La imagen fija se dibuja con este mismo script en Chromium (server/cards/flatten.ts).
    expect(src).toMatch(new RegExp(`var BORDE = ${DEFAULT_BORDER};`));
    expect(src).toMatch(/--cc-borde:3cqw/);
  });

  it("test_s028_rf6_el_grosor_de_antes_de_cada_marco_es_el_que_rellena_la_migracion", () => {
    const marcos = (api as unknown as { marcos: Record<string, [string, string, number]> }).marcos;
    for (const tier of ["n", "r", "sr", "ssr", "ur"] as const) expect(marcos[tier][2], tier).toBe(LEGACY_FRAME_BORDER[tier]);
    const migration = readFileSync(path.resolve(__dirname, "../../../../drizzle/0021_valores_por_defecto.sql"), "utf8");
    for (const [frame, border] of Object.entries(LEGACY_FRAME_BORDER)) expect(migration).toContain(`WHEN '${frame}' THEN ${border}`);
  });
});

describe("spec 030 — motor compartido con sobre-capas.js", () => {
  it("test_s030_rnf_el_motor_dibuja_la_misma_capa_que_la_carta_con_los_valores_seguros", () => {
    expect(api.version).toBe(4);
    expect(typeof api.motor.inyectarCSS).toBe("function");
    const html = api.motor.capaHTML({ src: "/a.webp", mezcla: "overlay", profundidad: 0.25, margen: 3 }, 0, { semilla: 5 });
    expect(html).toContain('data-p="0.25"');
    expect(html).toContain("mix-blend-mode:overlay");
    expect(html).toContain("inset:-3%");
    // Una mezcla, un color o una URL manipulados no llegan al HTML (la configuración del sobre viene de la BD).
    const bad = api.motor.capaHTML({ src: "/a.webp", mezcla: 'x;background:url(https://evil)', brillo: { tipo: "holo" } }, 0);
    expect(bad).not.toContain("evil");
    expect(api.motor.capaHTML({ src: 'x") ; background:url(https://evil', brillo: { tipo: "holo" } }, 0)).not.toContain("mask-image");
    expect(api.motor.capaHTML({ particulas: "confeti", cantidad: 3, color: "red;x:url(y)" }, 1)).not.toContain("red;x");
    expect(api.motor.particulasHTML({ particulas: "nieve", cantidad: 4 }, 3).match(/<i /g)).toHaveLength(4);
  });

  it("test_s030_rf5_el_brillo_ondas_usa_el_patron_o_arcos_css", () => {
    const own = api.motor.capaHTML({ src: "/f.webp", brillo: { tipo: "ondas", intensidad: 0.8, patron: "/p.webp", patronTamano: 120 } }, 0);
    expect(own).toContain("cc-brillo-ondas");
    expect(own).toContain("--cc-ot:120%");
    expect(own).toContain("mask-image:url(&quot;/p.webp&quot;)");
    const css = api.motor.capaHTML({ src: "/f.webp", brillo: { tipo: "ondas", patron: null } }, 0);
    expect(css).toContain("cc-ondas-css");
    // Un patrón con caracteres que rompen el CSS se descarta y quedan los arcos.
    expect(api.motor.capaHTML({ src: "/f.webp", brillo: { tipo: "ondas", patron: "x)';y" } }, 0)).toContain("cc-ondas-css");
  });

  it("test_s030_rnf_la_capa_de_la_carta_sigue_saliendo_del_mismo_codigo", () => {
    expect(src).toMatch(/function capaHTML\(c, i\) \{ return capaHTMLBase\(c, i, 7 \+ id \+ i, op\.estatica\); \}/);
    // Lo de la 025 y la 028 sigue: personalizado, grosor por defecto y valores seguros.
    expect(typeof api.marcoPersonalizado).toBe("function");
    expect(api.seguro.mezcla("hue")).toBe("hue");
  });
});
