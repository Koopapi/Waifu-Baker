import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(__dirname, "tokens.css"), "utf8");
const defined = new Set([...css.matchAll(/--([\w-]+):/g)].map((m) => m[1]));

describe("tokens del sistema de diseño", () => {
  it("test_s011_rf1_define_colores_tipografia_radios_sombras_capas_y_tiempos", () => {
    const required = [
      ...["rail", "nav", "bg", "raised", "hover", "line", "text", "text-2", "text-3", "accent", "accent-hover", "accent-text", "on-accent", "success", "warning", "danger", "info"].map((c) => `ui-${c}`),
      "radius-s", "radius-m", "radius-l", "radius-xl",
      "shadow-1", "shadow-2", "shadow-3",
      "z-nav", "z-banner", "z-drawer", "z-overlay", "z-toast",
      "duration-fast", "duration-base", "duration-slow", "ease-out",
      "font-sans", "font-display",
    ];
    expect(required.filter((t) => !defined.has(t))).toEqual([]);
  });

  it("test_s011_rf13_las_duraciones_van_de_150_a_250_ms", () => {
    for (const d of ["fast", "base", "slow"]) {
      const ms = Number(css.match(new RegExp(`--duration-${d}:\\s*(\\d+)ms`))?.[1]);
      expect(ms).toBeGreaterThanOrEqual(150);
      expect(ms).toBeLessThanOrEqual(250);
    }
  });

  it("test_s011_rf2_un_tema_solo_redefine_variables", () => {
    // Los componentes leen los colores de variables: un tema futuro solo necesita redefinirlas.
    expect(css).toMatch(/:root\s*\{[^}]*--ui-accent:/);
    expect(css).toMatch(/@theme inline\s*\{[^}]*--color-ui-accent:\s*var\(--ui-accent\)/);
  });

  it("test_s011_rf1_los_componentes_no_usan_valores_de_color_sueltos", () => {
    const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : [path.join(d, f)]));
    const offenders = walk(__dirname)
      .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
      .flatMap((f) => [...readFileSync(f, "utf8").matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g)].map((m) => `${path.basename(f)}: ${m[0]}`));
    expect(offenders).toEqual([]);
  });
});
