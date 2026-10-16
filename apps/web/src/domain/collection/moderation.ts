// Spec 012: moderación de álbumes públicos. Reglas puras; la hora llega como argumento.

export const MODERATION_REASONS = ["offensive_alias", "impersonation", "spam", "other"] as const;
export type ModerationReason = (typeof MODERATION_REASONS)[number];
export type ModerationState = "none" | "hidden" | "review_requested" | "review_rejected";

export const MAX_NOTE = 300;
/** RF-10: una petición de revisión cada 7 días como máximo. */
export const REVIEW_COOLDOWN_DAYS = 7;
const DAY = 86_400_000;

export const isModerationReason = (r: unknown): r is ModerationReason => MODERATION_REASONS.includes(r as ModerationReason);

/** RF-4: la nota del administrador es opcional y de hasta 300 caracteres. */
export function validateModerationNote(raw: string | null | undefined): { ok: true; value: string | null } | { ok: false; max: number } {
  const v = (raw ?? "").trim();
  if (v.length > MAX_NOTE) return { ok: false, max: MAX_NOTE };
  return { ok: true, value: v || null };
}

/** RF-5: un álbum se ve solo si su dueño lo hizo público y no está oculto por moderación. */
export function isAlbumVisible(a: { isPublic: boolean; moderation: ModerationState }) {
  return a.isPublic && a.moderation === "none";
}

export type ReviewCheck = { ok: true } | { ok: false; code: "not_hidden" | "same_alias" | "review_pending" } | { ok: false; code: "review_too_soon"; until: Date };

/** RF-8 a RF-10: ¿puede el dueño pedir revisión con este alias? */
export function canRequestReview(
  a: { moderation: ModerationState; alias: string; reviewRequestedAt: Date | null },
  newAlias: string,
  now: Date,
): ReviewCheck {
  if (a.moderation === "none") return { ok: false, code: "not_hidden" };
  if (a.moderation === "review_requested") return { ok: false, code: "review_pending" };
  if (a.reviewRequestedAt) {
    const until = new Date(a.reviewRequestedAt.getTime() + REVIEW_COOLDOWN_DAYS * DAY);
    if (now < until) return { ok: false, code: "review_too_soon", until };
  }
  const norm = (s: string) => s.trim().toLowerCase();
  if (norm(newAlias) === norm(a.alias)) return { ok: false, code: "same_alias" };
  return { ok: true };
}
