import type { Browser, Page } from "@playwright/test";
import { DESKTOP, expect } from "./fixtures";
import path from "node:path";

export const LAB = path.resolve(__dirname, "../public/lab");

/** El administrador entra siempre en escritorio; el resto, con el dispositivo del proyecto. */
export async function login(browser: Browser, name: string, admin: boolean, next = "/admin"): Promise<Page> {
  const page = await (await browser.newContext(admin ? DESKTOP : {})).newPage();
  page.on("dialog", (d) => d.accept());
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.fill('input[name="name"]', name);
  if (!admin) await page.uncheck('input[name="admin"]');
  await page.click("text=Entrar (desarrollo)");
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  // La redirección tras el login debe terminar antes de navegar a otra página.
  await page.waitForLoadState("networkidle");
  return page;
}

/** Crea por el panel una colección publicada de 2 cartas por sobre: ranura 1 común, ranura 2 rara. */
export async function createPublishedSet(page: Page, code: string, images: string[], rareIndex: number, holoPct?: number, adult = false) {
  // En WebKit, escribir antes de que la página esté lista puede mandar el formulario vacío.
  await page.goto("/admin/characters");
  await page.waitForLoadState("networkidle");
  await page.fill('form:has-text("Nuevo personaje") input[name="name"]', `Personaje ${code}`);
  await page.click("text=Crear personaje");
  await expect(page.locator(`text=Personaje «Personaje ${code}» creado.`)).toBeVisible();
  await page.goto("/admin/sets");
  await page.waitForLoadState("networkidle");
  await page.fill('input[name="code"]', code);
  await page.fill('form input[name="name"]', `Colección ${code}`);
  await page.fill('input[name="packSize"]', "2");
  if (adult) await page.check('form input[name="isAdult"]');
  await page.click("text=Crear colección");
  await expect(page.locator(`text=Colección ${code} creada en borrador.`)).toBeVisible();
  await page.click(`a:text-is('${code}')`);
  await page.waitForURL(/\/admin\/sets\/[0-9a-f-]+$/);
  await page.waitForLoadState("networkidle");
  const setId = page.url().split("/").pop()!;
  // Si una recarga del servidor de desarrollo se come la selección, se repite (no hay subida a medias).
  await expect(async () => {
    await page.setInputFiles('[data-testid="file-input"]', images);
    await expect(page.locator('[data-testid="upload-list"] li')).toHaveCount(images.length, { timeout: 10_000 });
  }).toPass({ timeout: 60_000 });
  await expect(page.locator(`text=Subida terminada · ${images.length} correctas`)).toBeVisible({ timeout: 90_000 });
  await page.click("text=Seleccionar todas");
  await page.selectOption('[aria-label="Personaje para la selección"]', { label: `Personaje ${code}` });
  await page.selectOption('[aria-label="Rareza para la selección"]', "common");
  await page.click("text=Aplicar a la selección");
  await expect(page.locator(`text=${images.length} carta(s) actualizada(s).`)).toBeVisible({ timeout: 60_000 });
  const rareN = String(rareIndex).padStart(3, "0");
  await page.check(`[aria-label="Seleccionar carta ${rareN}"]`);
  await page.selectOption('[aria-label="Rareza para la selección"]', "rare");
  await page.click("text=Aplicar a la selección");
  await expect(page.locator("text=1 carta(s) actualizada(s).")).toBeVisible({ timeout: 30_000 });
  for (let i = 1; i <= images.length; i++) {
    const n = String(i).padStart(3, "0");
    await page.click(`[aria-label="Editar carta ${n}"]`);
    await page.fill('dialog input[name="name"]', `${code} carta ${n}`);
    await page.click("dialog >> text=Guardar");
    await expect(page.locator("dialog")).toHaveCount(0);
  }
  if (adult) {
    // Revisión 18+ de cada carta (spec 003, RF-18).
    for (let i = 1; i <= images.length; i++) {
      const n = String(i).padStart(3, "0");
      await page.click(`[aria-label="Editar carta ${n}"]`);
      await page.click("dialog >> text=Confirmo: personaje claramente adulto");
      await expect(page.locator(`[data-card-tile="${i}"]`)).toContainText("Revisada");
      if (await page.locator("dialog").count()) await page.keyboard.press("Escape");
      await expect(page.locator("dialog")).toHaveCount(0);
    }
  }
  const R = ["Común", "Poco común", "Rara", "Épica", "Legendaria", "Secreta"];
  const fill = async (slot: number, weights: Record<string, number>) => {
    for (const r of R) await page.locator(`[aria-label="Ranura ${slot}, ${r}"]`).fill(String(weights[r] ?? 0));
  };
  await fill(1, { Común: 100 });
  await fill(2, { Rara: 100 });
  if (holoPct !== undefined) await page.locator('label:has-text("Probabilidad de holo") input').fill(String(holoPct));
  await page.click("text=Guardar probabilidades");
  await expect(page.locator("text=Probabilidades guardadas.")).toBeVisible();
  // La página ya tiene la versión nueva cuando el botón vuelve a quedar desactivado.
  await expect(page.locator("button:has-text('Guardar probabilidades')")).toBeDisabled();
  await page.click("text=Comprobar y publicar");
  await expect(page.locator("text=Colección publicada. Sus probabilidades ya son públicas.")).toBeVisible();
  await expect(page.locator("h1 ~ span").first()).toHaveText("Publicada");
  return setId;
}

