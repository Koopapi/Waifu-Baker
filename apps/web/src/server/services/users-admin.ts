import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { cards, packOpenings, packs, sets, userCards, users, patreonLinks } from "@/db/schema";
import { canGrantPacks } from "@/domain/catalog/collection-rules";
import type { DbLike } from "@/server/db-types";
import { AdminError } from "@/server/errors";
import { recordAudit } from "./audit";

/** RF-27: búsqueda por nombre (sin distinguir mayúsculas) o por id de Patreon. */
export async function searchUsers(db: DbLike, q: string, limit = 25) {
  const term = q.trim();
  if (!term) return db.select().from(users).orderBy(desc(users.createdAt)).limit(limit);
  const like = `%${term.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
  return db
    .select()
    .from(users)
    .where(or(ilike(users.displayName, like), eq(users.patreonUserId, term)))
    .orderBy(asc(users.displayName))
    .limit(limit);
}

/** RF-27: ficha con sobres sin abrir, colección e historial de aperturas. */
export async function getUserDetail(db: DbLike, userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return null;
  const [sealedPacks, collection, openings] = await Promise.all([
    db
      .select({ id: packs.id, setCode: sets.code, setName: sets.name, source: packs.source, reason: packs.reason, grantedAt: packs.grantedAt })
      .from(packs)
      .innerJoin(sets, eq(sets.id, packs.setId))
      .where(and(eq(packs.userId, userId), eq(packs.status, "sealed")))
      .orderBy(desc(packs.grantedAt)),
    db
      .select({ cardId: cards.id, number: cards.number, name: cards.name, rarity: cards.rarity, setCode: sets.code, qty: userCards.qty, holo: userCards.holo, keyThumb: cards.keyThumb })
      .from(userCards)
      .innerJoin(cards, eq(cards.id, userCards.cardId))
      .innerJoin(sets, eq(sets.id, cards.setId))
      .where(eq(userCards.userId, userId))
      .orderBy(asc(sets.code), asc(cards.number), asc(userCards.holo)),
    db
      .select({ id: packOpenings.id, openedAt: packOpenings.openedAt, cardIds: packOpenings.cardIds, setCode: sets.code })
      .from(packOpenings)
      .innerJoin(packs, eq(packs.id, packOpenings.packId))
      .innerJoin(sets, eq(sets.id, packs.setId))
      .where(eq(packOpenings.userId, userId))
      .orderBy(desc(packOpenings.openedAt))
      .limit(50),
  ]);
  // Spec 001, RF-26: estado de Patreon e historial de concesiones y anulaciones.
  const [patreon] = await db.select().from(patreonLinks).where(eq(patreonLinks.userId, userId));
  const packHistory = await db
    .select({ id: packs.id, setCode: sets.code, source: packs.source, status: packs.status, reason: packs.reason, cycleKey: packs.cycleKey, grantedAt: packs.grantedAt })
    .from(packs)
    .innerJoin(sets, eq(sets.id, packs.setId))
    .where(eq(packs.userId, userId))
    .orderBy(desc(packs.grantedAt))
    .limit(100);
  return { user, sealedPacks, collection, openings, patreon: patreon ?? null, packHistory };
}

/** RF-25 y RF-26: regalo de sobres con motivo; 18+ solo a quien superó la verificación de edad. */
export async function giftPacks(db: DbLike, actorUserId: string, input: { userId: string; setId: string; count: number; reason: string }) {
  const reason = input.reason.trim();
  if (reason.length < 3 || reason.length > 200) throw new AdminError("invalid_reason", "Escribe un motivo de 3 a 200 caracteres.", { min: 3, max: 200 });
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > 20) {
    throw new AdminError("invalid_count", "Se pueden regalar de 1 a 20 sobres a la vez.", { min: 1, max: 20 });
  }
  return db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, input.userId));
    if (!user) throw new AdminError("not_found", "El usuario no existe.", { entity: "user" });
    if (user.deletedAt) throw new AdminError("user_deleted", "La cuenta de este usuario está borrada.");
    const [set] = await tx.select().from(sets).where(eq(sets.id, input.setId));
    if (!set) throw new AdminError("not_found", "La colección no existe.", { entity: "set" });
    if (!canGrantPacks(set.status)) throw new AdminError("not_grantable", `${set.code} no está publicada: no se pueden regalar sobres de ella.`, { set: set.code, context: "gift" });
    if (set.isAdult && !(user.isAdultDeclared && user.adultVerifiedAt)) {
      throw new AdminError("age_not_verified", "Este usuario no ha superado la verificación de edad: no puede recibir sobres 18+.", { context: "gift" });
    }
    await tx.insert(packs).values(
      Array.from({ length: input.count }, () => ({
        userId: user.id,
        setId: set.id,
        source: "manual" as const,
        grantKey: `manual:${randomUUID()}`,
        reason,
        grantedBy: actorUserId,
      })),
    );
    await recordAudit(tx, {
      actorUserId,
      action: "packs_gift",
      entityType: "user",
      entityId: user.id,
      after: { count: input.count, setId: set.id, setCode: set.code, reason },
    });
    return input.count;
  });
}
