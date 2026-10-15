// Recorrido de la entrega 3: subida masiva, lote, editor y reordenación. Uso: node scripts/admin-e3-smoke.mjs <outDir> <imgDir> [baseUrl]
import { chromium } from "@playwright/test";
import { readdirSync } from "node:fs";
import path from "node:path";
const [out, imgDir, base = "http://localhost:3100"] = process.argv.slice(2);
const files = readdirSync(imgDir).filter((f) => f.endsWith(".webp")).sort().map((f) => path.join(imgDir, f));
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const note = async () => (await page.locator('[role="status"], [role="alert"]').first().textContent().catch(() => ""))?.trim();

await page.goto(`${base}/login?next=/admin/sets`);
await page.fill('input[name="name"]', "koopa");
await page.click("text=Entrar (desarrollo)");
await page.waitForURL((u) => u.pathname === "/admin/sets");
await page.click("a:text-is('WB01')");
await page.waitForURL(/\/admin\/sets\/[0-9a-f-]+$/);

// 1. Subida masiva de las 11 imágenes de relleno + 1 repetida
const t0 = Date.now();
await page.setInputFiles('[data-testid="file-input"]', [...files, files[0]]);
await page.waitForFunction(() => document.querySelector('[data-testid="upload-list"]') && !document.body.innerText.includes("Subiendo…"), null, { timeout: 120000 });
console.log(`subida: ${files.length + 1} archivos en ${((Date.now() - t0) / 1000).toFixed(1)} s ·`, (await page.locator('[data-testid="upload-list"] li').allTextContents()).filter((t) => t.includes("✕")).join(" | "));
await page.waitForSelector('[data-card-tile="10"]', { timeout: 20000 });
await page.screenshot({ path: `${out}/e3-1-uploaded.png`, fullPage: false });

// 2. Selección por rango con mayúsculas + asignación en lote
await page.check('[aria-label="Seleccionar carta 001"]');
await page.click('[aria-label="Seleccionar carta 004"]', { modifiers: ["Shift"] });
await page.selectOption('[aria-label="Personaje para la selección"]', { label: "Aiko Hoshino" });
await page.selectOption('[aria-label="Rareza para la selección"]', "common");
await page.click("text=Aplicar a la selección");
await page.waitForTimeout(2500);
console.log("lote 001-004 →", await note());
await page.check('[aria-label="Seleccionar carta 005"]');
await page.selectOption('[aria-label="Rareza para la selección"]', "legendary");
await page.click("text=Aplicar a la selección");
await page.waitForTimeout(1500);
console.log("lote 005 →", await note());
await page.screenshot({ path: `${out}/e3-2-bulk.png` });

// 3. Editor de una carta
await page.click('[aria-label="Editar carta 005"]');
await page.fill('dialog input[name="name"]', "Rouge en la azotea");
await page.selectOption('dialog select[name="characterId"]', { label: "Aiko Hoshino" });
await page.screenshot({ path: `${out}/e3-3-editor.png` });
await page.click("dialog >> text=Guardar");
await page.waitForSelector("dialog", { state: "detached", timeout: 10000 }).catch(() => {});
await page.waitForTimeout(800);

// 4. Reordenar: llevar la 005 a la primera posición con teclado (dnd-kit)
await page.click("text=Reordenar");
await page.waitForTimeout(300);
const tile5 = page.locator('[data-card-tile="5"]');
const tile1 = page.locator('[data-card-tile="1"]');
const b5 = await tile5.boundingBox(), b1 = await tile1.boundingBox();
await page.mouse.move(b5.x + b5.width / 2, b5.y + b5.height / 2);
await page.mouse.down();
await page.mouse.move(b5.x + b5.width / 2 - 20, b5.y + b5.height / 2, { steps: 4 });
await page.mouse.move(b1.x + b1.width / 2, b1.y + b1.height / 2, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(3000);
console.log("reordenar →", await note());
await page.click("text=Terminar");
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/e3-4-reordered.png` });
console.log("primera carta:", await page.locator('[data-card-tile="1"]').innerText().catch(() => "?"));
console.log(errors.length ? `errores de página: ${errors.join(" | ")}` : "sin errores de página");
await browser.close();
