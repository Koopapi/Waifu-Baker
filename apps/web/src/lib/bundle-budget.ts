// Spec 013, RF-11 y RF-12: peso del JavaScript de la primera carga de cada página, a partir de los
// manifiestos del build (`build-manifest.json` y `app-build-manifest.json`). Lo que se carga después con
// `import()` o `next/dynamic` no cuenta.

export const BUDGET_KB = 250;

/** Páginas del coleccionista y públicas (RF-11), con su nombre en `app-build-manifest.json`. */
export const BUDGET_PAGES = [
  "/page",
  "/login/page",
  "/bienvenida/page",
  "/(app)/sobres/page",
  "/sobres/[setId]/page",
  "/sobres/[setId]/todos/page",
  "/(app)/coleccion/page",
  "/(app)/coleccion/[setId]/page",
  "/(app)/coleccion/album/page",
  "/album/[slug]/page",
  "/(app)/cuenta/page",
  "/(app)/recompensas/page",
  // Spec 020: el espacio de juegos y Expediciones.
  "/(app)/juegos/page",
  "/(app)/juegos/expediciones/page",
  "/drop-rates/page",
  "/legal/[doc]/page",
] as const;

export interface BuildManifests {
  rootMainFiles: string[];
  pages: Record<string, string[]>;
}

export interface PageWeight {
  page: string;
  bytes: number;
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

export function overBudget(weights: PageWeight[], limitKb = BUDGET_KB): PageWeight[] {
  return weights.filter((w) => w.bytes > limitKb * 1024);
}

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} kB`;

export function formatReport(weights: PageWeight[], limitKb = BUDGET_KB): string {
  const width = Math.max(...weights.map((w) => w.page.length));
  const rows = [...weights]
    .sort((a, b) => b.bytes - a.bytes)
    .map((w) => {
      const over = w.bytes - limitKb * 1024;
      return `${over > 0 ? "✗" : "✓"} ${w.page.padEnd(width)} ${kb(w.bytes).padStart(9)}${over > 0 ? `  (+${kb(over)} sobre ${limitKb} kB)` : ""}`;
    });
  return rows.join("\n");
}
