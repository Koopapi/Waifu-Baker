import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { cookieLedger, packs, sets, userRewards, users } from "@/db/schema";
import { DAILY_SCHEDULE, checkDailyClaim, dailyAtRisk, dailyStatus, localDay, safeTimeZone } from "@/domain/rewards/daily";
import { FREE_MAX, currentFree, spendFree } from "@/domain/rewards/free-packs";
import type { DbLike } from "@/server/db-types";
import { AppError } from "@/server/errors";
import { recordAudit } from "./audit";

type Row = typeof userRewards.$inferSelect;

/** La fila de recompensas del usuario, creada al primer acceso con 1 carga (RF-3). */
async function lockRow(db: DbLike, userId: string, now: Date): Promise<Row> {
  await db.insert(userRewards).values({ userId, freeAnchor: now }).onConflictDoNothing();
  const [row] = await db.select().from(userRewards).where(eq(userRewards.userId, userId)).for("update");
  return row;
}

async function activeUser(db: DbLike, userId: string) {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u || u.deletedAt) throw new AppError("not_found", "El usuario no existe.", { entity: "user" });
  return u;
}

/**
 * RF-4, RF-7 y RF-9: solo colecciones gratuitas publicadas (spec 021, RF-4 a RF-6: lo gratis solo da gratis). También
 * para el sobre de Expediciones (spec 020).
 */
export async function claimableSet(db: DbLike, setId: string | null | undefined) {
  if (!setId) throw new AppError("choose_set", "Elige una colección.");
  const [s] = await db.select().from(sets).where(eq(sets.id, setId));
  if (!s || s.status !== "published" || s.isAdult || !s.isFree) throw new AppError("set_not_claimable", "Esa colección no es gratuita: elige otra.");
  return s;
}

/** Colecciones entre las que se puede elegir (RF-4, RF-7). */
export async function claimableSets(db: DbLike) {
  return db
    .select({ id: sets.id, code: sets.code, name: sets.name })
    .from(sets)
    .where(and(eq(sets.status, "published"), eq(sets.isAdult, false), eq(sets.isFree, true)))
    .orderBy(sets.code);
}

/** RF-5, RF-15 y RF-16: lo que ve el usuario. */
export async function rewardsSummary(db: DbLike, userId: string, opts: { now: Date; timeZone?: string | null }) {
  const row = await db.transaction((tx) => lockRow(tx, userId, opts.now));
  const free = currentFree({ charges: row.freeCharges, anchor: row.freeAnchor }, opts.now);
  const tz = safeTimeZone(opts.timeZone ?? row.lastTimeZone);
  const state = { streakDay: row.streakDay, lastDay: row.lastDailyDay, lastAt: row.lastDailyAt, lastTimeZone: row.lastTimeZone };
  const today = localDay(opts.now, tz);
  const daily = dailyStatus(state, today);
  return {
    free: { charges: free.charges, max: FREE_MAX, nextAt: free.nextAt },
    // Spec 015, RF-11: `atRisk` = día de gracia con una racha que perder.
    daily: { ...daily, atRisk: dailyAtRisk(state, today), schedule: DAILY_SCHEDULE },
    cookies: row.cookies,
  };
}

/** RF-4 a RF-7: gasta una carga y concede 1 sobre sellado de la colección elegida. */
export async function claimFreePack(db: DbLike, userId: string, input: { setId: string; now: Date }) {
  return db.transaction(async (tx) => {
    await activeUser(tx, userId);
    const set = await claimableSet(tx, input.setId);
    const row = await lockRow(tx, userId, input.now);
    const next = spendFree({ charges: row.freeCharges, anchor: row.freeAnchor }, input.now);
    if (!next) throw new AppError("no_free_charges", "Todavía no tienes sobres gratis: espera a que se cargue el siguiente.");
    await tx.update(userRewards).set({ freeCharges: next.charges, freeAnchor: next.anchor, updatedAt: sql`now()` }).where(eq(userRewards.userId, userId));
    const [pack] = await tx
      .insert(packs)
      .values({ userId, setId: set.id, source: "free", grantKey: `free:${userId}:${randomUUID()}`, reason: "free" })
      .returning({ id: packs.id });
    return { packId: pack.id, setId: set.id };
  });
}

