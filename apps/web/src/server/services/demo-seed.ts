import { createHash } from "node:crypto";
import path from "node:path";
import { and, desc, eq } from "drizzle-orm";
import { cards, packs, userCards, userRewards } from "@/db/schema";
import { RARITIES, type Rarity } from "@/domain/catalog/card-rules";
import type { Slot } from "@/domain/catalog/odds";
import { DEMO_USERS } from "@/domain/demo/mode";
import type { DemoManifest } from "@/domain/demo/manifest";
import type { CardStore } from "@/server/ports/card-store";
import type { DbLike } from "@/server/db-types";
import { activateAlbum, featurableCards, setFeatured } from "./album";
import { seedPublishedSet } from "./dev-seed";
import { acceptTerms } from "./legal";
import { ackOpenings, openPack } from "./packs";
import { adjustCookies } from "./rewards";
import { upsertUserFromLogin } from "./users";
import { giftPacks } from "./users-admin";
import { grantWelcomePack, setWelcomeSet } from "./welcome";

/** Nombres reales que nunca pueden aparecer en las cartas de la demo (RF-12). */
export const DEMO_BANNED_NAMES = ["makima", "yor", "forger", "rias", "gremory", "mitsuri", "kanroji", "albedo", "tifa", "lockhart"];

/** Probabilidades de la demo: rara o mejor garantizada en la última ranura (RN de la spec 004). */
export const DEMO_SLOTS: Partial<Slot>[] = [
  { common: 70, uncommon: 25, rare: 5 },
  { common: 70, uncommon: 25, rare: 5 },
  { common: 70, uncommon: 25, rare: 5 },
  { uncommon: 60, rare: 30, epic: 8, legendary: 2 },
  { rare: 75, epic: 18, legendary: 7 },
];

const MIME: Record<string, string> = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
const DAY = 24 * 60 * 60 * 1000;

/**
 * Spec 010, RF-12: la base de datos de la demo. Colección publicada (y de bienvenida) con las cartas
 * del manifiesto; un administrador; un coleccionista con 4 sobres ya abiertos (semillas fijas: cada
 * ejecución da las mismas cartas), 3 sin abrir, 240 galletas, racha en el día 4 y álbum público.
 */
export async function seedDemo(db: DbLike, store: CardStore, opts: { manifest: DemoManifest; readImage: (file: string) => Promise<Buffer>; now: Date }) {
  const { manifest, now } = opts;
  const admin = await upsertUserFromLogin(db, { patreonUserId: `dev:${DEMO_USERS.admin.name}`, displayName: DEMO_USERS.admin.displayName, role: "admin" });
  const fan = await upsertUserFromLogin(db, { patreonUserId: `dev:${DEMO_USERS.collector.name}`, displayName: DEMO_USERS.collector.displayName, role: "user" });
  await acceptTerms(db, admin.id, now);
  await acceptTerms(db, fan.id, now);

  const files = [];
  for (const c of manifest.cards) {
    const ext = path.extname(c.file).toLowerCase();
    files.push({ file: { body: await opts.readImage(c.file), mime: MIME[ext] ?? "image/webp", filename: path.basename(c.file) }, name: c.title, rarity: c.rarity, character: c.character });
  }
  const present = new Set<Rarity>(manifest.cards.map((c) => c.rarity));
  // Solo rarezas que tienen cartas (para publicar, toda rareza con probabilidad debe tener cartas).
  const slots = DEMO_SLOTS.map((s) => {
    const kept = Object.entries(s).filter(([r]) => present.has(r as Rarity));
    const total = kept.reduce((a, [, v]) => a + (v ?? 0), 0);
    const out: Partial<Slot> = {};
    let acc = 0;
    kept.forEach(([r, v], i) => {
      const share = i === kept.length - 1 ? 100 - acc : Math.round(((v ?? 0) / total) * 100);
      out[r as Rarity] = share;
      acc += share;
    });
    return out;
  });
  const setId = await seedPublishedSet(db, store, admin.id, {
    code: manifest.code,
    name: manifest.name,
    characterName: manifest.cards[0].character,
    packSize: DEMO_SLOTS.length,
    isAdult: false,
    cards: files,
    slots,
    holoPercent: 20,
  });
  await setWelcomeSet(db, admin.id, setId);

  // Cartas del coleccionista: 4 sobres abiertos con semillas fijas.
  await giftPacks(db, admin.id, { userId: fan.id, setId, count: 4, reason: "Demo: first pulls" });
  const toOpen = await db.select().from(packs).where(and(eq(packs.userId, fan.id), eq(packs.status, "sealed"))).orderBy(packs.grantedAt, packs.id);
  for (const [i, p] of toOpen.entries()) {
    await openPack(db, { userId: fan.id, packId: p.id, seed: createHash("sha256").update(`waifu-baker-demo:${i}`).digest() });
  }
  await ackOpenings(db, fan.id, toOpen.map((p) => p.id));
  // 2 regalados + el de bienvenida = 3 sin abrir.
  await giftPacks(db, admin.id, { userId: fan.id, setId, count: 2, reason: "Demo: ready to open" });
  await grantWelcomePack(db, fan);

  // Galletas y racha: hoy toca el día 4 y hay una carga de sobre gratis lista.
  await adjustCookies(db, admin.id, { userId: fan.id, amount: 240, reason: "Demo", now });
  const yesterday = new Date(now.getTime() - DAY);
  await db
    .update(userRewards)
    .set({ streakDay: 3, lastDailyDay: yesterday.toISOString().slice(0, 10), lastDailyAt: yesterday, lastTimeZone: "UTC", freeCharges: 1, freeAnchor: new Date(now.getTime() - 4 * 60 * 60 * 1000) })
    .where(eq(userRewards.userId, fan.id));

  // Álbum público con sus 3 mejores cartas destacadas.
  await activateAlbum(db, fan.id, "demo-collector");
  const rank = (r: string | null) => RARITIES.indexOf((r ?? "common") as Rarity);
  const best = (await featurableCards(db, fan.id)).sort((a, b) => rank(b.rarity) - rank(a.rarity) || a.number - b.number).slice(0, 3);
  await setFeatured(db, fan.id, best.map((c) => c.cardId));

  return { setId, adminId: admin.id, collectorId: fan.id };
}

/** Las cartas del coleccionista de la demo, para comprobar que dos ejecuciones dan lo mismo. */
export async function demoCollectorCards(db: DbLike, userId: string) {
  return db
    .select({ number: cards.number, holo: userCards.holo, qty: userCards.qty })
    .from(userCards)
    .innerJoin(cards, eq(cards.id, userCards.cardId))
    .where(eq(userCards.userId, userId))
    .orderBy(cards.number, desc(userCards.holo));
}
