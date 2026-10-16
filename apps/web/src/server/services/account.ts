import { and, eq, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { albums, cookieLedger, packs, patreonLinks, pityCounters, tierRules, userCards, userRewards, users } from "@/db/schema";
import { RECOVERY_DAYS, accountState, purgeDate } from "@/domain/accounts/lifecycle";
import { hasAdultTier, entitledPacks, type MemberState } from "@/domain/patreon/membership";
import type { DbLike } from "@/server/db-types";
import { AppError } from "@/server/errors";
import { recordAudit } from "./audit";
import { loadGrantRules } from "./membership";

function linkAsState(link: typeof patreonLinks.$inferSelect | undefined, patreonUserId: string): MemberState | null {
  if (!link) return null;
  return {
    memberId: link.memberId,
    patreonUserId,
    patronStatus: link.patronStatus as MemberState["patronStatus"],
    lastChargeDate: link.lastChargeDate,
    lastChargeStatus: link.lastChargeStatus,
    nextChargeDate: link.nextChargeDate,
    entitledTierIds: link.entitledTierIds,
  };
}

/** RF-21: lo que ve el usuario en «Mi cuenta». */
export async function accountSummary(db: DbLike, userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return null;
  const [link] = await db.select().from(patreonLinks).where(eq(patreonLinks.userId, userId));
  const state = linkAsState(link, user.patreonUserId ?? "");
  const rules = await loadGrantRules(db);
  const tierNames = new Map(
    (await db.select({ id: tierRules.patreonTierId, name: tierRules.name }).from(tierRules)).map((t) => [t.id, t.name]),
  );
  const perSet = state ? entitledPacks({ ...state, lastChargeStatus: "Paid" }, rules) : new Map<string, number>();
  const isPatron = state?.patronStatus === "active_patron";
  return {
    displayName: user.displayName,
    tiers: (state?.entitledTierIds ?? []).map((id) => ({ id, name: tierNames.get(id) || id })),
    patronStatus: state?.patronStatus ?? null,
    lastChargeDate: state?.lastChargeDate ?? null,
    lastChargeStatus: state?.lastChargeStatus ?? null,
    nextChargeDate: state?.nextChargeDate ?? null,
    packsPerMonth: isPatron ? [...perSet.values()].reduce((a, n) => a + n, 0) : 0,
    syncedAt: link?.syncedAt ?? null,
    adult: {
      declared: user.isAdultDeclared,
      verified: Boolean(user.isAdultDeclared && user.adultVerifiedAt),
      hasAdultTier: state ? hasAdultTier(state, rules) : false,
    },
  };
}

/**
 * RF-18 y RF-20: declarar la edad solo con un tier adulto activo. La verificación queda para
 * siempre, aunque después cancele o baje de tier.
 */
export async function declareAdult(db: DbLike, userId: string) {
  return db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, userId));
    if (!user || user.deletedAt) throw new AppError("not_found", "El usuario no existe.", { entity: "user" });
    if (user.isAdultDeclared && user.adultVerifiedAt) return user;
    const [link] = await tx.select().from(patreonLinks).where(eq(patreonLinks.userId, userId));
    const state = linkAsState(link, user.patreonUserId ?? "");
    if (!state || !hasAdultTier(state, await loadGrantRules(tx))) {
      throw new AppError("adult_tier_required", "Para ver contenido 18+ necesitas un tier adulto activo en Patreon.");
    }
    const [row] = await tx
      .update(users)
      .set({ isAdultDeclared: true, adultDeclaredAt: sql`now()`, adultVerifiedAt: sql`now()`, updatedAt: sql`now()` })
      .where(eq(users.id, userId))
      .returning();
    await recordAudit(tx, { actorUserId: userId, action: "adult_verified", entityType: "user", entityId: userId, meta: { tiers: state.entitledTierIds } });
    return row;
  });
}

/** RF-22: desactiva la cuenta y oculta su álbum público. La sesión la cierra la interfaz. */
export async function deactivateAccount(db: DbLike, userId: string) {
  return db.transaction(async (tx) => {
    const [row] = await tx.update(users).set({ deletedAt: sql`now()`, updatedAt: sql`now()` }).where(and(eq(users.id, userId), isNull(users.deletedAt))).returning();
    if (!row) return null;
    await tx.update(albums).set({ isPublic: false, updatedAt: sql`now()` }).where(eq(albums.userId, userId));
    await recordAudit(tx, { actorUserId: userId, action: "account_deactivated", entityType: "user", entityId: userId, meta: { purgeAfter: purgeDate(row.deletedAt!).toISOString() } });
    return row;
  });
}

/** RF-24: borra de forma definitiva una cuenta: cartas, sobres sin abrir, álbum y datos personales. */
export async function purgeAccount(db: DbLike, userId: string) {
  await db.transaction(async (tx) => {
    await tx.delete(userCards).where(eq(userCards.userId, userId));
    await tx.delete(albums).where(eq(albums.userId, userId));
    await tx.delete(pityCounters).where(eq(pityCounters.userId, userId));
    await tx.delete(patreonLinks).where(eq(patreonLinks.userId, userId));
    // Spec 009: cargas, racha y galletas.
    await tx.delete(userRewards).where(eq(userRewards.userId, userId));
    await tx.delete(cookieLedger).where(eq(cookieLedger.userId, userId));
    // Los sobres no se borran: se anulan, y las aperturas quedan sin datos personales.
    await tx.update(packs).set({ status: "void" }).where(and(eq(packs.userId, userId), eq(packs.status, "sealed")));
    await tx
      .update(users)
      .set({
        displayName: "",
        avatarUrl: null,
        patreonUserId: null,
        role: "user",
        lastCountry: null,
        purgedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(eq(users.id, userId));
    await recordAudit(tx, { actorUserId: null, action: "account_purged", entityType: "user", entityId: userId });
  });
}

/** RF-24: borra las cuentas desactivadas hace 30 días o más. */
export async function purgeExpiredAccounts(db: DbLike, now = new Date()) {
  const limit = new Date(now.getTime() - RECOVERY_DAYS * 24 * 60 * 60 * 1000);
  const due = await db
    .select({ id: users.id })
    .from(users)
    .where(and(isNotNull(users.deletedAt), isNull(users.purgedAt), lte(users.deletedAt, limit)));
  for (const u of due) await purgeAccount(db, u.id);
  return due.length;
}

/**
 * RF-23 y RF-25: antes de crear o actualizar el usuario al entrar. Una cuenta desactivada hace
 * menos de 30 días se reactiva; una vencida se borra ya, y el login crea una cuenta nueva.
 */
export async function prepareLogin(db: DbLike, patreonUserId: string, now = new Date()) {
  const [u] = await db.select().from(users).where(eq(users.patreonUserId, patreonUserId));
  if (!u) return "new" as const;
  const st = accountState(u, now);
  if (st === "purge_due") {
    await purgeAccount(db, u.id);
    return "purged" as const;
  }
  if (st === "deactivated") {
    await db.update(users).set({ deletedAt: null, updatedAt: sql`now()` }).where(eq(users.id, u.id));
    await recordAudit(db, { actorUserId: u.id, action: "account_reactivated", entityType: "user", entityId: u.id });
    return "reactivated" as const;
  }
  return "existing" as const;
}
