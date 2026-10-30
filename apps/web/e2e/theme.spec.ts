// Spec 026: tema Street pop seleccionable. Elegir en «Mi cuenta» lo aplica al instante, lo guarda en la cuenta y lo
// lleva a otros dispositivos; sin sesión, kawaii. La mesa de apertura sigue oscura y el álbum de otro usuario sale en el
// tema del visitante. Si no se puede guardar, vuelve el anterior.
import path from "node:path";
import type { Page } from "@playwright/test";
import { desktopOnly, expect, test } from "./fixtures";
import { LAB, createPublishedSet, dismissCelebration, giftPacks, login } from "./helpers";

const theme = (page: Page) => page.evaluate(() => document.documentElement.dataset.theme);
const streetRadio = (page: Page) => page.getByRole("radio", { name: /Street pop/ });

async function chooseStreet(page: Page) {
  await page.goto("/account");
  await dismissCelebration(page);
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/account");
  await streetRadio(page).click();
  await saved;
}

test("tema: elegir Street pop, guardarlo en la cuenta y verlo en otro navegador", async ({ browser }) => {
  test.setTimeout(180_000);
  const tag = test.info().project.name.replace(/[^a-z0-9]/g, "");
  const name = `tema-${tag}`;

  await test.step("RF-2: sin sesión, kawaii", async () => {
    const anon = await (await browser.newContext()).newPage();
    await anon.goto("/");
    expect(await theme(anon)).toBe("kawaii");
    await anon.context().close();
  });

  const fan = await login(browser, name, false, "/account");

  await test.step("RF-3 y RF-4: sin elegir, kawaii; el selector va primero en Mi cuenta", async () => {
    expect(await theme(fan)).toBe("kawaii");
    await expect(fan.locator('main [data-testid^="account-"]').first()).toHaveAttribute("data-testid", "account-theme");
    await expect(fan.getByRole("radio", { name: /Kawaii/ })).toHaveAttribute("aria-checked", "true");
  });

  await test.step("RF-5 y RF-6: al elegir cambia en menos de 1 s, sin recargar, y se guarda", async () => {
    await fan.evaluate(() => ((window as unknown as { __sinRecargar: boolean }).__sinRecargar = true));
    const saved = fan.waitForResponse((r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/account");
    await streetRadio(fan).click();
    await expect.poll(() => theme(fan), { timeout: 1000 }).toBe("street");
    expect(await fan.evaluate(() => (window as unknown as { __sinRecargar?: boolean }).__sinRecargar)).toBe(true);
    await saved;
    await expect(streetRadio(fan)).toHaveAttribute("aria-checked", "true");
  });

  await test.step("RF-8, RF-17 y RF-18: la página llega del servidor ya en Street pop, con su paleta y sus fuentes", async () => {
    const html = await (await fan.request.get("/account")).text();
    expect(html).toMatch(/<html[^>]*data-theme="street"/);
    await fan.reload();
    expect(await theme(fan)).toBe("street");
    expect(await fan.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(236, 228, 250)");
    expect(await fan.locator("main h1").first().evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/Dela/i);
    // RF-21: los botones van inclinados.
    expect(await fan.locator("main .ui-btn").first().evaluate((el) => getComputedStyle(el).transform)).not.toBe("none");
  });

  await test.step("RNF: a 390 px no hay scroll horizontal", async () => {
    await fan.setViewportSize({ width: 390, height: 844 });
    await fan.reload();
    expect(await fan.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  });

  await test.step("RF-7: con la misma cuenta en otro navegador, Street pop", async () => {
    const other = await login(browser, name, false, "/packs");
    expect(await theme(other)).toBe("street");
    // RF-10: sin la sesión, vuelve el kawaii.
    await other.context().clearCookies();
    await other.goto("/");
    expect(await theme(other)).toBe("kawaii");
    await other.context().close();
  });
});

test("tema: si no se puede guardar, vuelve el anterior y avisa (RF-9)", async ({ browser }) => {
  desktopOnly();
  const fan = await login(browser, "tema-falla", false, "/account");
  await fan.route("**/account", (route) => (route.request().method() === "POST" ? route.abort() : route.continue()));
  await streetRadio(fan).click();
  await expect(fan.getByText("No se pudo guardar el tema. Volvimos al anterior.")).toBeVisible();
  await expect.poll(() => theme(fan)).toBe("kawaii");
  await expect(fan.getByRole("radio", { name: /Kawaii/ })).toHaveAttribute("aria-checked", "true");
});

test("tema: la mesa de apertura sigue oscura y el álbum sale en el tema de quien lo visita (RF-12 a RF-16)", async ({ browser }) => {
  desktopOnly();
  test.setTimeout(240_000);
  const admin = await login(browser, "admin-tema", true);
  await createPublishedSet(admin, "TEM1", ["01.webp", "02.webp"].map((f) => path.join(LAB, f)), 2);
  await giftPacks(admin, "tema-mesa", "TEM1", 1);
  const fan = await login(browser, "tema-mesa", false, "/packs");
  await chooseStreet(fan);

  await test.step("RF-12: la mesa de apertura vuelve a las variables oscuras; la página alrededor, no", async () => {
    await fan.goto("/packs");
    await dismissCelebration(fan);
    await fan.click('[data-testid="group-TEM1"] >> text=Abrir un sobre');
    const stage = fan.locator(".stage");
    await expect(stage).toHaveAttribute("data-theme", "kawaii");
    expect(await stage.evaluate((el) => getComputedStyle(el).getPropertyValue("--ui-bg").trim())).toBe("#1e1630");
    expect(await fan.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--ui-bg").trim())).toBe("#ece4fa");
  });

  await test.step("RF-14: las cartas no cambian con el tema", async () => {
    // Las variables propias de la carta (marco, holo) no las toca el tema: el escenario las hereda del kawaii.
    expect(await fan.locator(".stage").evaluate((el) => getComputedStyle(el).getPropertyValue("--ui-k-contorno").trim())).toBe("#ffffff");
  });

  await test.step("RF-16: el álbum de este usuario, visto por otros, sale en el tema de cada visitante", async () => {
    await fan.goto("/collection/album");
    await fan.fill('input[name="alias"]', "Tema Street");
    await fan.click("text=Activar álbum público");
    await expect(fan.locator('[data-testid="album-status"] h2')).toHaveText("Tu álbum es público");
    const url = await fan.locator('[data-testid="album-url"]').inputValue();

    const anon = await (await browser.newContext()).newPage();
    await anon.goto(url);
    await expect(anon.locator('[data-testid="album-alias"]')).toHaveText("Tema Street");
    expect(await theme(anon)).toBe("kawaii");
    await anon.context().close();

    await fan.goto(url);
    expect(await theme(fan)).toBe("street");
  });
});

test("tema: quien usa kawaii no descarga las fuentes de Street pop (RNF)", async ({ browser }) => {
  desktopOnly();
  const fan = await login(browser, "tema-fuentes", false, "/account");
  await fan.evaluate(() => document.fonts.ready);
  const loaded = () => fan.evaluate(() => [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family).join(" | "));
  expect(await loaded()).not.toMatch(/Archivo|Dela/i);
  await streetRadio(fan).click();
  await expect.poll(loaded, { timeout: 10_000 }).toMatch(/Dela/i);
});
