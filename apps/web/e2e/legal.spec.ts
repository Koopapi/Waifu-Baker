// Criterios de finalización de la spec 007: un usuario nuevo entra → debe confirmar edad y términos para ver
// sus sobres → las páginas legales se leen sin sesión en los dos idiomas con su versión y contacto → el
// administrador ve las métricas y la última copia.
import { dictionaries } from "../src/i18n/index";
import { expect, test } from "./fixtures";
import { login } from "./helpers";

const en = dictionaries.en.legal;
const es = dictionaries.es.legal;

test("edad, términos, páginas legales y panel de operación", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();

  await test.step("RF-1: tras entrar, un usuario nuevo debe confirmar edad y términos", async () => {
    await page.goto("/login?next=%2Fsobres");
    await page.fill('input[name="name"]', "nuevo-legal");
    await page.uncheck('input[name="admin"]');
    await page.click("text=Entrar (desarrollo)");
    await page.waitForURL(/\/bienvenida\?next=%2Fsobres/);
    await expect(page.locator("h1")).toHaveText(es.gate.title);
    await expect(page.locator(`text=${es.gate.age(16)}`)).toBeVisible();
  });

  await test.step("RF-2: sin aceptar no ve su colección ni su cuenta, pero sí las páginas públicas", async () => {
    for (const p of ["/coleccion", "/cuenta", "/sobres"]) {
      await page.goto(p);
      await expect(page).toHaveURL(/\/bienvenida/);
    }
    await page.goto("/legal/terms");
    await expect(page.locator("h1")).toHaveText(es.docs.terms.title);
    await page.goto("/drop-rates");
    await expect(page).toHaveURL(/\/drop-rates$/);
  });

  await test.step("RF-1: al aceptar vuelve a donde iba", async () => {
    await page.goto("/bienvenida?next=%2Fcoleccion");
    await page.check('[data-testid="gate-form"] input[name="age"]');
    await page.check('[data-testid="gate-form"] input[name="terms"]');
    await page.click(`[data-testid="gate-form"] >> text=${es.gate.submit}`);
    await page.waitForURL(/\/coleccion$/);
    await page.goto("/sobres");
    await expect(page).toHaveURL(/\/sobres$/);
  });

  const anon = await (await browser.newContext({ storageState: { cookies: [], origins: [] } })).newPage();

  await test.step("RF-4 y RF-8: términos, privacidad y contenido sin sesión, con versión y fecha, en inglés", async () => {
    for (const doc of ["terms", "privacy", "content"] as const) {
      await anon.goto(`/legal/${doc}`);
      await expect(anon.locator("h1")).toHaveText(en.docs[doc].title);
      await expect(anon.locator('[data-testid="legal-meta"]')).toContainText("Version 1");
      await expect(anon.locator(`[data-testid="legal-${doc}"] h2`)).toHaveCount(en.docs[doc].sections.length);
    }
  });

  await test.step("RF-4: el pie de todas las páginas enlaza los documentos", async () => {
    for (const p of ["/", "/drop-rates", "/login"]) {
      await anon.goto(p);
      const footer = anon.locator('[data-testid="site-footer"]');
      for (const [href, label] of [
        ["/legal/terms", en.footer.terms],
        ["/legal/privacy", en.footer.privacy],
        ["/legal/content", en.footer.content],
        ["/drop-rates", en.footer.odds],
      ]) {
        await expect(footer.locator(`a[href="${href}"]`)).toHaveText(label);
      }
    }
  });

  await test.step("RF-5 y RF-6: los textos cubren lo esencial y también están en español", async () => {
    await anon.goto("/legal/terms");
    const terms = await anon.locator("article").innerText();
    for (const must of ["Waifu Baker", "16", "no monetary value", "Belgium", "Patreon", "30 days"]) expect(terms).toContain(must);
    await anon.goto("/legal/privacy");
    const privacy = await anon.locator("article").innerText();
    for (const must of ["Sentry", "essential cookies", "30 days"]) expect(privacy).toContain(must);
    await anon.locator('[data-testid="locale-toggle"] button[lang="es"]').click();
    await expect(anon.locator("h1")).toHaveText(es.docs.privacy.title);
    await expect(anon.locator('[data-testid="legal-meta"]')).toContainText("Versión 1");
  });

  await test.step("RF-7: el contacto es el correo configurado", async () => {
    await expect(anon.locator('[data-testid="legal-contact-footer"]')).toHaveAttribute("href", "mailto:hello@waifubaker.test");
    await expect(anon.locator('[data-testid="legal-contact"]').first()).toHaveText("hello@waifubaker.test");
  });

  await test.step("RF-11 y RF-17: el administrador ve las métricas de 30 días y el estado de las copias", async () => {
    const admin = await login(browser, "admin-legal", true);
    await admin.goto("/admin/metricas");
    await expect(admin.locator('[data-testid="metrics"] tbody tr[data-day]')).toHaveCount(30);
    const today = new Date().toISOString().slice(0, 10);
    const row = admin.locator(`tr[data-day="${today}"] td`);
    await expect(row.nth(1)).not.toHaveText("0");
    await expect(admin.locator('[data-testid="backup-last-ok"]')).toHaveText(dictionaries.es.admin.metrics.noBackup);
  });
});
