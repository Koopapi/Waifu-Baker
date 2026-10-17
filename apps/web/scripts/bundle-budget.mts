// Spec 013, RF-11 y RF-12: comprueba que el JavaScript de la primera carga de cada página del coleccionista y
// pública no pasa de 250 kB comprimidos. Uso, tras `next build`: node scripts/bundle-budget.mts [.next]
import { readFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { BUDGET_KB, BUDGET_PAGES, formatReport, measurePages, overBudget } from "../src/lib/bundle-budget.ts";

const dist = path.resolve(process.argv[2] ?? process.env.NEXT_DIST_DIR ?? ".next");
const read = (f: string) => JSON.parse(readFileSync(path.join(dist, f), "utf8"));
const manifests = { rootMainFiles: read("build-manifest.json").rootMainFiles ?? [], pages: read("app-build-manifest.json").pages };
const sizeOf = (f: string) => gzipSync(readFileSync(path.join(dist, f)), { level: 9 }).length;

const weights = measurePages(manifests, sizeOf, BUDGET_PAGES);
console.log(`JavaScript de la primera carga (gzip), presupuesto ${BUDGET_KB} kB:\n${formatReport(weights)}`);
const over = overBudget(weights);
if (over.length) {
  console.error(`\n${over.length} página(s) por encima de ${BUDGET_KB} kB.`);
  process.exit(1);
}
