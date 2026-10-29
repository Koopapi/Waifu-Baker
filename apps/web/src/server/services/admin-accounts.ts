// Spec 024, RF-14 a RF-21: administradores con usuario, contraseña y código por Telegram.
// El paso en curso (contraseña ya comprobada) viaja en una cookie `id.nonce`; en la base solo se guarda el hash del nonce.
import { createHash, randomBytes, randomInt } from "node:crypto";
import { and, desc, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { adminAccounts, adminLoginCodes, users } from "@/db/schema";
import {
  CODE_TTL_MS,
  LINK_TTL_MS,
  PENDING_MS,
  RESEND_WINDOW_MS,
  afterFailure,
  canSendCode,
  isLocked,
  looksLikeCode,
  normalizeCode,
  validPassword,
  validUsername,
} from "@/domain/auth/admin-login";
import { generatePassword, hashPassword, verifyPassword } from "@/server/auth/passwords";
import type { TelegramClient } from "@/server/ports/telegram";
import type { DbLike } from "@/server/db-types";
import { AdminError } from "@/server/errors";
import { recordAudit } from "./audit";

type Account = typeof adminAccounts.$inferSelect;
export type Next = "change" | "link" | "code";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
export const adminPatreonId = (username: string) => `admin:${username}`;

// ---------- comandos del servidor (RF-15, RF-21) ----------

/** RF-15: crea una cuenta con una contraseña aleatoria que hay que cambiar al entrar. Devuelve esa contraseña. */
export async function createAdminAccount(db: DbLike, usernameRaw: string): Promise<{ password: string }> {
  const username = usernameRaw.trim().toLowerCase();
  if (!validUsername(username)) throw new AdminError("invalid_username", "Usuario no válido: de 3 a 32 letras minúsculas, números, punto o guion.");
  const password = generatePassword();
  const passwordHash = await hashPassword(password);
  await db.transaction(async (tx) => {
    const [taken] = await tx.select({ id: adminAccounts.id }).from(adminAccounts).where(eq(adminAccounts.username, username));
    if (taken) throw new AdminError("username_taken", `Ya existe el administrador «${username}».`);
    const [user] = await tx
      .insert(users)
      .values({ patreonUserId: adminPatreonId(username), displayName: username, role: "admin" })
      .onConflictDoUpdate({ target: users.patreonUserId, set: { role: "admin" } })
      .returning();
    const [acc] = await tx.insert(adminAccounts).values({ userId: user.id, username, passwordHash, mustChangePassword: true }).returning();
    await recordAudit(tx, { actorUserId: null, action: "admin_account_create", entityType: "admin_account", entityId: acc.id, after: { username } });
  });
  return { password };
}

async function byUsername(db: DbLike, username: string) {
  const [acc] = await db.select().from(adminAccounts).where(eq(adminAccounts.username, username.trim().toLowerCase()));
  if (!acc) throw new AdminError("not_found", `No existe el administrador «${username}».`, { entity: "admin_account" });
  return acc;
}

/** RF-21: nueva contraseña aleatoria (a cambiar al entrar); también desbloquea. */
export async function resetAdminPassword(db: DbLike, username: string): Promise<{ password: string }> {
  const acc = await byUsername(db, username);
  const password = generatePassword();
  await db
    .update(adminAccounts)
    .set({ passwordHash: await hashPassword(password), mustChangePassword: true, failedAttempts: 0, lockedUntil: null, pendingHash: null, pendingUntil: null, updatedAt: new Date() })
    .where(eq(adminAccounts.id, acc.id));
  await recordAudit(db, { actorUserId: null, action: "admin_password_reset", entityType: "admin_account", entityId: acc.id });
  return { password };
}

/** RF-21: desvincula Telegram; al entrar, se vuelve a vincular. */
export async function resetAdminTelegram(db: DbLike, username: string) {
  const acc = await byUsername(db, username);
  await db
    .update(adminAccounts)
    .set({ telegramChatId: null, telegramLinkHash: null, telegramLinkExpiresAt: null, updatedAt: new Date() })
    .where(eq(adminAccounts.id, acc.id));
  await recordAudit(db, { actorUserId: null, action: "admin_telegram_reset", entityType: "admin_account", entityId: acc.id });
}

// ---------- inicio de sesión ----------

/** RF-19: un fallo más; al quinto seguido, bloqueo de 15 minutos anotado en el historial. */
async function fail(db: DbLike, acc: Account, now: Date): Promise<"invalid" | "locked"> {
  const r = afterFailure(acc.failedAttempts, now);
  await db
    .update(adminAccounts)
    .set({ failedAttempts: r.failures, lockedUntil: r.lockedUntil ?? acc.lockedUntil, ...(r.locked ? { pendingHash: null, pendingUntil: null } : {}), updatedAt: now })
    .where(eq(adminAccounts.id, acc.id));
  if (r.locked) {
    await recordAudit(db, { actorUserId: acc.userId, action: "admin_locked", entityType: "admin_account", entityId: acc.id, meta: { until: r.lockedUntil!.toISOString() } });
    return "locked";
  }
  return "invalid";
}

/** Siguiente paso tras la contraseña: cambiarla, vincular Telegram o poner el código. */
const nextOf = (acc: Pick<Account, "mustChangePassword" | "telegramChatId">): Next => (acc.mustChangePassword ? "change" : acc.telegramChatId ? "code" : "link");

/** El paso en curso de la cookie (`id.nonce`), si sigue vigente. */
async function pendingAccount(db: DbLike, pending: string, now: Date): Promise<Account | null> {
  const [id, nonce] = pending.split(".");
  if (!id || !nonce || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const [acc] = await db.select().from(adminAccounts).where(eq(adminAccounts.id, id));
  if (!acc || !acc.pendingHash || acc.pendingHash !== sha(nonce) || !acc.pendingUntil || acc.pendingUntil <= now || isLocked(acc.lockedUntil, now)) return null;
  return acc;
}

/** RF-16: enlace de un uso para vincular el Telegram de la cuenta con el bot. */
async function linkUrl(db: DbLike, tg: TelegramClient, acc: Account, now: Date) {
  const token = randomBytes(12).toString("hex");
  await db
    .update(adminAccounts)
    .set({ telegramLinkHash: sha(token), telegramLinkExpiresAt: new Date(now.getTime() + LINK_TTL_MS), updatedAt: now })
    .where(eq(adminAccounts.id, acc.id));
  return `https://t.me/${tg.botUsername}?start=${token}`;
}

export type StepResult =
  | { status: "invalid" | "locked" | "unavailable" }
  | { status: "ok"; pending: string; next: Next; linkUrl?: string };

/** RF-14: paso 1, usuario y contraseña. Usuario inexistente y contraseña mala responden igual. */
export async function startAdminLogin(db: DbLike, tg: TelegramClient | null, input: { username: string; password: string; now: Date }): Promise<StepResult> {
  if (!tg) return { status: "unavailable" };
  const [acc] = await db.select().from(adminAccounts).where(eq(adminAccounts.username, input.username.trim().toLowerCase()));
  if (!acc) {
    // Mismo coste que una contraseña comprobada, para no delatar qué usuarios existen.
    await verifyPassword(input.password, "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
    return { status: "invalid" };
  }
  if (isLocked(acc.lockedUntil, input.now)) return { status: "locked" };
  if (!(await verifyPassword(input.password, acc.passwordHash))) return { status: await fail(db, acc, input.now) };
  const nonce = randomBytes(24).toString("hex");
  await db
    .update(adminAccounts)
    .set({ pendingHash: sha(nonce), pendingUntil: new Date(input.now.getTime() + PENDING_MS), updatedAt: input.now })
    .where(eq(adminAccounts.id, acc.id));
  const next = nextOf(acc);
  const pending = `${acc.id}.${nonce}`;
  if (next === "link") return { status: "ok", pending, next, linkUrl: await linkUrl(db, tg, acc, input.now) };
  if (next === "code") {
    const sent = await sendCodeTo(db, tg, acc, input.now);
    if (sent !== "ok") return { status: "unavailable" };
  }
  return { status: "ok", pending, next };
}

/** Contraseña nueva (obligatoria tras crearla o restablecerla en el servidor). */
export async function changeAdminPassword(
  db: DbLike,
  tg: TelegramClient | null,
  input: { pending: string; newPassword: string; now: Date },
): Promise<StepResult | { status: "weak" }> {
  if (!tg) return { status: "unavailable" };
  const acc = await pendingAccount(db, input.pending, input.now);
  if (!acc || !acc.mustChangePassword) return { status: "invalid" };
  if (!validPassword(input.newPassword)) return { status: "weak" };
  if (await verifyPassword(input.newPassword, acc.passwordHash)) return { status: "weak" };
  await db
    .update(adminAccounts)
    .set({ passwordHash: await hashPassword(input.newPassword), mustChangePassword: false, updatedAt: input.now })
    .where(eq(adminAccounts.id, acc.id));
  await recordAudit(db, { actorUserId: acc.userId, action: "admin_password_change", entityType: "admin_account", entityId: acc.id });
  const updated = { ...acc, mustChangePassword: false };
  const next = nextOf(updated);
  if (next === "link") return { status: "ok", pending: input.pending, next, linkUrl: await linkUrl(db, tg, updated, input.now) };
  if ((await sendCodeTo(db, tg, updated, input.now)) !== "ok") return { status: "unavailable" };
  return { status: "ok", pending: input.pending, next };
}

/** RF-16: comprueba si el administrador ya abrió el enlace del bot; si sí, guarda su chat y le envía el código. */
export async function checkTelegramLink(
  db: DbLike,
  tg: TelegramClient | null,
  input: { pending: string; now: Date },
): Promise<{ status: "waiting" | "invalid" | "expired" | "unavailable" } | { status: "ok"; next: "code" }> {
  if (!tg) return { status: "unavailable" };
  const acc = await pendingAccount(db, input.pending, input.now);
  if (!acc || acc.mustChangePassword) return { status: "invalid" };
  if (acc.telegramChatId) return { status: "ok", next: "code" };
  if (!acc.telegramLinkHash || !acc.telegramLinkExpiresAt || acc.telegramLinkExpiresAt <= input.now) return { status: "expired" };
  let updates;
  try {
    updates = await tg.getUpdates();
  } catch {
    return { status: "unavailable" };
  }
  const hit = updates.find((u) => {
    const m = u.text.trim().match(/^\/start\s+([0-9a-f]{24})$/);
    return m && sha(m[1]) === acc.telegramLinkHash;
  });
  if (!hit) return { status: "waiting" };
  await db
    .update(adminAccounts)
    .set({ telegramChatId: hit.chatId, telegramLinkHash: null, telegramLinkExpiresAt: null, updatedAt: input.now })
    .where(eq(adminAccounts.id, acc.id));
  await recordAudit(db, { actorUserId: acc.userId, action: "admin_telegram_link", entityType: "admin_account", entityId: acc.id });
  await tg.sendMessage(hit.chatId, `Waifu Baker · Telegram vinculado a la cuenta de administrador «${acc.username}».`).catch(() => {});
  const sent = await sendCodeTo(db, tg, { ...acc, telegramChatId: hit.chatId }, input.now);
  return sent === "ok" ? { status: "ok", next: "code" } : { status: "unavailable" };
}

/** RF-17 y RF-18: genera y envía un código de 6 cifras (como mucho 4 cada 10 minutos). */
async function sendCodeTo(db: DbLike, tg: TelegramClient, acc: Account, now: Date): Promise<"ok" | "limit" | "unavailable"> {
  if (!acc.telegramChatId) return "unavailable";
  const recent = await db
    .select({ createdAt: adminLoginCodes.createdAt })
    .from(adminLoginCodes)
    .where(and(eq(adminLoginCodes.accountId, acc.id), gt(adminLoginCodes.createdAt, new Date(now.getTime() - RESEND_WINDOW_MS))));
  if (!canSendCode(recent.map((r) => r.createdAt), now)) return "limit";
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const [row] = await db
    .insert(adminLoginCodes)
    .values({ accountId: acc.id, codeHash: "", expiresAt: new Date(now.getTime() + CODE_TTL_MS), createdAt: now })
    .returning({ id: adminLoginCodes.id });
  await db.update(adminLoginCodes).set({ codeHash: sha(`${row.id}:${code}`) }).where(eq(adminLoginCodes.id, row.id));
  try {
    await tg.sendMessage(acc.telegramChatId, `Waifu Baker · tu código de acceso es ${code}. Caduca en 5 minutos. Si no fuiste tú, avisa al dueño.`);
  } catch {
    return "unavailable";
  }
  return "ok";
}

/** RF-18: pedir otro código. */
export async function resendAdminCode(db: DbLike, tg: TelegramClient | null, input: { pending: string; now: Date }) {
  if (!tg) return { status: "unavailable" as const };
  const acc = await pendingAccount(db, input.pending, input.now);
  if (!acc || acc.mustChangePassword || !acc.telegramChatId) return { status: "invalid" as const };
  return { status: await sendCodeTo(db, tg, acc, input.now) };
}

/** RF-14, RF-17 y RF-19: comprueba el código; si vale, termina el paso y devuelve la cuenta para abrir la sesión. */
export async function verifyAdminCode(
  db: DbLike,
  input: { pending: string; code: string; now: Date },
): Promise<{ status: "ok"; userId: string; username: string } | { status: "invalid" | "locked" | "expired" }> {
  const acc = await pendingAccount(db, input.pending, input.now);
  if (!acc || acc.mustChangePassword || !acc.telegramChatId) return { status: "expired" };
  const code = normalizeCode(input.code);
  const [last] = await db
    .select()
    .from(adminLoginCodes)
    .where(and(eq(adminLoginCodes.accountId, acc.id), isNull(adminLoginCodes.usedAt), gt(adminLoginCodes.expiresAt, input.now), isNotNull(adminLoginCodes.codeHash)))
    .orderBy(desc(adminLoginCodes.createdAt))
    .limit(1);
  if (!last) return { status: "expired" };
  if (!looksLikeCode(code) || sha(`${last.id}:${code}`) !== last.codeHash) return { status: await fail(db, acc, input.now) };
  await db.update(adminLoginCodes).set({ usedAt: input.now }).where(eq(adminLoginCodes.id, last.id));
  await db
    .update(adminAccounts)
    .set({ failedAttempts: 0, lockedUntil: null, pendingHash: null, pendingUntil: null, updatedAt: input.now })
    .where(eq(adminAccounts.id, acc.id));
  await recordAudit(db, { actorUserId: acc.userId, action: "admin_login", entityType: "admin_account", entityId: acc.id });
  return { status: "ok", userId: acc.userId, username: acc.username };
}

/** RF-24: aviso a todos los administradores con Telegram vinculado (copias que fallan, etc.). Nunca lanza. */
export async function notifyAdmins(db: DbLike, tg: TelegramClient | null, text: string) {
  if (!tg) return;
  const rows = await db.select({ chat: adminAccounts.telegramChatId }).from(adminAccounts).where(isNotNull(adminAccounts.telegramChatId));
  await Promise.all(rows.map((r) => tg.sendMessage(r.chat!, text).catch(() => {})));
}
