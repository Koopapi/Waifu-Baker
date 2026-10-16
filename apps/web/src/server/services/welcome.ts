import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { packs, sets } from "@/db/schema";
import type { DbLike } from "@/server/db-types";
import { AppError } from "@/server/errors";
import { recordAudit } from "./audit";

/**
 * RF-8: clave del sobre de bienvenida. Es un hash del identificador de Patreon: sobrevive al borrado
 * definitivo de la cuenta (los sobres nunca se borran, se anulan) sin guardar el identificador en claro.
 */
export function welcomeGrantKey(patreonUserId: string, secret = process.env.ACCOUNT_HASH_SECRET || process.env.AUTH_SECRET || "") {
  return `welcome:${createHash("sha256").update(`${secret}:${patreonUserId}`).digest("hex")}`;
}

export async function getWelcomeSet(db: DbLike) {
  const [s] = await db.select().from(sets).where(eq(sets.isWelcome, true));
  return s ?? null;
}

/** RF-5: una única colección SFW publicada de bienvenida; null la quita. */
export async function setWelcomeSet(db: DbLike, actorUserId: string, setId: string | null) {
  return db.transaction(async (tx) => {
    const before = await getWelcomeSet(tx);
    if (setId) {
      const [s] = await tx.select().from(sets).where(eq(sets.id, setId));
      if (!s) throw new AppError("not_found", "La colección no existe.", { entity: "set" });
      if (s.status !== "published" || s.isAdult) {
        throw new AppError("welcome_not_allowed", "Solo una colección SFW publicada puede ser la de bienvenida.");
      }
    }
    await tx.update(sets).set({ isWelcome: false }).where(eq(sets.isWelcome, true));
    if (setId) await tx.update(sets).set({ isWelcome: true, updatedAt: sql`now()` }).where(eq(sets.id, setId));
    await recordAudit(tx, { actorUserId, action: "welcome_set", entityType: "set", entityId: setId, before: { setId: before?.id ?? null }, after: { setId } });
  });
}

/**
 * RF-6 a RF-8: 1 sobre de la colección de bienvenida, una sola vez por cuenta de Patreon. Se llama en
 * cada inicio de sesión: si aún no hay colección de bienvenida, llegará cuando la haya (RF-7).
 */
export async function grantWelcomePack(db: DbLike, user: { id: string; patreonUserId: string | null; deletedAt?: Date | null }) {
  if (!user.patreonUserId || user.deletedAt) return false;
  const welcome = await getWelcomeSet(db);
  if (!welcome || welcome.status !== "published" || welcome.isAdult) return false;
  const added = await db
    .insert(packs)
    .values({ userId: user.id, setId: welcome.id, source: "promo", grantKey: welcomeGrantKey(user.patreonUserId), reason: "welcome" })
    .onConflictDoNothing({ target: packs.grantKey })
    .returning({ id: packs.id });
  if (added.length) await recordAudit(db, { actorUserId: null, action: "welcome_pack", entityType: "user", entityId: user.id, meta: { setId: welcome.id } });
  return added.length > 0;
}
