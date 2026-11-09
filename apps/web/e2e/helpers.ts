import { readdirSync } from "node:fs";
import type { Browser, Locator, Page } from "@playwright/test";
import { DESKTOP, expect } from "./fixtures";
import path from "node:path";

export const LAB = path.resolve(__dirname, "../public/lab");

/**
 * `page.goto` que tolera la recarga sola de la página anterior: tras guardar un formulario o al entrar en «Mis sobres»
 * (que marca los sobres como vistos) la página se refresca, y en WebKit ese refresco interrumpe el goto siguiente. Si
 * pasa, se vuelve a ir a la dirección pedida cuando la recarga termina.
 */
export async function go(page: Page, url: string) {
  try {
    await page.goto(url);
  } catch (e) {
    if (!/interrupted by another navigation/.test((e as Error).message)) throw e;
    await page.waitForLoadState("networkidle");
    await page.goto(url);
  }
}

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
  await page.waitForURL((u) => u.pathname.startsWith(target) || u.pathname.startsWith("/welcome"));
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
  const next = here.pathname.startsWith("/welcome")
    ? (here.searchParams.get("next") ?? "/")
    : here.pathname + here.search;
  try {
    await page.goto(`/welcome?next=${encodeURIComponent(next)}`);
  } catch (e) {
    // La redirección de la propia web a la bienvenida puede llegar justo a la vez: va al mismo sitio.
    if (!String(e).includes("interrupted by another navigation")) throw e;
    await page.waitForLoadState("load");
  }
  // En una carga completa, la redirección del servidor ya ha ocurrido cuando `goto` termina.
  if (new URL(page.url()).pathname.startsWith("/welcome")) {
    const gate = page.locator('[data-testid="gate-form"]');
    await gate.waitFor({ state: "visible" });
    await tickAll(gate);
    await gate.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith("/welcome"));
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
export async function createPublishedSet(page: Page, code: string, images: string[], rareIndex: number, holoPct?: number, adult = false, free = false) {
  const { setId } = await seed<{ setId: string }>(page, {
    action: "publishedSet",
    code,
    name: `Colección ${code}`,
    characterName: `Personaje ${code}`,
    packSize: 2,
    isAdult: adult,
    // Spec 021: gratuita = sale en el sobre cada 12 h, el día 7 y las expediciones.
    isFree: free,
    // Como en el panel, las cartas se numeran por nombre de archivo.
    cards: [
      ...images.map((img) => path.basename(img)).sort().map((image, i) => ({
        image,
        name: `${code} carta ${String(i + 1).padStart(3, "0")}`,
        rarity: i + 1 === rareIndex ? "rare" : "common",
      })),
      // Spec 022: sin legendaria ni EX no hay tabla gold que publicar. La última carta, legendaria, solo sale en los gold.
      { image: goldImage(images), name: `${code} carta gold`, rarity: "legendary" },
    ],
    slots: [{ common: 100 }, { rare: 100 }],
    gold: [{ legendary: 100 }, { legendary: 100 }],
    holoPercent: holoPct,
  });
  return setId;
}

/** Una imagen del laboratorio que no está entre las de la colección, para su carta legendaria del sobre gold. */
function goldImage(images: string[]) {
  const used = new Set(images.map((i) => path.basename(i)));
  return readdirSync(LAB).filter((f) => f.endsWith(".webp") && !used.has(f)).sort()[0];
}

/** Spec 017: arma las cartas de una colección con un fondo de su biblioteca (lo que el administrador haría carta a carta). */
export async function assembleSet(page: Page, code: string) {
  await seed(page, { action: "assembleSet", setCode: code });
}

/** Spec 020: una zona de Expediciones con el botín por defecto. */
export async function createZone(page: Page, zone: { name: string; terrain: string; difficulty: number; fragmentsRequired: number; sortOrder: number }) {
  await seed(page, { action: "zone", ...zone });
}

export async function giftPacks(page: Page, userName: string, code: string, count: number, kind: "silver" | "gold" = "silver") {
  await seed(page, { action: "gift", userName, setCode: code, count, reason: "Regalo del test E2E", kind });
}

