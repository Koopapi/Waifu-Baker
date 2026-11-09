// Spec 013, RF-11 y RF-12: peso del JavaScript de la primera carga de cada página, a partir de los
// manifiestos del build (`build-manifest.json` y `app-build-manifest.json`). Lo que se carga después con
// `import()` o `next/dynamic` no cuenta.

export const BUDGET_KB = 250;

/** Páginas del coleccionista y públicas (RF-11), con su nombre en `app-build-manifest.json`. */
export const BUDGET_PAGES = [
  "/page",
  "/login/page",
  "/welcome/page",
  "/(app)/packs/page",
  "/packs/[setId]/page",
  "/packs/[setId]/all/page",
  "/(app)/collection/page",
  "/(app)/collection/[setId]/page",
  "/(app)/collection/album/page",
  "/album/[slug]/page",
  "/(app)/account/page",
  "/(app)/rewards/page",
  // Spec 020: el espacio de juegos y Expediciones.
  "/(app)/games/page",
  "/(app)/games/expeditions/page",
  "/drop-rates/page",
  "/legal/[doc]/page",
] as const;

/**
 * Spec 031, RF-16 y RF-17: páginas del panel con su propio límite. La de una colección carga el editor de cartas solo
 * al abrir una carta, así que su primera carga se vigila para que no vuelva a crecer.
 */
export const ADMIN_BUDGET_PAGES = [{ page: "/admin/sets/[id]/page", limitKb: 260 }] as const;

export interface BuildManifests {
  rootMainFiles: string[];
  pages: Record<string, string[]>;
}

export interface PageWeight {
  page: string;
  bytes: number;
  /** Límite propio de la página (spec 031); sin él vale el general. */
  limitKb?: number;
}

/** `sizeOf` devuelve el tamaño comprimido de un fichero del build. */
export function measurePages(m: BuildManifests, sizeOf: (file: string) => number, pages: readonly string[]): PageWeight[] {
  return pages.map((page) => {
    const own = m.pages[page];
    if (!own) throw new Error(`La página ${page} no está en el manifiesto del build`);
    const files = [...new Set([...m.rootMainFiles, ...own])].filter((f) => f.endsWith(".js"));
    return { page, bytes: files.reduce((sum, f) => sum + sizeOf(f), 0) };
  });
}

/** Mide páginas con límite propio (spec 031). */
export function measureWithLimits(m: BuildManifests, sizeOf: (file: string) => number, pages: readonly { page: string; limitKb: number }[]): PageWeight[] {
  return measurePages(m, sizeOf, pages.map((p) => p.page)).map((w, i) => ({ ...w, limitKb: pages[i].limitKb }));
}

export function overBudget(weights: PageWeight[], limitKb = BUDGET_KB): PageWeight[] {
  return weights.filter((w) => w.bytes > (w.limitKb ?? limitKb) * 1024);
}

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} kB`;

export function formatReport(weights: PageWeight[], limitKb = BUDGET_KB): string {
  const width = Math.max(...weights.map((w) => w.page.length));
  const rows = [...weights]
    .sort((a, b) => b.bytes - a.bytes)
    .map((w) => {
      const limit = w.limitKb ?? limitKb;
      const over = w.bytes - limit * 1024;
      const own = w.limitKb !== undefined && over <= 0 ? `  (límite ${limit} kB)` : "";
      return `${over > 0 ? "✗" : "✓"} ${w.page.padEnd(width)} ${kb(w.bytes).padStart(9)}${over > 0 ? `  (+${kb(over)} sobre ${limit} kB)` : own}`;
    });
  return rows.join("\n");
}
