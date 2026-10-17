import { describe, expect, it } from "vitest";
import { BUDGET_KB, BUDGET_PAGES, formatReport, measurePages, overBudget } from "./bundle-budget";

const manifest = {
  rootMainFiles: ["static/chunks/react.js", "static/chunks/main.js"],
  pages: {
    "/page": ["static/chunks/react.js", "static/chunks/home.js", "static/css/app.css"],
    "/sobres/[setId]/page": ["static/chunks/opening.js", "static/chunks/home.js"],
    "/admin/page": ["static/chunks/admin.js"],
  },
};
const sizes: Record<string, number> = {
  "static/chunks/react.js": 100 * 1024,
  "static/chunks/main.js": 50 * 1024,
  "static/chunks/home.js": 20 * 1024,
  "static/chunks/opening.js": 90 * 1024,
};
const sizeOf = (f: string) => sizes[f] ?? 0;

describe("spec 013 — peso de las páginas", () => {
  it("test_s013_rf11_suma_la_base_y_los_ficheros_de_la_pagina_sin_repetir_y_sin_css", () => {
    const r = measurePages(manifest, sizeOf, ["/page"]);
    expect(r).toEqual([{ page: "/page", bytes: 170 * 1024 }]);
  });

  it("test_s013_rf11_mide_las_paginas_del_coleccionista_y_publicas_y_no_el_panel", () => {
    expect(BUDGET_KB).toBe(250);
    for (const p of ["/page", "/login/page", "/bienvenida/page", "/(app)/sobres/page", "/sobres/[setId]/page", "/sobres/[setId]/todos/page", "/(app)/coleccion/page", "/(app)/coleccion/[setId]/page", "/(app)/coleccion/album/page", "/album/[slug]/page", "/(app)/cuenta/page", "/(app)/recompensas/page", "/drop-rates/page", "/legal/[doc]/page"])
      expect(BUDGET_PAGES).toContain(p);
    const pages: readonly string[] = BUDGET_PAGES;
    expect(pages.some((p) => p.startsWith("/admin") || p === "/lab/page" || p === "/sistema/page")).toBe(false);
  });

  it("test_s013_rf12_lista_las_paginas_que_se_pasan_con_su_peso_y_el_exceso", () => {
    const r = measurePages(manifest, sizeOf, ["/page", "/sobres/[setId]/page"]);
    const over = overBudget(r, 250);
    expect(over.map((o) => o.page)).toEqual(["/sobres/[setId]/page"]);
    const report = formatReport(r, 250);
    expect(report).toContain("/sobres/[setId]/page");
    expect(report).toContain("260.0 kB");
    expect(report).toContain("+10.0 kB");
  });

  it("test_s013_rf12_una_pagina_que_falta_en_el_manifiesto_es_un_error", () => {
    expect(() => measurePages(manifest, sizeOf, ["/no-existe/page"])).toThrow(/no-existe/);
  });
});
