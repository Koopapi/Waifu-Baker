import type { Browser, Locator, Page } from "@playwright/test";
import { DESKTOP, expect } from "./fixtures";
import path from "node:path";

export const LAB = path.resolve(__dirname, "../public/lab");

/** El administrador entra siempre en escritorio; el resto, con el dispositivo del proyecto. */
export async function login(browser: Browser, name: string, admin: boolean, next = "/admin", opts: { keepCelebration?: boolean } = {}): Promise<Page> {
  const page = await (await browser.newContext(admin ? DESKTOP : {})).newPage();
  page.on("dialog", (d) => d.accept());
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.fill('input[name="name"]', name);
  if (!admin) await untickAdmin(page);
  await page.click("text=Entrar (desarrollo)");
  // Se espera al destino final (o a la bienvenida): en WebKit hay pasos intermedios tras el login.
  const target = next.split("?")[0];
  await page.waitForURL((u) => u.pathname.startsWith(target) || u.pathname.startsWith("/bienvenida"));
  await page.waitForLoadState("networkidle");
  await acceptGate(page);
  if (!opts.keepCelebration) await dismissCelebration(page);
  return page;
}

/**
 * Spec 015, RF-6: al entrar con sobres recibidos sin pedirlos (regalos, suscripción) sale una celebración que
 * atrapa el foco. Las pruebas que no van de eso la cierran si aparece.
 */
export async function dismissCelebration(page: Page, timeout = 1500) {
  const dialog = page.locator('[data-testid="celebration-dialog"]');
  const shown = await dialog.waitFor({ state: "visible", timeout }).then(
    () => true,
    () => false,
  );
  if (!shown) return;
  await dialog.locator('[data-testid="celebration-close"]').click();
  await dialog.waitFor({ state: "detached" });
}

/**
 * Spec 007: acepta la bienvenida (edad y términos) si hace falta y sigue a donde iba. No se espera a que
 * llegue la redirección (en una máquina lenta tarda más que cualquier plazo fijo): se abre la bienvenida
 * directamente, que manda al destino sin mostrar nada cuando no hay nada que aceptar.
 */
export async function acceptGate(page: Page) {
  const here = new URL(page.url());
  if (here.pathname.startsWith("/admin")) return;
  const next = here.pathname.startsWith("/bienvenida")
    ? (here.searchParams.get("next") ?? "/")
    : here.pathname + here.search;
  try {
    await page.goto(`/bienvenida?next=${encodeURIComponent(next)}`);
  } catch (e) {
    // La redirección de la propia web a la bienvenida puede llegar justo a la vez: va al mismo sitio.
    if (!String(e).includes("interrupted by another navigation")) throw e;
    await page.waitForLoadState("load");
  }
  // En una carga completa, la redirección del servidor ya ha ocurrido cuando `goto` termina.
  if (new URL(page.url()).pathname.startsWith("/bienvenida")) {
    const gate = page.locator('[data-testid="gate-form"]');
    await gate.waitFor({ state: "visible" });
    await tickAll(gate);
    await gate.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith("/bienvenida"));
  }
  await page.waitForLoadState("networkidle");
}

/**
 * Prepara datos por `/api/dev/seed` con la sesión de administrador de `page`, por los mismos servicios que
 * el panel pero sin su interfaz (que ya prueba `admin-panel.spec.ts`): rápido y sin carreras en WebKit.
 */
async function seed<T>(page: Page, data: Record<string, unknown>): Promise<T> {
  const res = await page.request.post("/api/dev/seed", { data, timeout: 60_000 });
  if (!res.ok()) throw new Error(`/api/dev/seed ${data.action} → ${res.status()}: ${await res.text()}`);
  return (await res.json()) as T;
}

/** Colección publicada de 2 cartas por sobre: ranura 1 común, ranura 2 rara (la carta `rareIndex`). */
export async function createPublishedSet(page: Page, code: string, images: string[], rareIndex: number, holoPct?: number, adult = false) {
  const { setId } = await seed<{ setId: string }>(page, {
    action: "publishedSet",
    code,
    name: `Colección ${code}`,
    characterName: `Personaje ${code}`,
    packSize: 2,
    isAdult: adult,
    // Como en el panel, las cartas se numeran por nombre de archivo.
    cards: images.map((img) => path.basename(img)).sort().map((image, i) => ({
      image,
      name: `${code} carta ${String(i + 1).padStart(3, "0")}`,
      rarity: i + 1 === rareIndex ? "rare" : "common",
    })),
    slots: [{ common: 100 }, { rare: 100 }],
    holoPercent: holoPct,
  });
  return setId;
}

/** Spec 017: arma las cartas de una colección con un fondo de su biblioteca (lo que el administrador haría carta a carta). */
export async function assembleSet(page: Page, code: string) {
  await seed(page, { action: "assembleSet", setCode: code });
}

/** Spec 020: una zona de Expediciones con el botín por defecto. */
export async function createZone(page: Page, zone: { name: string; terrain: string; difficulty: number; fragmentsRequired: number; sortOrder: number }) {
  await seed(page, { action: "zone", ...zone });
}

export async function giftPacks(page: Page, userName: string, code: string, count: number) {
  await seed(page, { action: "gift", userName, setCode: code, count, reason: "Regalo del test E2E" });
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

/**
 * Spec 011: elige una opción en un desplegable del sistema de diseño (combobox con lista en un portal).
 * `scope` acota dónde está el desplegable; la lista se busca en toda la página.
 */
export async function choose(scope: Page | Locator, label: string | RegExp, option: string | RegExp) {
  const page = "page" in scope && typeof scope.page === "function" ? (scope as Locator).page() : (scope as Page);
  const item = page.getByRole("option", { name: option }).first();
  // Un clic antes de que la página termine de hidratarse no abre la lista (pasa en los ejecutores lentos de la CI):
  // se vuelve a pulsar hasta que aparece.
  await expect(async () => {
    if (!(await item.isVisible())) await scope.getByRole("combobox", { name: label }).click();
    await expect(item).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 60_000 });
  await item.click();
}

/** Spec 011: marca o desmarca una casilla del sistema de diseño (casilla nativa con su etiqueta). */
export async function tick(scope: Page | Locator, label: string | RegExp, on = true) {
  await scope.getByRole("checkbox", { name: label }).setChecked(on);
}

/** Spec 011: en el login de desarrollo, entrar sin el papel de administrador (casilla del sistema de diseño). */
export async function untickAdmin(page: Page) {
  await page.locator('form:has(input[name="name"]) input[type="checkbox"]').setChecked(false);
}

/** Spec 011: marca todas las casillas de un formulario (p. ej. la bienvenida: edad y términos). */
export async function tickAll(scope: Locator) {
  const boxes = scope.locator('input[type="checkbox"]');
  for (let i = 0; i < (await boxes.count()); i++) await boxes.nth(i).setChecked(true);
}

/**
 * Spec 019: «Abrir todos» y saltar la animación (ráfaga y foco) hasta el resumen. Devuelve el número de cartas del lote
 * según los totales del resumen.
 */
export async function openAllAndSkip(page: Page): Promise<number> {
  await page.click('[data-testid="open-all"]');
  const result = page.locator('[data-testid="open-all-result"]');
  const skip = page.locator('[data-testid="open-all-skip"]');
  await expect(result.or(skip).first()).toBeVisible({ timeout: 30_000 });
  while (!(await result.isVisible())) {
    if (await skip.isVisible()) await skip.click().catch(() => {});
    await page.waitForTimeout(100);
  }
  return Number(await page.locator('[data-testid="open-all-totals"] dd').first().textContent());
}
