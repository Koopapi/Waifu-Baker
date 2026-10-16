// Spec 011, RF-17: las pantallas se construyen con el sistema de diseño. Este test impide volver atrás.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname, "..");
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : [path.join(d, f)]));
// La apertura de sobres (y su laboratorio) tiene su propia escena animada; el catálogo muestra el sistema.
const EXEMPT = [/features\/opening\//, /app\/lab\//, /app\/sistema\//, /opengraph-image/, /\.test\.tsx?$/];
const screens = [...walk(path.join(SRC, "app")), ...walk(path.join(SRC, "features"))].filter((f) => f.endsWith(".tsx") && !EXEMPT.some((r) => r.test(f)));

/** Coincidencias en el texto completo (las etiquetas JSX pueden ocupar varias líneas), con su línea. */
function offenders(re: RegExp) {
  const g = new RegExp(re.source, "g");
  return screens.flatMap((f) => {
    const src = readFileSync(f, "utf8");
    return [...src.matchAll(g)].map((m) => {
      const line = src.slice(0, m.index).split("\n").length;
      return `${path.relative(SRC, f)}:${line}: ${src.split("\n")[line - 1].trim().slice(0, 100)}`;
    });
  });
}

describe("adopción del sistema de diseño", () => {
  it("test_s011_rf17_sin_campos_nativos_fuera_del_sistema", () => {
    // Solo se permiten los ocultos y el selector de archivos.
    expect(offenders(/<select\b|<textarea\b|<input\b(?![^>]*type="(hidden|file)")/)).toEqual([]);
  });

  it("test_s011_rf17_sin_clases_de_boton_sueltas", () => {
    expect(offenders(/className="[^"]*\bbtn\b|className=\{`[^`]*\bbtn\b/)).toEqual([]);
  });

  it("test_s011_rf12_sin_confirmaciones_del_navegador", () => {
    expect(offenders(/window\.confirm\(|\bconfirm\("|window\.alert\(/)).toEqual([]);
  });

  it("test_s011_rf17_las_pantallas_importan_cada_componente_por_su_ruta", () => {
    // Importar el índice `@/ui` desde una página mete en su carga todos los componentes de cliente del
    // sistema (RNF de peso). Solo el catálogo lo usa.
    expect(offenders(/from "@\/ui";/)).toEqual([]);
  });

  it("test_s011_rf17_sin_colores_de_tailwind_fuera_de_los_tokens", () => {
    expect(offenders(/\b(text|bg|border|ring)-(red|rose|emerald|green|amber|yellow|sky|blue|pink|purple|white|black)(-\d{2,3})?\b(?!\/\d)/)).toEqual([]);
  });
});