export async function giftPacks(page: Page, userName: string, code: string, count: number) {
  await page.goto(`/admin/users?q=${encodeURIComponent(userName)}`);
  await page.click(`a:text-is('${userName}')`);
  await page.selectOption('select[name="setId"]', { label: `${code} · Colección ${code}` });
  await page.fill('form:has(select[name="setId"]) input[name="count"]', String(count));
  await page.fill('form:has(select[name="setId"]) input[name="reason"]', "Regalo del test E2E");
  await page.click("button:has-text('Regalar sobres')");
  await expect(page.locator(`text=${count} sobre(s) regalado(s).`)).toBeVisible();
}

/** Rasga el sobre arrastrando la tira; con movimiento reducido, pulsa el botón que la sustituye. */
export async function tear(page: Page) {
  await page.waitForSelector(".pack__strip");
  await page.waitForLoadState("networkidle");
  if (await page.locator(".pack__cta").isVisible()) {
    await page.click(".pack__cta");
    return;
  }
  // En dispositivos táctiles el gesto escucha eventos táctiles: se simula un arrastre con el dedo.
  if (await page.evaluate(() => "ontouchstart" in window)) {
    await page.evaluate(async () => {
      const el = document.querySelector<HTMLElement>(".pack__strip")!;
      const r = el.getBoundingClientRect();
      const sx = r.left + r.width * 0.3;
      const sy = r.top + r.height / 2;
      // WebKit no deja construir Touch: un Event genérico con las mismas propiedades sirve en ambos motores.
      const fire = (type: string, x: number) => {
        const t = { identifier: 1, target: el, clientX: x, clientY: sy, pageX: x, pageY: sy, screenX: x, screenY: sy };
        const live = type === "touchend" ? [] : [t];
        const ev = new Event(type, { bubbles: true, cancelable: true });
        Object.defineProperties(ev, { touches: { value: live }, targetTouches: { value: live }, changedTouches: { value: [t] } });
        el.dispatchEvent(ev);
      };
      fire("touchstart", sx);
      for (let i = 1; i <= 12; i++) {
        await new Promise((res) => setTimeout(res, 16));
        fire("touchmove", sx + (220 * i) / 12);
      }
      fire("touchend", sx + 220);
    });
    return;
  }
  const strip = (await page.locator(".pack__strip").boundingBox())!;
  const sx = strip.x + strip.width * 0.3;
  const sy = strip.y + strip.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(sx + (220 * i) / 12, sy);
  await page.mouse.up();
}
