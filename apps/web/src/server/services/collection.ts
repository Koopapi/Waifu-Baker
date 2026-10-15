import { and, asc, eq, inArray } from "drizzle-orm";
import { cards, sets, userCards, users } from "@/db/schema";
import { buildBinder } from "@/domain/collection/binder";
import type { DbLike } from "@/server/db-types";

const visibleStatus = ["published", "archived"] as const;

async function isVerified(db: DbLike, userId: string) {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  return Boolean(u?.isAdultDeclared && u.adultVerifiedAt);
}

/** RF-1 y RF-4: colecciones con al menos una carta del usuario, con progreso; las 18+ sin verificar, bloqueadas. */
export async function myCollections(db: DbLike, userId: string) {
  const owned = await db
    .select({ setId: cards.setId, cardId: userCards.cardId })
    .from(userCards)
    .innerJoin(cards, eq(cards.id, userCards.cardId))
    .where(eq(userCards.userId, userId));
  const setIds = [...new Set(owned.map((o) => o.setId))];
  if (setIds.length === 0) return [];
  const verified = await isVerified(db, userId);
  const [setRows, totals] = await Promise.all([
    db.select().from(sets).where(and(inArray(sets.id, setIds), inArray(sets.status, [...visibleStatus]))).orderBy(asc(sets.code)),
    db.select({ setId: cards.setId, id: cards.id }).from(cards).where(inArray(cards.setId, setIds)),
  ]);
  return setRows.map((s) => {
    const distinct = new Set(owned.filter((o) => o.setId === s.id).map((o) => o.cardId)).size;
    return {
      setId: s.id,
      code: s.code,
      name: s.name,
      isAdult: s.isAdult,
      locked: s.isAdult && !verified,
      progress: { owned: distinct, total: totals.filter((t) => t.setId === s.id).length },
    };
  });
}

/** RF-2, RF-3 y RF-4: el álbum de una colección con sus huecos. */
export async function myBinder(db: DbLike, userId: string, setId: string) {
  const [set] = await db.select().from(sets).where(and(eq(sets.id, setId), inArray(sets.status, [...visibleStatus])));
  if (!set) return null;
  if (set.isAdult && !(await isVerified(db, userId))) {
    return { set, locked: true, slots: [], progress: { owned: 0, total: 0 } };
  }
  const [setCards, owned] = await Promise.all([
    db.select().from(cards).where(eq(cards.setId, setId)),
    db
      .select({ cardId: userCards.cardId, holo: userCards.holo, qty: userCards.qty, firstObtainedAt: userCards.firstObtainedAt })
      .from(userCards)
      .innerJoin(cards, eq(cards.id, userCards.cardId))
      .where(and(eq(userCards.userId, userId), eq(cards.setId, setId))),
  ]);
  return { set, locked: false, ...buildBinder(setCards, owned) };
}

/** RF-5: ficha de una carta que el usuario tiene; null si no la tiene. */
export async function cardDetail(db: DbLike, userId: string, cardId: string) {
  const rows = await db
    .select({ card: cards, set: sets, holo: userCards.holo, qty: userCards.qty, firstObtainedAt: userCards.firstObtainedAt })
    .from(userCards)
    .innerJoin(cards, eq(cards.id, userCards.cardId))
    .innerJoin(sets, eq(sets.id, cards.setId))
    .where(and(eq(userCards.userId, userId), eq(userCards.cardId, cardId)));
  if (rows.length === 0) return null;
  const { card, set } = rows[0];
  if (set.isAdult && !(await isVerified(db, userId))) return null;
  return {
    cardId: card.id,
    number: card.number,
    name: card.name,
    rarity: card.rarity,
    flavorText: card.flavorText,
    setCode: set.code,
    setName: set.name,
    qty: rows.filter((r) => !r.holo).reduce((a, r) => a + r.qty, 0),
    holoQty: rows.filter((r) => r.holo).reduce((a, r) => a + r.qty, 0),
    firstObtainedAt: rows.map((r) => r.firstObtainedAt).sort((a, b) => a.getTime() - b.getTime())[0],
  };
}
