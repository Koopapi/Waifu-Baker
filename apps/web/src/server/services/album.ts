import { randomBytes } from "node:crypto";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { albums, cards, sets, userCards, users } from "@/db/schema";
import { buildBinder } from "@/domain/collection/binder";
import { validateAlias, validateFeatured } from "@/domain/collection/album-rules";
import type { DbLike } from "@/server/db-types";
import { AppError } from "@/server/errors";

const B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** 12 caracteres base62 aleatorios (≈ 71 bits): no adivinable (RF-9). */
function newSlug() {
  const bytes = randomBytes(12);
  return Array.from(bytes, (b) => B62[b % 62]).join("");
}

export async function getMyAlbum(db: DbLike, userId: string) {
  const [a] = await db.select().from(albums).where(eq(albums.userId, userId));
  return a ?? null;
}

/** RF-8 y RF-9: activa el álbum con un alias; si ya existía, conserva su enlace. */
export async function activateAlbum(db: DbLike, userId: string, rawAlias: string) {
  const alias = validateAlias(rawAlias);
  if (!alias.ok) throw new AppError("invalid_alias", alias.message, alias.params);
  const [row] = await db
    .insert(albums)
    .values({ userId, slug: newSlug(), alias: alias.value, isPublic: true })
    .onConflictDoUpdate({ target: albums.userId, set: { alias: alias.value, isPublic: true, updatedAt: sql`now()` } })
    .returning();
  return row;
}

/** RF-10: el enlace deja de funcionar hasta reactivarlo. */
export async function deactivateAlbum(db: DbLike, userId: string) {
  await db.update(albums).set({ isPublic: false, updatedAt: sql`now()` }).where(eq(albums.userId, userId));
}

/** RF-11: enlace nuevo; el anterior deja de existir. */
export async function regenerateAlbumLink(db: DbLike, userId: string) {
  const [row] = await db.update(albums).set({ slug: newSlug(), updatedAt: sql`now()` }).where(eq(albums.userId, userId)).returning();
  if (!row) throw new AppError("no_album", "Activa primero tu álbum público.");
  return row;
}

/** Cartas que el usuario puede destacar: las que tiene de colecciones SFW visibles. */
async function featurableIds(db: DbLike, userId: string) {
  const rows = await db
    .selectDistinct({ id: cards.id })
    .from(userCards)
    .innerJoin(cards, eq(cards.id, userCards.cardId))
    .innerJoin(sets, eq(sets.id, cards.setId))
    .where(and(eq(userCards.userId, userId), eq(sets.isAdult, false), inArray(sets.status, ["published", "archived"])));
  return new Set(rows.map((r) => r.id));
}

/** Cartas SFW que el usuario tiene, para el selector de destacadas (RF-12). */
export async function featurableCards(db: DbLike, userId: string) {
  return db
    .selectDistinct({ cardId: cards.id, number: cards.number, name: cards.name, rarity: cards.rarity, setCode: sets.code })
    .from(userCards)
    .innerJoin(cards, eq(cards.id, userCards.cardId))
    .innerJoin(sets, eq(sets.id, cards.setId))
    .where(and(eq(userCards.userId, userId), eq(sets.isAdult, false), inArray(sets.status, ["published", "archived"])))
    .orderBy(asc(sets.code), asc(cards.number));
}

/** RF-12: hasta 5 destacadas propias y SFW, en el orden elegido. */
export async function setFeatured(db: DbLike, userId: string, cardIds: string[]) {
  const v = validateFeatured(cardIds, await featurableIds(db, userId));
  if (!v.ok) throw new AppError("invalid_featured", v.message, { ...v.params, reason: v.code });
  const [row] = await db.update(albums).set({ featuredCardIds: v.value, updatedAt: sql`now()` }).where(eq(albums.userId, userId)).returning();
  if (!row) throw new AppError("no_album", "Activa primero tu álbum público.");
  return row;
}

/**
 * RF-13 y RF-14: lo que ve un visitante. Nada de 18+, ni nombre ni id de Patreon, ni id interno
 * del usuario. null si el álbum no existe, está desactivado o la cuenta está borrada.
 */
export async function publicAlbum(db: DbLike, slug: string) {
  const [row] = await db
    .select({ album: albums })
    .from(albums)
    .innerJoin(users, eq(users.id, albums.userId))
    .where(and(eq(albums.slug, slug), eq(albums.isPublic, true), isNull(users.deletedAt)));
  if (!row) return null;
  const userId = row.album.userId;
  const owned = await db
    .select({ cardId: userCards.cardId, holo: userCards.holo, qty: userCards.qty, firstObtainedAt: userCards.firstObtainedAt, setId: cards.setId })
    .from(userCards)
    .innerJoin(cards, eq(cards.id, userCards.cardId))
    .where(eq(userCards.userId, userId));
  const setIds = [...new Set(owned.map((o) => o.setId))];
  const visibleSets = setIds.length
    ? await db
        .select()
        .from(sets)
        .where(and(inArray(sets.id, setIds), eq(sets.isAdult, false), inArray(sets.status, ["published", "archived"])))
        .orderBy(asc(sets.code))
    : [];
  const allCards = visibleSets.length ? await db.select().from(cards).where(inArray(cards.setId, visibleSets.map((s) => s.id))) : [];
  const collections = visibleSets.map((s) => {
    const b = buildBinder(
      allCards.filter((c) => c.setId === s.id),
      owned.filter((o) => o.setId === s.id),
    );
    return { setId: s.id, code: s.code, name: s.name, ...b };
  });
  const ownedVisible = new Map(collections.flatMap((c) => c.slots.filter((s) => s.owned).map((s) => [s.owned!.cardId, { ...s.owned!, setCode: c.code, number: s.number }])));
  const featured = row.album.featuredCardIds.filter((id) => ownedVisible.has(id)).map((id) => ownedVisible.get(id)!);
  return {
    slug: row.album.slug,
    alias: row.album.alias,
    featured,
    collections,
    totals: {
      owned: collections.reduce((a, c) => a + c.progress.owned, 0),
      total: collections.reduce((a, c) => a + c.progress.total, 0),
    },
  };
}

/** RF-15: la carta pertenece a un álbum público activo y es SFW; devuelve su imagen con marca de agua. */
export async function publicCardImageKey(db: DbLike, slug: string, cardId: string) {
  const [row] = await db
    .select({ key: cards.keyPublic })
    .from(albums)
    .innerJoin(users, eq(users.id, albums.userId))
    .innerJoin(userCards, eq(userCards.userId, albums.userId))
    .innerJoin(cards, eq(cards.id, userCards.cardId))
    .innerJoin(sets, eq(sets.id, cards.setId))
    .where(and(eq(albums.slug, slug), eq(albums.isPublic, true), isNull(users.deletedAt), eq(cards.id, cardId), eq(sets.isAdult, false), inArray(sets.status, ["published", "archived"])))
    .limit(1);
  return row?.key ?? null;
}
