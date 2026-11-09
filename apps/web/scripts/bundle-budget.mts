// Spec 013, RF-11 y RF-12: comprueba que el JavaScript de la primera carga de cada página del coleccionista y
// pública no pasa de 250 kB comprimidos. Uso, tras `next build`: node scripts/bundle-budget.mts [.next]
import { readFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { ADMIN_BUDGET_PAGES, BUDGET_KB, BUDGET_PAGES, formatReport, measurePages, measureWithLimits, overBudget } from "../src/lib/bundle-budget.ts";

const dist = path.resolve(process.argv[2] ?? process.env.NEXT_DIST_DIR ?? ".next");
const read = (f: string) => JSON.parse(readFileSync(path.join(dist, f), "utf8"));
const manifests = { rootMainFiles: read("build-manifest.json").rootMainFiles ?? [], pages: read("app-build-manifest.json").pages };
const sizeOf = (f: string) => gzipSync(readFileSync(path.join(dist, f)), { level: 9 }).length;

// Spec 031: además, las páginas del panel con límite propio.
const weights = [...measurePages(manifests, sizeOf, BUDGET_PAGES), ...measureWithLimits(manifests, sizeOf, ADMIN_BUDGET_PAGES)];
console.log(`JavaScript de la primera carga (gzip), presupuesto ${BUDGET_KB} kB:\n${formatReport(weights)}`);
const over = overBudget(weights);
if (over.length) {
  console.error(`\n${over.length} página(s) por encima de su límite: ${over.map((w) => `${w.page} (${(w.bytes / 1024).toFixed(1)} kB de ${w.limitKb ?? BUDGET_KB})`).join(", ")}.`);
  process.exit(1);
}
