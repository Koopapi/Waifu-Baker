// Recorrido de la entrega 4. Uso: node scripts/admin-e4-smoke.mjs <outDir>
import { chromium } from "@playwright/test";
const out = process.argv[2];
const base = "http://localhost:3100";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1360, height: 1000 } })).newPage();
page.on("dialog", (d) => d.accept());
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const sleep = (ms) => page.waitForTimeout(ms);

await page.goto(`${base}/login?next=/admin/sets`);
await page.fill('input[name="name"]', "koopa");
await page.click("text=Entrar (desarrollo)");
await page.waitForURL((u) => u.pathname === "/admin/sets");

// Colección temporal de 2 cartas por sobre
await page.fill('input[name="code"]', "PUB1");
await page.fill('form input[name="name"]', "Prueba de publicación");
await page.fill('input[name="packSize"]', "2");
await page.click("text=Crear colección");
await sleep(800);
await page.click("a:text-is('PUB1')");
await page.waitForURL(/\/admin\/sets\/[0-9a-f-]+$/);
await page.setInputFiles('[data-testid="file-input"]', ["public/lab/02.webp", "public/lab/03.webp"]);
await page.waitForSelector('[data-card-tile="2"]', { timeout: 30000 });

// 1. Publicar con problemas
await page.click("text=Comprobar y publicar");
await page.waitForSelector('[data-testid="publish-problems"]', { timeout: 15000 });
console.log("problemas:", (await page.locator('[data-testid="publish-problems"] li').allInnerTexts()).map((t) => t.replace("•", "").trim()).join(" | "));
await page.screenshot({ path: `${out}/e4-1-problems.png`, fullPage: true });

// 2. Probabilidades: inválidas y luego válidas (ranura 1: 100 % común; ranura 2: 100 % rara)
const cell = (slot, rarity) => page.locator(`[aria-label="Ranura ${slot}, ${rarity}"]`);
const R = ["Común", "Poco común", "Rara", "Épica", "Legendaria", "Secreta"];
async function fillSlot(slot, weights) {
  for (const r of R) await cell(slot, r).fill(String(weights[r] ?? 0));
}
await fillSlot(1, { "Común": 70 });
await fillSlot(2, { "Rara": 100 });
await page.click("text=Guardar probabilidades");
await sleep(800);
console.log("odds inválidas:", await page.locator("text=/suma/").first().textContent());
await fillSlot(1, { "Común": 100 });
await page.click("text=Guardar probabilidades");
await page.waitForSelector("text=Probabilidades guardadas.", { timeout: 10000 }).catch(() => {});
console.log("odds válidas:", (await page.locator("text=Probabilidades guardadas.").count()) ? "guardadas" : "NO");
await sleep(800);

// 3. Completar cartas: personaje y rarezas en lote, nombres en el editor
await page.check('[aria-label="Seleccionar carta 001"]');
await page.selectOption('[aria-label="Personaje para la selección"]', { label: "Aiko Hoshino" });
await page.selectOption('[aria-label="Rareza para la selección"]', "common");
await page.click("text=Aplicar a la selección");
await sleep(1500);
await page.check('[aria-label="Seleccionar carta 002"]');
await page.selectOption('[aria-label="Personaje para la selección"]', { label: "Aiko Hoshino" });
await page.selectOption('[aria-label="Rareza para la selección"]', "rare");
await page.click("text=Aplicar a la selección");
await sleep(1500);
for (const [n, name] of [["001", "Aiko saluda"], ["002", "Aiko en la pista"]]) {
  await page.click(`[aria-label="Editar carta ${n}"]`);
  await page.fill('dialog input[name="name"]', name);
  await page.click("dialog >> text=Guardar");
  await page.waitForSelector("dialog", { state: "detached", timeout: 15000 });
  await sleep(800);
}

// 4. Publicar con éxito
await page.click("text=Comprobar y publicar");
await page.waitForSelector("text=/Colección publicada/", { timeout: 15000 });
await sleep(1000);
console.log("estado tras publicar:", await page.locator("h1 + span, h1 ~ span").first().textContent());
console.log("odds bloqueadas:", await cell(1, "Común").isDisabled(), "· subida bloqueada:", await page.locator("text=/ya no se pueden añadir cartas/").count() === 1);
await page.screenshot({ path: `${out}/e4-2-published.png`, fullPage: true });

// 5. Página pública
await page.goto(`${base}/drop-rates`);
console.log("drop-rates muestra PUB1:", (await page.locator("h2").allInnerTexts()).join(" | "));
await page.screenshot({ path: `${out}/e4-3-drop-rates.png`, fullPage: true });

// 6. Archivar
await page.goBack();
await page.click("text=Archivar colección");
await page.waitForSelector("text=/Colección archivada/", { timeout: 15000 });
console.log("archivada:", await page.locator("text=/Colección archivada/").first().textContent());

// 7. Revisión 18+ en WB01A (Seiko: personaje adulto; nunca usar umamusume ni estudiantes aquí)
await page.goto(`${base}/admin/sets`);
await page.click("a:text-is('WB01A')");
await page.waitForURL(/\/admin\/sets\/[0-9a-f-]+$/);
await page.setInputFiles('[data-testid="file-input"]', ["public/lab/09.webp"]);
await page.waitForSelector('[data-card-tile="1"]', { timeout: 30000 });
console.log("antes de revisar:", (await page.locator('[data-card-tile="1"]').innerText()).split("\n").pop());
await page.click('[aria-label="Editar carta 001"]');
await page.click("text=Confirmo: personaje claramente adulto");
await page.waitForSelector("dialog", { state: "detached", timeout: 15000 });
await sleep(800);
console.log("después de revisar:", (await page.locator('[data-card-tile="1"]').innerText()).split("\n").pop());
await page.screenshot({ path: `${out}/e4-4-adult.png` });
console.log(errors.length ? `errores de página: ${errors.join(" | ")}` : "sin errores de página");
await browser.close();
