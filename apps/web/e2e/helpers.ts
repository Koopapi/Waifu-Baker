import type { Browser, Page } from "@playwright/test";
import { DESKTOP } from "./fixtures";
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
  // Se espera al destino final (o a la bienvenida): en WebKit hay pasos intermedios tras el login.
  const target = next.split("?")[0];
  await page.waitForURL((u) => u.pathname.startsWith(target) || u.pathname.startsWith("/bienvenida"));
  await page.waitForLoadState("networkidle");
  await acceptGate(page);
  return page;
}

/**
 * Spec 007: si aparece la bienvenida (edad y términos), se acepta y se sigue a donde iba. Tras el
 * login la redirección a la bienvenida llega un instante después, así que se espera a verla.
 */
export async function acceptGate(page: Page) {
  if (new URL(page.url()).pathname.startsWith("/admin")) return;
  const gate = page.locator('[data-testid="gate-form"]');
  try {
    await gate.waitFor({ state: "visible", timeout: 5_000 });
  } catch {
    return;
  }
  await page.check('[data-testid="gate-form"] input[name="age"]');
  await page.check('[data-testid="gate-form"] input[name="terms"]');
  await page.click('[data-testid="gate-form"] button');
  await page.waitForURL((u) => !u.pathname.startsWith("/bienvenida"));
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
