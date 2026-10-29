import { asc, eq } from "drizzle-orm";
import { cards, sets } from "@/db/schema";
import { createCharacter } from "@/server/services/characters";
import { createSet, publishSet, saveOdds, setFreeSet } from "@/server/services/collections";
import { uploadCardImage } from "@/server/services/cards";
import { assembleSetCards } from "@/server/services/dev-seed";
import type { Rarity } from "@/domain/catalog/card-rules";
import { MIME, testImage } from "./images";
import { tempStore } from "./store";
import { upsertUserFromLogin } from "@/server/services/users";
import type { DbLike } from "@/server/db-types";
import type { CardStore } from "@/server/ports/card-store";

export async function makeAdmin(db: DbLike, id = "admin-1") {
  return upsertUserFromLogin(db, { patreonUserId: id, displayName: "Admin", role: "admin" });
}

const ZERO = { common: 0, rare: 0, epic: 0, legendary: 0, ex: 0 };

/**
 * Colección publicada lista para abrir sobres: una carta por rareza indicada, nombres y personaje
 * asignados, probabilidades y protección dadas. Spec 022: también la tabla gold (por defecto, toda de la rareza más
 * alta); si no hay legendaria ni EX, se añade al final una carta legendaria que solo puede salir en los sobres gold
 * (`goldCard`) y que no va en `cards`.
 */
export async function createPublishedSet(
  db: DbLike,
  adminId: string,
  opts: { code: string; rarities: Rarity[]; slots: Partial<Record<Rarity, number>>[]; gold?: Partial<Record<Rarity, number>>[]; holoChance?: number; pity?: number; isAdult?: boolean; isFree?: boolean; store?: CardStore },
) {
  const set = await createSet(db, adminId, { code: opts.code, name: opts.code, isAdult: Boolean(opts.isAdult), packSize: opts.slots.length });
  // Spec 021: solo las colecciones gratuitas salen en las fuentes gratis.
  if (opts.isFree) await setFreeSet(db, adminId, set.id, true);
  const store = opts.store ?? tempStore();
  const ch = await createCharacter(db, adminId, { name: `Personaje ${opts.code}` });
  const top: Rarity = opts.rarities.includes("ex") ? "ex" : "legendary";
  const extra = !opts.rarities.some((r) => r === "legendary" || r === "ex");
  for (const [i, rarity] of [...opts.rarities, ...(extra ? (["legendary"] as const) : [])].entries()) {
    const c = await uploadCardImage(db, store, adminId, set.id, { body: await testImage({ hue: (i * 47) % 360 }), mime: MIME.png, filename: `${i}.png` });
    await db
      .update(cards)
      .set({ rarity, characterId: ch.id, name: `Carta ${i + 1}`, status: "ready", ...(opts.isAdult ? { adultReviewedAt: new Date(), adultReviewedBy: adminId } : {}) })
      .where(eq(cards.id, c.id));
  }
  // Spec 017, RF-15 y RF-20: solo se publican cartas armadas (chica y fondo).
  await assembleSetCards(db, store, adminId, set.id);
  const ver = async () => (await db.select().from(sets).where(eq(sets.id, set.id)))[0].version;
  await saveOdds(db, adminId, set.id, await ver(), {
    slots: opts.slots.map((s) => ({ ...ZERO, ...s })),
    holoChance: opts.holoChance ?? 0,
    pityThreshold: opts.pity ?? 10,
  });
  await saveOdds(db, adminId, set.id, await ver(), {
    kind: "gold",
    slots: (opts.gold ?? opts.slots.map(() => ({ [top]: 100 }))).map((s) => ({ ...ZERO, ...s })),
    holoChance: opts.holoChance ?? 0,
  });
  const r = await publishSet(db, adminId, set.id, await ver());
  if (r.problems.length) throw new Error(`No se pudo publicar ${opts.code}: ${r.problems.map((p) => p.message).join(" ")}`);
  const list = await db.select().from(cards).where(eq(cards.setId, set.id)).orderBy(asc(cards.number));
  return { set, cards: list.slice(0, opts.rarities.length), goldCard: extra ? list[opts.rarities.length] : null };
}
