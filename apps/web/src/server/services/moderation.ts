import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { albums, auditLog, users } from "@/db/schema";
import { validateAlias } from "@/domain/collection/album-rules";
import { canRequestReview, isModerationReason, validateModerationNote, type ModerationReason } from "@/domain/collection/moderation";
import type { DbLike } from "@/server/db-types";
import { AppError } from "@/server/errors";
import { recordAudit } from "./audit";

// Spec 012: moderación de álbumes públicos (ocultar, pedir revisión, aprobar y rechazar).

async function albumOf(db: DbLike, userId: string) {
  const [a] = await db.select().from(albums).where(eq(albums.userId, userId));
  if (!a) throw new AppError("not_found", "El álbum no existe.", { entity: "album" });
  return a;
}

function note(raw: string | null | undefined) {
  const n = validateModerationNote(raw);
  if (!n.ok) throw new AppError("note_too_long", `La nota puede tener como mucho ${n.max} caracteres.`, { max: n.max });
  return n.value;
}

/** RF-4 a RF-6 y RF-13: oculta un álbum público con motivo y nota; no borra nada. */
export async function hideAlbum(db: DbLike, actorUserId: string, input: { userId: string; reason: ModerationReason; note?: string | null; now: Date }) {
  if (!isModerationReason(input.reason)) throw new AppError("invalid_moderation_reason", "Elige un motivo de la lista.");
  const n = note(input.note);
  const a = await albumOf(db, input.userId);
  if (a.moderation !== "none") throw new AppError("album_already_hidden", "Ese álbum ya está oculto.");
  await db
    .update(albums)
    .set({ moderation: "hidden", hiddenReason: input.reason, hiddenNote: n, hiddenAt: input.now, hiddenBy: actorUserId, reviewAlias: null, reviewNote: null, updatedAt: sql`now()` })
    .where(eq(albums.userId, input.userId));
  await recordAudit(db, { actorUserId, action: "album.hide", entityType: "album", entityId: input.userId, before: { alias: a.alias }, meta: { reason: input.reason, note: n } });
}

/** RF-8 a RF-10 y RF-13: el dueño propone un alias nuevo y pide que se revise. */
export async function requestReview(db: DbLike, userId: string, rawAlias: string, now: Date) {
  const alias = validateAlias(rawAlias);
  if (!alias.ok) throw new AppError("invalid_alias", alias.message, alias.params);
  const a = await albumOf(db, userId);
  const check = canRequestReview(a, alias.value, now);
  if (!check.ok) {
    if (check.code === "review_too_soon")
      throw new AppError("review_too_soon", "Ya pediste una revisión hace poco: podrás pedir otra más adelante.", { until: check.until.toISOString() });
    const msg = { not_hidden: "Tu álbum no está oculto.", same_alias: "Escribe un alias distinto del actual.", review_pending: "Ya hay una revisión pendiente." }[check.code];
    throw new AppError(check.code, msg);
  }
  await db.update(albums).set({ moderation: "review_requested", reviewAlias: alias.value, reviewRequestedAt: now, updatedAt: sql`now()` }).where(eq(albums.userId, userId));
  await recordAudit(db, { actorUserId: userId, action: "album.review_request", entityType: "album", entityId: userId, before: { alias: a.alias }, after: { alias: alias.value } });
}

/** Decide una revisión pendiente; si otro administrador ya la decidió, no cambia nada (caso límite). */
async function decide(db: DbLike, userId: string, set: Partial<typeof albums.$inferInsert>) {
  const [row] = await db
    .update(albums)
    .set({ ...set, updatedAt: sql`now()` })
    .where(and(eq(albums.userId, userId), eq(albums.moderation, "review_requested")))
    .returning();
  if (!row) throw new AppError("review_already_decided", "Esa revisión ya está decidida.");
  return row;
}

/** RF-11 y RF-13: aplica el alias propuesto y vuelve a publicar el álbum con su mismo enlace. */
export async function approveReview(db: DbLike, actorUserId: string, input: { userId: string; now: Date }) {
  const a = await albumOf(db, input.userId);
  await decide(db, input.userId, { moderation: "none", alias: a.reviewAlias ?? a.alias, reviewAlias: null, reviewNote: null, hiddenReason: null, hiddenNote: null });
  await recordAudit(db, { actorUserId, action: "album.review_approve", entityType: "album", entityId: input.userId, before: { alias: a.alias }, after: { alias: a.reviewAlias } });
}

/** RF-12 y RF-13: la mantiene oculta con una nota opcional para el dueño. */
export async function rejectReview(db: DbLike, actorUserId: string, input: { userId: string; note?: string | null; now: Date }) {
  const n = note(input.note);
  const a = await albumOf(db, input.userId);
  await decide(db, input.userId, { moderation: "review_rejected", reviewNote: n });
  await recordAudit(db, { actorUserId, action: "album.review_reject", entityType: "album", entityId: input.userId, before: { alias: a.alias }, after: { alias: a.reviewAlias }, meta: { note: n } });
}

/** RF-1 y RF-2: álbumes públicos y ocultos, con buscador por alias o dueño; los pendientes de revisión, primero. */
export async function listAlbumsForAdmin(db: DbLike, opts: { q?: string }) {
  const q = opts.q?.trim();
  const rows = await db
    .select({
      userId: albums.userId,
      alias: albums.alias,
      owner: users.displayName,
      slug: albums.slug,
      isPublic: albums.isPublic,
      moderation: albums.moderation,
      activatedAt: albums.activatedAt,
      reviewAlias: albums.reviewAlias,
      reviewRequestedAt: albums.reviewRequestedAt,
      hiddenReason: albums.hiddenReason,
    })
    .from(albums)
    .innerJoin(users, eq(users.id, albums.userId))
    .where(
      and(
        or(eq(albums.isPublic, true), sql`${albums.moderation} <> 'none'`),
        q ? or(ilike(albums.alias, `%${q}%`), ilike(users.displayName, `%${q}%`), ilike(albums.reviewAlias, `%${q}%`)) : undefined,
      ),
    )
    .orderBy(
      sql`case when ${albums.moderation} = 'review_requested' then 0 else 1 end`,
      asc(albums.reviewRequestedAt),
      desc(albums.activatedAt),
      asc(users.displayName),
    );
  return rows;
}

/** RF-3: historial de moderación de un álbum, del más reciente al más antiguo. */
export async function albumHistory(db: DbLike, userId: string) {
  const rows = await db
    .select({ action: auditLog.action, createdAt: auditLog.createdAt, actor: users.displayName, before: auditLog.before, after: auditLog.after, meta: auditLog.meta, id: auditLog.id })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.actorUserId))
    .where(and(eq(auditLog.entityType, "album"), eq(auditLog.entityId, userId)))
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id));
  return rows.map((r) => {
    const meta = (r.meta ?? {}) as { reason?: string; note?: string | null };
    return {
      action: r.action,
      at: r.createdAt,
      actor: r.actor ?? "—",
      reason: meta.reason ?? null,
      note: meta.note ?? null,
      aliasBefore: (r.before as { alias?: string } | null)?.alias ?? null,
      aliasAfter: (r.after as { alias?: string } | null)?.alias ?? null,
    };
  });
}
