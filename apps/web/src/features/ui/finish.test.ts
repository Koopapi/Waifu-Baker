// Spec 010: acabado común (tokens, esqueletos y contraste).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname, "../..");
const css = readFileSync(path.join(SRC, "app/globals.css"), "utf8");
const token = (name: string) => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"));
  if (!m) throw new Error(`Falta el token --${name}`);
  return m[1];
};

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

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe("acabado", () => {
  it("test_s010_rf6_la_interfaz_no_usa_colores_fijos_fuera_de_los_tokens", () => {
    // Las cartas, el holo, la apertura y el laboratorio tienen colores propios por rareza.
    const skip = [/features\/opening\//, /app\/lab\//, /opengraph-image/, /\.test\./];
    const allowed = new Set(["#f96854", "#141414", "#f5c451", "#7a1f45", "#1a0d14", "#9aa0a6", "#4ade80", "#60a5fa", "#c084fc", "#ff6ad5"]);
    const offenders: string[] = [];
    for (const f of [...walk(path.join(SRC, "app")), ...walk(path.join(SRC, "features"))].filter((p) => /\.tsx$/.test(p) && !skip.some((r) => r.test(p)))) {
      for (const m of readFileSync(f, "utf8").matchAll(/(?:bg|text|border|from|to|via|ring)-\[(#[0-9a-fA-F]{3,8})\]/g)) {
        if (!allowed.has(m[1].toLowerCase())) offenders.push(`${path.relative(SRC, f)}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("test_s010_rf9_cada_seccion_tiene_su_esqueleto_de_carga", () => {
    for (const dir of ["app/(app)/sobres", "app/(app)/coleccion", "app/(app)/coleccion/[setId]", "app/(app)/cuenta", "app/(app)/recompensas", "app/admin"]) {
      expect(existsSync(path.join(SRC, dir, "loading.tsx")), dir).toBe(true);
    }
  });

  it("test_s010_rf11_el_texto_y_los_botones_superan_4_5_a_1", () => {
    for (const bg of ["ui-bg", "ui-nav", "ui-raised", "ui-rail"]) {
      for (const fg of ["ui-text", "ui-text-2", "ui-text-3", "ui-accent-text"]) {
        expect(contrast(token(fg), token(bg)), `${fg} sobre ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    for (const bg of ["ui-accent", "ui-accent-hover", "ui-success", "ui-danger"]) {
      expect(contrast("#ffffff", token(bg)), `blanco sobre ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
