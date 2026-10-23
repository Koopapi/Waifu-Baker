// Spec 016, RF-1 y RF-4: las capas solo se tocan desde el panel. Las rutas responden 404 a quien no es administrador
// y la configuración por capas solo se lee en código del panel (el coleccionista la verá con la spec 018).
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname, "../..");
const read = (f: string) => readFileSync(path.join(SRC, f), "utf8");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const ROUTES = ["app/api/admin/cards/[id]/layers/route.ts", "app/api/admin/layer-uploads/route.ts", "app/api/admin/sets/[id]/backgrounds/route.ts"];
/** Donde se puede leer la configuración por capas: el esquema, los servicios del panel (capas y fondos) y el panel. */
const ALLOWED = [/^db\/schema\.ts$/, /^server\/services\/card-layers\.ts$/, /^server\/services\/set-backgrounds\.ts$/, /^app\/admin\//, /^app\/api\/admin\//, /^features\/admin\//];

describe("spec 016 — acceso a las capas", () => {
  it("test_s016_rf1_las_rutas_de_capas_exigen_administrador_y_responden_404_al_resto", () => {
    for (const f of ROUTES) {
      const s = read(f);
      expect(s, f).toContain("adminFromRequest(");
      expect(s, f).toContain("notFoundResponse(");
      // Cada método exportado pasa por la comprobación antes de hacer nada.
      for (const m of s.matchAll(/export async function (GET|POST|PUT|DELETE)\b[\s\S]*?\n}/g)) {
        expect(m[0], `${f} ${m[1]}`).toMatch(/adminFromRequest\(|guard\(/);
        expect(m[0], `${f} ${m[1]}`).toContain("notFoundResponse(");
      }
    }
  });

  it("test_s016_rf4_la_configuracion_por_capas_solo_se_lee_en_el_panel", () => {
    const offenders = walk(SRC)
      .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f))
      .map((f) => path.relative(SRC, f))
      .filter((rel) => /\bcards\.layers\b|\blayersPending\b|\blayers_pending\b/.test(read(rel)))
      .filter((rel) => !ALLOWED.some((re) => re.test(rel)));
    expect(offenders).toEqual([]);
  });
});
