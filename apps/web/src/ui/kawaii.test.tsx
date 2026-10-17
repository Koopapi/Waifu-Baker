// Spec 014, RF-1 y RF-2: estilo kawaii sobre fondo oscuro, definido solo con tokens.
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buttonClasses } from "./action/classes";
import { Card } from "./content/Card";

const css = readFileSync(path.resolve(__dirname, "tokens.css"), "utf8");
const layout = readFileSync(path.resolve(__dirname, "../app/layout.tsx"), "utf8");
const px = (name: string) => Number(css.match(new RegExp(`--${name}:\\s*(\\d+)px`))?.[1]);

describe("spec 014 — estilo kawaii", () => {
  it("test_s014_rf1_paleta_pastel_viva_sobre_fondo_oscuro_como_tokens", () => {
    for (const k of ["chicle", "lavanda", "menta", "celeste", "limon", "melocoton", "tinta"]) expect(css, k).toMatch(new RegExp(`--ui-k-${k}:\\s*#[0-9a-f]{6}`));
    for (const k of ["chicle", "lavanda", "menta", "celeste", "limon", "melocoton", "tinta"]) expect(css, k).toContain(`--color-k-${k}: var(--ui-k-${k})`);
    // Fondo oscuro violeta.
    const bg = css.match(/--ui-bg:\s*#([0-9a-f]{6})/)![1];
    expect(parseInt(bg.slice(0, 2), 16) + parseInt(bg.slice(2, 4), 16) + parseInt(bg.slice(4, 6), 16)).toBeLessThan(150);
  });

  it("test_s014_rf1_formas_mas_redondeadas_y_tipografia_redondeada", () => {
    expect(px("radius-m")).toBeGreaterThanOrEqual(12);
    expect(px("radius-l")).toBeGreaterThanOrEqual(20);
    expect(px("radius-xl")).toBeGreaterThanOrEqual(28);
    expect(layout).toMatch(/Fredoka\(/);
    expect(layout).toMatch(/Nunito\(/);
  });

  it("test_s014_rf2_sombras_de_color_relieve_y_brillo", () => {
    expect(css).toMatch(/--shadow-relief:/);
    expect(css).toMatch(/--shadow-glow:/);
    expect(css).toMatch(/--ui-accent-deep:\s*#[0-9a-f]{6}/);
  });

  it("test_s014_rf2_botones_redondos_con_relieve_y_rebote_salvo_con_movimiento_reducido", () => {
    const primary = buttonClasses();
    expect(primary).toContain("rounded-full");
    expect(primary).toContain("shadow-[var(--shadow-relief)]");
    expect(primary).toMatch(/active:translate-y-\[3px\]/);
    expect(primary).toContain("motion-reduce:active:translate-y-0");
    expect(buttonClasses({ variant: "secondary" })).toContain("shadow-[var(--shadow-relief-soft)]");
  });

  it("test_s014_rf2_las_tarjetas_tienen_profundidad", () => {
    const html = renderToStaticMarkup(<Card title="Sobre gratis">x</Card>);
    expect(html).toContain("rounded-xl");
    expect(html).toContain("shadow-[var(--shadow-glow)]");
    expect(html).toMatch(/bg-linear-to-b|bg-gradient-to-b/);
  });
});
