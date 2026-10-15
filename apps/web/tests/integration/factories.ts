import { asc, eq } from "drizzle-orm";
import { cards, sets } from "@/db/schema";
import { createCharacter } from "@/server/services/characters";
import { createSet, publishSet, saveOdds } from "@/server/services/collections";
import { uploadCardImage } from "@/server/services/cards";
import type { Rarity } from "@/domain/catalog/card-rules";
import { MIME, testImage } from "./images";
import { tempStore } from "./store";
import { upsertUserFromLogin } from "@/server/services/users";
import type { DbLike } from "@/server/db-types";

export async function makeAdmin(db: DbLike, id = "admin-1") {
  return upsertUserFromLogin(db, { patreonUserId: id, displayName: "Admin", role: "admin" });
}

const ZERO = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0, secret: 0 };

/**
 * Colección publicada lista para abrir sobres: una carta por rareza indicada, nombres y personaje
 * asignados, probabilidades y protección dadas.
 */
export async function createPublishedSet(
  db: DbLike,
  adminId: string,
  opts: { code: string; rarities: Rarity[]; slots: Partial<Record<Rarity, number>>[]; holoChance?: number; pity?: number; isAdult?: boolean },
) {
  const set = await createSet(db, adminId, { code: opts.code, name: opts.code, isAdult: Boolean(opts.isAdult), packSize: opts.slots.length });
  const store = tempStore();
  const ch = await createCharacter(db, adminId, { name: `Personaje ${opts.code}` });
  for (const [i, rarity] of opts.rarities.entries()) {
    const c = await uploadCardImage(db, store, adminId, set.id, { body: await testImage({ hue: (i * 47) % 360 }), mime: MIME.png, filename: `${i}.png` });
    await db
      .update(cards)
      .set({ rarity, characterId: ch.id, name: `Carta ${i + 1}`, status: "ready", ...(opts.isAdult ? { adultReviewedAt: new Date(), adultReviewedBy: adminId } : {}) })
      .where(eq(cards.id, c.id));
  }
  const ver = async () => (await db.select().from(sets).where(eq(sets.id, set.id)))[0].version;
  await saveOdds(db, adminId, set.id, await ver(), {
    slots: opts.slots.map((s) => ({ ...ZERO, ...s })),
    holoChance: opts.holoChance ?? 0,
    pityThreshold: opts.pity ?? 10,
  });
  const r = await publishSet(db, adminId, set.id, await ver());
  if (r.problems.length) throw new Error(`No se pudo publicar ${opts.code}: ${r.problems.map((p) => p.message).join(" ")}`);
  const list = await db.select().from(cards).where(eq(cards.setId, set.id)).orderBy(asc(cards.number));
  return { set, cards: list };
}
