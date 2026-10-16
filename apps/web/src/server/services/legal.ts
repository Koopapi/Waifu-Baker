import { eq, sql } from "drizzle-orm";
import { userDays, users } from "@/db/schema";
import { TERMS_VERSION } from "@/domain/legal/documents";
import type { DbLike } from "@/server/db-types";
import { recordAudit } from "./audit";
import { getMinAge } from "./settings";

/**
 * Spec 007, RF-1 y RF-3: confirma la edad mínima y acepta la versión vigente de los términos. Spec 010,
 * RF-18: guarda qué edad confirmó, para volver a pedirla si la de la web sube.
 */
export async function acceptTerms(db: DbLike, userId: string, now = new Date()) {
  const minAge = await getMinAge(db);
  const [row] = await db
    .update(users)
    .set({
      ageConfirmedAt: sql`coalesce(${users.ageConfirmedAt}, ${now.toISOString()}::timestamptz)`,
      ageConfirmedMin: minAge,
      termsVersion: TERMS_VERSION,
      termsAcceptedAt: now,
      updatedAt: sql`now()`,
    })
    .where(eq(users.id, userId))
    .returning();
  await recordAudit(db, { actorUserId: userId, action: "terms_accepted", entityType: "user", entityId: userId, meta: { version: TERMS_VERSION, minAge } });
  return row;
}

// Un registro por usuario y día basta: se recuerda en memoria para no escribir en cada petición.
const seen = ((globalThis as { __wbSeenDays?: Set<string> }).__wbSeenDays ??= new Set());

/** Spec 007, RF-11: anota que el usuario estuvo activo ese día (UTC). */
export async function trackActivity(db: DbLike, userId: string, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  const key = `${userId}:${day}`;
  if (seen.has(key)) return;
  await db.insert(userDays).values({ userId, day }).onConflictDoNothing();
  seen.add(key);
  if (seen.size > 50_000) seen.clear();
}