/**
 * Spec 030: arrastra por la línea de rasgado del sobre del paquete de diseño (y = 230 de 1750) de `from` a `to` (fracciones del
 * ancho). En los dispositivos táctiles se mandan eventos de puntero con el dedo (el sobre escucha eventos de puntero,
 * también en el teléfono); en escritorio, el ratón. Con apertura de sticker, se tira de la esquina de arriba.
 */
export async function dragLine(page: Page, from: number, to: number) {
  const sobre = page.locator('[data-testid="tear-pack"] .sc-sobre');
  await sobre.waitFor({ state: "visible" });
  const sticker = (await page.locator('[data-testid="tear-pack"][data-apertura="sticker"]').count()) > 0;
  const yFrac = sticker ? (230 / 1750) * 0.5 : 230 / 1750;
  if (await page.evaluate(() => "ontouchstart" in window)) {
    await sobre.evaluate(
      async (el, { from, to, yFrac }) => {
        const r = el.getBoundingClientRect();
        const y = r.top + r.height * yFrac;
        const fire = (type: string, f: number) =>
          el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: "touch", isPrimary: true, clientX: r.left + r.width * f, clientY: y, buttons: type === "pointerup" ? 0 : 1 }));
        fire("pointerdown", from);
        for (let i = 1; i <= 14; i++) {
          await new Promise((res) => setTimeout(res, 16));
          fire("pointermove", from + ((to - from) * i) / 14);
        }
        fire("pointerup", to);
      },
      { from, to, yFrac },
    );
    return;
  }
  const box = (await sobre.boundingBox())!;
  const y = box.y + box.height * yFrac;
  await page.mouse.move(box.x + box.width * from, y);
  await page.mouse.down();
  for (let i = 1; i <= 14; i++) await page.mouse.move(box.x + box.width * (from + ((to - from) * i) / 14), y);
  await page.mouse.up();
}

/** Abre el sobre rasgándolo por la línea (o despegando el sticker); con movimiento reducido, pulsa el botón. */
export async function tear(page: Page) {
  await page.locator('[data-testid="tear-pack"] .sc-sobre').waitFor({ state: "visible" });
  await page.waitForLoadState("networkidle");
  // Spec 023: «Abrir sin deslizar» está siempre; con movimiento reducido es la única forma de abrir.
  if (await page.locator(".tear--reduced").count()) {
    await page.click(".pack__cta");
    return;
  }
  const sticker = (await page.locator('[data-testid="tear-pack"][data-apertura="sticker"]').count()) > 0;
  if (sticker) await dragLine(page, 0.05, 1.05);
  else await dragLine(page, 0.08, 0.94);
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

/** Spec 023: revela (voltea y presenta) la carta de arriba del mazo. */
export async function revealTop(page: Page) {
  await page.locator('.card3d[role="button"]').first().click();
  await expect(page.locator('[data-testid="reveal-info"]')).toBeVisible();
}

/** Spec 023: aparta la carta presentada (con la última, llega el resumen). */
export async function dismissTop(page: Page) {
  await page.locator('.card3d[role="button"]').first().click();
  await expect(page.locator('[data-testid="reveal-info"]')).toHaveCount(0);
}

/** Spec 023: revela y aparta todas las cartas del mazo hasta el resumen. */
export async function openDeck(page: Page) {
  await expect(page.locator('.stage[data-phase="deck"]')).toBeVisible();
  const n = await page.locator(".card3d").count();
  for (let k = 0; k < n; k++) {
    await revealTop(page);
    await dismissTop(page);
  }
  await expect(page.locator(".summary")).toBeVisible();
}

/**
 * Spec 025: mueve un deslizador (o un campo de color) a `value` como lo haría el navegador: el valor pasa por el
 * setter nativo (React no lo ve como suyo) y se avisa con `input`. El navegador lo acota a su mínimo, máximo y paso.
 */
export async function setSlider(input: Locator, value: number | string) {
  await input.evaluate((el, v) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    set.call(el, String(v));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}
