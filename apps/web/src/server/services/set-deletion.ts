import { and, eq, inArray } from "drizzle-orm";
import { cards, expeditionCards, packDesigns, packs, sets, tierRules, userCards } from "@/db/schema";
import { canOfferArchive, deletionBlockers, matchesCode, type DeletionBlocker, type SetUse } from "@/domain/catalog/set-deletion";
import type { SetStatus } from "@/domain/catalog/collection-rules";
import type { DbLike } from "@/server/db-types";
import type { CardStore } from "@/server/ports/card-store";
import { AdminError, isForeignKeyViolation } from "@/server/errors";
import { recordAudit } from "./audit";
import { getCoverCards } from "./settings";

export type SetDeletionInfo = {
  id: string;
  code: string;
  name: string;
  status: SetStatus;
  cards: number;
  images: number;
  packDesigns: number;
  blockers: DeletionBlocker[];
  canArchive: boolean;
};

/** Spec 032: todas las imágenes de una colección viven bajo su carpeta (cartas, capas, originales y sobres). */
const prefixOf = (setId: string) => `sets/${setId}/`;

/** RF-8: usuarios distintos que recibieron alguna vez un sobre o una carta de la colección. */
async function ownerCount(db: DbLike, setId: string) {
  const [p, u, e] = await Promise.all([
    db.selectDistinct({ id: packs.userId }).from(packs).where(eq(packs.setId, setId)),
    db.selectDistinct({ id: userCards.userId }).from(userCards).innerJoin(cards, eq(cards.id, userCards.cardId)).where(eq(cards.setId, setId)),
    db.selectDistinct({ id: expeditionCards.userId }).from(expeditionCards).innerJoin(cards, eq(cards.id, expeditionCards.cardId)).where(eq(cards.setId, setId)),
  ]);
  return new Set([...p, ...u, ...e].map((r) => r.id)).size;
}

/** RF-11: bienvenida, cartas de portada de la home y reglas de tier de Patreon. */
async function usesOf(db: DbLike, set: { id: string; isWelcome: boolean }): Promise<SetUse[]> {
  const uses: SetUse[] = set.isWelcome ? [{ kind: "welcome" }] : [];
  const coverIds = await getCoverCards(db);
  if (coverIds.length) {
    const mine = await db.select({ id: cards.id }).from(cards).where(and(eq(cards.setId, set.id), inArray(cards.id, coverIds)));
    if (mine.length) uses.push({ kind: "cover_cards", count: mine.length });
  }
  const rules = await db.select({ name: tierRules.name, tier: tierRules.patreonTierId }).from(tierRules).where(eq(tierRules.setId, set.id));
  for (const r of rules) uses.push({ kind: "tier_rule", name: r.name || r.tier });
  return uses;
}

async function blockersOf(db: DbLike, set: { id: string; isWelcome: boolean }) {
  const [owners, uses] = await Promise.all([ownerCount(db, set.id), usesOf(db, set)]);
  return deletionBlockers({ owners, uses });
}

/** RF-2, RF-9, RF-11 y RF-12: lo que se borraría y, si no se puede, por qué. */
export async function getSetDeletionInfo(db: DbLike, store: CardStore, setId: string): Promise<SetDeletionInfo> {
  const [set] = await db.select().from(sets).where(eq(sets.id, setId));
  if (!set) throw new AdminError("not_found", "La colección no existe.", { entity: "set" });
  const [cardRows, designRows, images, blockers] = await Promise.all([
    db.select({ id: cards.id }).from(cards).where(eq(cards.setId, setId)),
    db.select({ id: packDesigns.id }).from(packDesigns).where(eq(packDesigns.setId, setId)),
    store.list(prefixOf(setId)),
    blockersOf(db, set),
  ]);
  const status = set.status as SetStatus;
  return { id: set.id, code: set.code, name: set.name, status, cards: cardRows.length, images: images.length, packDesigns: designRows.length, blockers, canArchive: canOfferArchive(status, blockers) };
}

/**
 * RF-5, RF-7, RF-8, RF-11 y RF-14: elimina la colección con todo lo suyo, todo o nada. El bloqueo de la fila choca con
 * el que toma Postgres al insertar un sobre o una regla que apunte a ella: una concesión simultánea espera y luego falla
 * por la clave foránea, o llega antes y la ve la comprobación de dentro de la transacción.
 */
export async function deleteSet(db: DbLike, store: CardStore, actorUserId: string, setId: string, typedCode: string) {
  let code = "";
  try {
    await db.transaction(async (tx) => {
      const [set] = await tx.select().from(sets).where(eq(sets.id, setId)).for("update");
      if (!set) throw new AdminError("not_found", "La colección no existe.", { entity: "set" });
      if (!matchesCode(typedCode, set.code)) throw new AdminError("confirm_mismatch", "Escribe el código de la colección para confirmar.", { code: set.code });
      const blockers = await blockersOf(tx, set);
      if (blockers.length) throw new AdminError("set_not_deletable", "La colección no se puede eliminar.", { count: blockers.length });
      const setCards = await tx.select({ id: cards.id }).from(cards).where(eq(cards.setId, setId));
      await recordAudit(tx, { actorUserId, action: "set_delete", entityType: "set", entityId: setId, before: { code: set.code, name: set.name, status: set.status, cards: setCards.length } });
      await tx.delete(sets).where(eq(sets.id, setId));
      code = set.code;
    });
  } catch (e) {
    if (isForeignKeyViolation(e)) throw new AdminError("set_not_deletable", "La colección no se puede eliminar.", { count: 1 });
    throw e;
  }
  // RNF: las imágenes se borran tras confirmar en la BD; si alguna falla, la colección ya no existe y se sigue.
  for (const { key } of await store.list(prefixOf(setId))) {
    await store.delete(key).catch((err) => console.error(`[spec 032] no se pudo borrar ${key}`, err));
  }
  return { code };
}
