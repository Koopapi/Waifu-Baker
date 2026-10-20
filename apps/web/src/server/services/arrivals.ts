// Spec 015, RF-6 a RF-8: llegadas (sobres recibidos sin pedirlos) pendientes de celebrar y sin ver.
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { packs, sets, users } from "@/db/schema";
import { ARRIVAL_SOURCES, newArrivalsBySet as countNew, type ArrivalPack } from "@/domain/rewards/arrivals";
import type { DbLike } from "@/server/db-types";

async function sealedArrivals(db: DbLike, userId: string): Promise<ArrivalPack[]> {
  const rows = await db
    .select({ id: packs.id, setId: packs.setId, code: sets.code, name: sets.name, source: packs.source, reason: packs.reason, grantedAt: packs.grantedAt, celebratedAt: packs.celebratedAt })
    .from(packs)
    .innerJoin(sets, eq(sets.id, packs.setId))
    .where(and(eq(packs.userId, userId), eq(packs.status, "sealed"), inArray(packs.source, [...ARRIVAL_SOURCES])))
    .orderBy(asc(packs.grantedAt));
  return rows.map((r) => ({ ...r, source: r.source as ArrivalPack["source"], celebratedAt: r.celebratedAt }));
}

/** RF-6 y RF-7: las llegadas que aún no se han celebrado, en el orden en que llegaron. */
export async function pendingArrivals(db: DbLike, userId: string): Promise<ArrivalPack[]> {
  const rows = await sealedArrivals(db, userId);
  return rows.filter((r) => !(r as ArrivalPack & { celebratedAt: Date | null }).celebratedAt);
}

/** RF-7: marca celebradas las llegadas del propio usuario; repetirlo (otro dispositivo) no cambia nada. */
export async function markCelebrated(db: DbLike, userId: string, packIds: string[], now: Date) {
  if (packIds.length === 0) return;
  await db
    .update(packs)
    .set({ celebratedAt: now })
    .where(and(eq(packs.userId, userId), inArray(packs.id, packIds), isNull(packs.celebratedAt)));
}

/** RF-8: llegadas sin ver por colección (posteriores a la última visita a «Mis sobres»). */
export async function newArrivalsBySet(db: DbLike, userId: string): Promise<Map<string, number>> {
  const [user] = await db.select({ seenAt: users.packsSeenAt }).from(users).where(eq(users.id, userId));
  return countNew(await sealedArrivals(db, userId), user?.seenAt ?? null);
}

/** RF-8: el coleccionista ha visto «Mis sobres». */
export async function markPacksSeen(db: DbLike, userId: string, now: Date) {
  await db.update(users).set({ packsSeenAt: now }).where(eq(users.id, userId));
}
