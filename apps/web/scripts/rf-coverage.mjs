// Validación RF por RF de una spec: cruza los tests `test_rfN_*` (Vitest) y los pasos «RF-N» del
// E2E con los RF de spec.md y escribe validation.md. Uso: node scripts/rf-coverage.mjs ../../specs/003-panel-admin
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

const specDir = path.resolve(process.argv[2] ?? "../../specs/003-panel-admin");
// Los tests de cada spec se nombran `test_s<NNN>_rfN_*`; los de la 003 (la primera) pueden omitir el prefijo.
const specNum = path.basename(specDir).slice(0, 3);
const testRe = new RegExp(`test_(?:s(\\d{3})_)?rf(\\d+)_`, "g");
const spec = readFileSync(path.join(specDir, "spec.md"), "utf8");
const rfs = [...spec.matchAll(/^- RF-(\d+): (.+)$/gm)].map((m) => ({ n: Number(m[1]), text: m[2] }));

const json = "/tmp/waifu-baker-vitest.json";
try {
  execSync(`pnpm exec vitest run --reporter=json --outputFile=${json}`, { stdio: "ignore" });
} catch {
  /* el JSON se escribe igual; los fallos se reflejan en la tabla */
}
const report = JSON.parse(readFileSync(json, "utf8"));
const unit = new Map();
for (const file of report.testResults) {
  for (const t of file.assertionResults) {
    for (const m of t.title.matchAll(testRe)) {
      if ((m[1] ?? "003") !== specNum) continue;
      const n = Number(m[2]);
      unit.set(n, [...(unit.get(n) ?? []), { name: t.title.replace(/^test_(?:s\d{3}_)?rf\d+_/, ""), ok: t.status === "passed" }]);
    }
  }
}
// Cada E2E declara en su primera línea de qué spec son sus criterios («…de la spec 004…»).
const e2eSrc = readdirSync("e2e")
  .filter((f) => f.endsWith(".spec.ts"))
  .map((f) => readFileSync(path.join("e2e", f), "utf8"))
  .filter((src) => src.split("\n")[0].includes(`spec ${specNum}`))
  .join("\n");
const e2e = new Map();
for (const m of e2eSrc.matchAll(/test\.step\("([^"]+)"/g)) {
  for (const r of m[1].matchAll(/RF-(\d+)/g)) e2e.set(Number(r[1]), [...(e2e.get(Number(r[1])) ?? []), m[1]]);
}

const rows = rfs.map(({ n, text }) => {
  const u = unit.get(n) ?? [];
  const e = e2e.get(n) ?? [];
  const ok = u.length + e.length > 0 && u.every((x) => x.ok);
  return { n, text, u, e, ok };
});
const covered = rows.filter((r) => r.ok).length;
const date = new Date().toISOString().slice(0, 10);
let md = `# Validación — Spec ${specNum}\n\nGenerado por \`apps/web/scripts/rf-coverage.mjs\` el ${date}. Vitest: ${report.numPassedTests} de ${report.numTotalTests} tests en verde. E2E: \`pnpm e2e\`.\n\n`;
md += `**Veredicto: ${covered === rows.length ? "spec cumplida" : "spec NO cumplida"}** (${covered} de ${rows.length} RF con al menos un test en verde).\n\n`;
md += "| RF | Requisito | Tests unitarios / integración | Pasos E2E | Estado |\n|---|---|---|---|---|\n";
for (const r of rows) {
  const u = r.u.map((x) => `${x.ok ? "✓" : "✗"} ${x.name}`).join("<br>") || "—";
  const e = r.e.join("<br>") || "—";
  md += `| RF-${r.n} | ${r.text.replace(/\|/g, "\\|")} | ${u} | ${e} | ${r.ok ? "Cumplido" : "**Sin cubrir**"} |\n`;
}
writeFileSync(path.join(specDir, "validation.md"), md);
console.log(`validation.md: ${covered}/${rows.length} RF cubiertos · ${report.numPassedTests}/${report.numTotalTests} tests`);
for (const r of rows.filter((x) => !x.ok)) console.log(`  sin cubrir: RF-${r.n}`);
