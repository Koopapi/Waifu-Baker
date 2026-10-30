// Spec 026: la paleta Street pop (RF-17), su contraste (RF-24 y RF-25) y que el kawaii no cambie.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const street = readFileSync(path.join(__dirname, "street.css"), "utf8");
const tokens = readFileSync(path.join(__dirname, "..", "tokens.css"), "utf8");

/** Variables de un bloque CSS (el primero cuyo selector coincide). */
function block(css: string, selector: string) {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`Falta el bloque ${selector}`);
  const body = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\b/gi)].map((m) => [m[1], m[2].toLowerCase()]));
}

/** Contraste WCAG 2.x entre dos colores hexadecimales. */
function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const sp = block(street, '[data-theme="street"]');
const ink = block(street, '[data-theme="street"] .ui-ink,\n[data-theme="street"] .ui-toast,\n[data-theme="street"] .ui-tooltip');

describe("tema Street pop", () => {
  it("test_s026_rf17_usa_la_paleta_de_bruno", () => {
    expect(sp["ui-bg"]).toBe("#ece4fa");
    expect(sp["ui-raised"]).toBe("#ffffff");
    expect(sp["ui-text"]).toBe("#17132b");
    expect(sp["ui-accent"]).toBe("#ff3ea5");
    expect(sp["ui-k-lavanda"]).toBe("#3b2fc9");
    expect(sp["ui-k-limon-oscuro"]).toBe("#c6f432");
    expect(sp["ui-k-menta"]).toBe("#3fe0d0");
    expect(sp["ui-k-limon"]).toBe("#ffd93d");
  });

  it("test_s026_rf25_el_texto_supera_4_5_a_1_sobre_los_fondos", () => {
    for (const bg of ["ui-bg", "ui-nav", "ui-raised", "ui-rail", "ui-hover"]) {
      for (const fg of ["ui-text", "ui-text-2", "ui-text-3", "ui-accent-text", "ui-success-text", "ui-warning-text", "ui-danger-text", "ui-info-text"]) {
        expect(contrast(sp[fg], sp[bg]), `${fg} sobre ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    // Los sólidos (botones, insignias, fichas) llevan texto de tinta.
    for (const bg of ["ui-accent", "ui-accent-hover", "ui-success", "ui-warning", "ui-danger", "ui-info", "ui-k-limon-oscuro", "ui-k-menta"]) {
      expect(contrast(sp["ui-on-accent"], sp[bg]), `tinta sobre ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
    // Zonas de tinta: barra lateral, riel, barra de abajo, avisos.
    for (const bg of ["ui-nav", "ui-raised", "ui-hover"]) {
      for (const fg of ["ui-text", "ui-text-2", "ui-text-3", "ui-accent-text"]) {
        expect(contrast(ink[fg], ink[bg]), `${fg} sobre ${bg} (tinta)`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("test_s026_rf25_bordes_de_campo_y_foco_superan_3_a_1", () => {
    // Bordes de campos en tinta y foco en índigo (`--ui-accent-text`).
    for (const bg of ["ui-bg", "ui-raised"]) {
      expect(contrast(sp["ui-ink"], sp[bg])).toBeGreaterThanOrEqual(3);
      expect(contrast(sp["ui-accent-text"], sp[bg])).toBeGreaterThanOrEqual(3);
      expect(contrast(sp["ui-line"], sp[bg]), `línea sobre ${bg}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("test_s026_rf24_el_rosa_y_la_lima_nunca_son_texto", () => {
    // El texto de acento no es el rosa, y ninguna variable de texto vale rosa ni lima.
    const textVars = Object.entries(sp).filter(([k]) => /text/.test(k));
    for (const [k, v] of textVars) expect(["#ff3ea5", "#c6f432", "#ff5cb3"], k).not.toContain(v);
    expect(street).not.toMatch(/(^|[\s;{])color:\s*var\(--ui-(accent|k-limon-oscuro)\)/m);
  });

  it("test_s026_solo_actua_bajo_el_tema_street", () => {
    // Cada regla de la hoja empieza por el selector del tema: nada se escapa al kawaii.
    const selectors = [...street.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(^|})\s*([^{}@]+)\{/g)].map((m) => m[2].trim());
    expect(selectors.length).toBeGreaterThan(30);
    for (const sel of selectors) for (const part of sel.split(",")) expect(part.trim(), sel).toMatch(/^\[data-theme="street"\]/);
  });

  it("test_s026_rf12_una_zona_kawaii_vuelve_a_los_valores_oscuros", () => {
    expect(tokens).toMatch(/:root,\s*\[data-theme="kawaii"\]\s*\{\s*color-scheme: dark;/);
  });
});
