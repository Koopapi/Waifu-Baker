// Spec 030: nuestra copia de sobre-capas.js (paquete de diseño) y sus cambios marcados. Sin navegador, se revisa el
// código y la API: el registro puede venir de la base de datos (lo que va a `style` pasa por listas cerradas).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import lib from "./sobre-capas.js";
import type { SobreCapasApi } from "./sobre-capas";

const api = lib as unknown as SobreCapasApi;
const src = readFileSync(path.resolve(__dirname, "sobre-capas.js"), "utf8");
const paquete = readFileSync(path.resolve(__dirname, "../../../../../../docs/waifu-baker/sobres/src/sobre-capas.js"), "utf8");

describe("spec 030 — sobre-capas.js en el juego", () => {
  it("test_s030_rnf_es_el_componente_del_paquete_de_diseno_con_sus_efectos_y_zonas", () => {
    expect(api.version).toBe(1);
    expect(api.zonas).toEqual({ lienzo: [1000, 1750], selloArriba: [0, 150], selloAbajo: [1625, 1750], corte: 230, logo: [260, 480], set: [1450, 1650], margen: 80 });
    // Los efectos son los suyos: el plástico, el lustre, el rasgado y el sticker vienen tal cual.
    for (const rule of [".sc-lustre{mix-blend-mode:screen", ".sc-rasgar.sc-abierto .sc-tira{transition:transform .8s", "@keyframes sc-flash", ".sc-pl-brillo{inset:-2%"]) {
      expect(paquete).toContain(rule);
      expect(src).toContain(rule);
    }
    expect(src).toMatch(/necesita carta-capas\.js v7 o posterior \(con CartaCapas\.motor\)/);
  });

  it("test_s030_rnf_las_fuentes_del_sobre_son_las_de_next_font_sin_cargarlas_fuera", () => {
    // Dela Gothic One y Archivo salen de las variables del layout (sin precarga): solo se descargan donde se pinta un sobre.
    expect(src).toContain('font-family:var(--font-dela,"Dela Gothic One")');
    expect(src).toContain("var(--font-archivo,Archivo)");
    expect(src).not.toMatch(/fonts\.googleapis/);
  });

  it("test_s030_rnf_los_colores_y_las_urls_del_registro_pasan_por_listas_cerradas", () => {
    expect(src).toMatch(/patron = urlSegura\(C, s\.patron\)/);
    expect(src).toMatch(/logoSrc = op\.logo && typeof op\.logo === 'object' \? urlSegura\(C, op\.logo\.src\)/);
    expect(src).toMatch(/insColor = op\.insignia \? colorSeguro\(C, op\.insignia\.color\)/);
    expect(src).toMatch(/'--sc-s1', colorSeguro\(C, op\.sellos\.arriba\)/);
    expect(src).toMatch(/'--sc-s2', colorSeguro\(C, op\.sellos\.abajo\)/);
    // Lo del paquete de diseño los ponía sin revisar.
    expect(paquete).toMatch(/esc\(op\.insignia\.color\)/);
    expect(src).not.toMatch(/esc\(op\.insignia\.color\)/);
  });

  it("test_s030_rnf_textos_vibracion_y_sonido_los_pone_el_juego", () => {
    expect(src).toMatch(/var TX = textos\(opciones && opciones\.textos\)/);
    expect(src).toMatch(/TX\[ap\]\.aria/);
    expect(src).toMatch(/Number\(op\.cartas\) === 1 \? TX\.carta : TX\.cartas/);
    expect(src).toMatch(/if \(typeof op\.alVibrar === 'function'\) \{ op\.alVibrar\(p\); return; \}/);
    expect(src).toMatch(/op\.alSonido\('rasgon'\)/);
  });

  it("test_s030_rf17_mientras_esta_cerrado_no_se_ve_ninguna_carta", () => {
    // El sobre tapa el mazo: sus partes llevan fondo opaco (y en 3D la silueta del plástico), y el mazo va detrás de
    // él hasta que se abre (opening.css: el sobre por encima de las cartas; las cartas, ocultas antes de abrir).
    expect(src).toContain(".sc-pila{position:absolute;inset:0;overflow:hidden;background:#3B2FC9}");
    const css = readFileSync(path.resolve(__dirname, "../../../features/opening/opening.css"), "utf8");
    expect(css).toMatch(/\.stage__center \{\n {2}z-index: 2;/);
    expect(css).toMatch(/\.stage \.cards \{\n {2}z-index: 1;/);
  });

  it("test_s030_rf16_la_vista_fija_no_anima_ni_escucha_y_sin_gestos_solo_abre_con_teclado_o_boton", () => {
    expect(src).toMatch(/if \(!op\.estatica\) raf = requestAnimationFrame\(cuadro\)/);
    expect(src).toMatch(/if \(!op\.estatica\) \{ zona\.addEventListener\('pointermove', onZona\)/);
    expect(src).toMatch(/if \(estado !== 'cerrado' \|\| op\.gestos === false\) return;/);
  });
});