/** RF-9 a RF-14: reclama la recompensa del día de racha que toque. */
export async function claimDaily(db: DbLike, userId: string, input: { now: Date; timeZone: string | null; setId?: string | null }) {
  return db.transaction(async (tx) => {
    await activeUser(tx, userId);
    const row = await lockRow(tx, userId, input.now);
    const tz = safeTimeZone(input.timeZone);
    const check = checkDailyClaim({ streakDay: row.streakDay, lastDay: row.lastDailyDay, lastAt: row.lastDailyAt, lastTimeZone: row.lastTimeZone }, input.now, tz);
    if (!check.ok) {
      throw check.code === "already_claimed_today"
        ? new AppError("already_claimed_today", "Ya reclamaste la recompensa de hoy. Vuelve mañana.")
        : new AppError("tz_change_too_soon", "Cambiaste de zona horaria hace poco: podrás reclamar cuando pasen 20 horas desde la última recompensa.");
    }
    const today = localDay(input.now, tz);
    let cookies = row.cookies;
    let packId: string | null = null;
    if (check.reward.kind === "cookies") {
      cookies += check.reward.amount;
      await tx.insert(cookieLedger).values({ userId, amount: check.reward.amount, reason: `daily:${check.day}` });
    } else {
      const set = await claimableSet(tx, input.setId);
      const [pack] = await tx
        .insert(packs)
        .values({ userId, setId: set.id, source: "daily", grantKey: `daily:${userId}:${today}`, reason: "daily:7" })
        .returning({ id: packs.id });
      packId = pack.id;
    }
    await tx
      .update(userRewards)
      .set({ streakDay: check.day, lastDailyDay: today, lastDailyAt: input.now, lastTimeZone: tz, cookies, updatedAt: sql`now()` })
      .where(eq(userRewards.userId, userId));
    return { day: check.day, reward: check.reward, cookies, packId };
  });
}

/** RF-16 y RF-18: historial de galletas, más recientes primero. */
export async function cookieHistory(db: DbLike, userId: string, limit = 50) {
  return db.select().from(cookieLedger).where(eq(cookieLedger.userId, userId)).orderBy(desc(cookieLedger.createdAt), desc(cookieLedger.id)).limit(limit);
}

/** RF-19 y RF-21: el administrador da o quita galletas con un motivo; el saldo nunca baja de cero. */
export async function adjustCookies(db: DbLike, actorUserId: string, input: { userId: string; amount: number; reason: string; now: Date }) {
  const reason = input.reason.trim();
  if (reason.length < 3 || reason.length > 200) throw new AppError("invalid_reason", "Escribe un motivo de 3 a 200 caracteres.", { min: 3, max: 200 });
  if (!Number.isInteger(input.amount) || input.amount === 0 || Math.abs(input.amount) > 100_000) {
    throw new AppError("invalid_cookie_amount", "La cantidad debe ser un número entero distinto de cero (máximo 100 000).", { max: 100000 });
  }
  return db.transaction(async (tx) => {
    await activeUser(tx, input.userId);
    const row = await lockRow(tx, input.userId, input.now);
    const balance = row.cookies + input.amount;
    if (balance < 0) throw new AppError("insufficient_cookies", "El saldo no puede quedar por debajo de cero.", { balance: row.cookies });
    await tx.update(userRewards).set({ cookies: balance, updatedAt: sql`now()` }).where(eq(userRewards.userId, input.userId));
    await tx.insert(cookieLedger).values({ userId: input.userId, amount: input.amount, reason: `admin: ${reason}`, actorUserId });
    await recordAudit(tx, { actorUserId, action: "cookies_adjusted", entityType: "user", entityId: input.userId, meta: { amount: input.amount, reason, balance } });
    return balance;
  });
}

/** Para la ficha del panel (RF-20). */
export async function rewardsForAdmin(db: DbLike, userId: string, now: Date) {
  const summary = await rewardsSummary(db, userId, { now });
  return { ...summary, history: await cookieHistory(db, userId, 20) };
}
