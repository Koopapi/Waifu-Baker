import { createHash } from "node:crypto";
import path from "node:path";
import { and, desc, eq } from "drizzle-orm";
import { cards, characters, expeditionProfiles, packs, userCards, userRewards } from "@/db/schema";
import { RARITIES, type Rarity } from "@/domain/catalog/card-rules";
import { ROLES, TERRAINS, defaultZoneLoot } from "@/domain/expeditions/rules";
import type { Slot } from "@/domain/catalog/odds";
import { DEMO_USERS } from "@/domain/demo/mode";
import type { DemoManifest } from "@/domain/demo/manifest";
import type { CardStore } from "@/server/ports/card-store";
import type { DbLike } from "@/server/db-types";
import { activateAlbum, featurableCards, setFeatured } from "./album";
import { characterLayer } from "@/domain/cards/layers";
import { parseCreatorConfig, withKeys } from "@/domain/cards/layers-io";
import { stageLayerImage } from "@/server/cards/layer-images";
import { saveCardLayers } from "./card-layers";
import { seedPublishedSet } from "./dev-seed";
import { updateCharacter } from "./characters";
import { saveZone } from "./expedition-zones";
import { sendExpedition } from "./expeditions";
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
 * Spec 017, RF-20: carta de muestra armada con la chica recortada, desde una configuración del creador de cartas (la de
 * Yuki del paquete de Bruno). `readFile` lee cada archivo que nombra la configuración.
 */
export interface DemoSample {
  name: string;
  character: string;
  rarity: Rarity;
  config: unknown;
  readFile: (name: string) => Promise<Buffer>;
}

/**
 * Spec 010, RF-12: la base de datos de la demo. Colección publicada (y de bienvenida) con las cartas
 * del manifiesto; un administrador; un coleccionista con 4 sobres ya abiertos (semillas fijas: cada
 * ejecución da las mismas cartas), 3 sin abrir, 240 galletas, racha en el día 4 y álbum público.
 */
export async function seedDemo(db: DbLike, store: CardStore, opts: { manifest: DemoManifest; readImage: (file: string) => Promise<Buffer>; now: Date; sample?: DemoSample }) {
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
  // Spec 017, RF-20: la chica recortada de la muestra crea su carta como cualquier otra.
  const sample = opts.sample ? parseCreatorConfig(opts.sample.config) : null;
  if (sample && !sample.ok) throw new Error(`Configuración de muestra no válida (${sample.path})`);
  const sampleGirl = sample?.ok ? sample.files.find((f) => f.kind === "character") : undefined;
  if (opts.sample && sampleGirl) {
    files.push({ file: { body: await opts.sample.readFile(sampleGirl.name), mime: "image/webp", filename: sampleGirl.name }, name: opts.sample.name, rarity: opts.sample.rarity, character: opts.sample.character });
  }
  const present = new Set<Rarity>(files.map((c) => c.rarity));
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
    // Spec 021: el fan art es la colección gratuita; en la demo también es la de bienvenida (la probadita).
    isFree: true,
    cards: files,
    slots,
    holoPercent: 20,
  });
  await setWelcomeSet(db, admin.id, setId);

  // La carta de muestra recibe el resto de sus capas (fondo, partículas, sello…) como al importarla en el panel.
  if (opts.sample && sample?.ok && sampleGirl) {
    const [card] = await db.select().from(cards).where(and(eq(cards.setId, setId), eq(cards.name, opts.sample.name)));
    const keys: Record<string, string> = { [sampleGirl.name]: characterLayer(card.layers!)!.key };
    for (const f of sample.files.filter((x) => x.kind !== "character")) {
      const staged = await stageLayerImage(store, { body: await opts.sample.readFile(f.name), mime: "image/webp", filename: f.name }, f.kind === "seal" ? "seal" : "layer");
      keys[f.name] = staged.key;
    }
    await saveCardLayers(db, store, admin.id, card.id, { config: { ...withKeys(sample.config, keys), estiloAuto: false }, expectedVersion: card.version });
  }

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
  await seedDemoExpeditions(db, admin.id, fan.id, now);

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

/** Zonas de la demo (spec 020): 2 abiertas y 2 con niebla, como la versión 1 de Bruno. */
export const DEMO_ZONES = [
  { name: "Calles de Puerto Miel", terrain: "city", difficulty: 30, fragmentsRequired: 0 },
  { name: "Bosque de los Susurros", terrain: "forest", difficulty: 30, fragmentsRequired: 0 },
  { name: "Costa Coral", terrain: "coast", difficulty: 55, fragmentsRequired: 5 },
  { name: "Ruinas de Velmora", terrain: "ruins", difficulty: 80, fragmentsRequired: 10 },
] as const;

/**
 * Spec 020: Expediciones en la demo. Terreno y rol para cada personaje, las 4 zonas, 6 fragmentos y dos equipos: uno ya
 * de vuelta (listo para reclamar) y otro en camino.
 */
async function seedDemoExpeditions(db: DbLike, adminId: string, fanId: string, now: Date) {
  const chars = await db.select({ id: characters.id }).from(characters).orderBy(characters.name);
  for (const [i, c] of chars.entries()) await updateCharacter(db, adminId, c.id, { terrain: TERRAINS[i % 2], role: ROLES[i % ROLES.length] });
  const zones = [];
  for (const [i, z] of DEMO_ZONES.entries()) {
    zones.push(await saveZone(db, adminId, { ...z, sortOrder: i + 1, active: true, loot: defaultZoneLoot(z.difficulty) }));
  }
  await db.insert(expeditionProfiles).values({ userId: fanId, fragments: 6 }).onConflictDoUpdate({ target: expeditionProfiles.userId, set: { fragments: 6 } });
  const owned = await db.select({ cardId: userCards.cardId, holo: userCards.holo }).from(userCards).where(eq(userCards.userId, fanId)).orderBy(userCards.cardId, userCards.holo);
  const [a, b, c] = owned;
  if (a) await sendExpedition(db, fanId, { zoneId: zones[0].id, durationMin: 30, cards: [a] }, new Date(now.getTime() - 40 * 60 * 1000));
  if (b && c) await sendExpedition(db, fanId, { zoneId: zones[1].id, durationMin: 120, cards: [b, c] }, now);
}
