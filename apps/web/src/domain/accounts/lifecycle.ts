// Spec 001, RF-22 a RF-25: una cuenta desactivada se puede recuperar durante 30 días. Puro.
export const RECOVERY_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export type AccountState = "active" | "deactivated" | "purge_due" | "purged";

export function accountState(u: { deletedAt: Date | null; purgedAt: Date | null }, now: Date): AccountState {
  if (u.purgedAt) return "purged";
  if (!u.deletedAt) return "active";
  return now.getTime() - u.deletedAt.getTime() >= RECOVERY_DAYS * DAY_MS ? "purge_due" : "deactivated";
}

/** Fecha a partir de la cual se borra de forma definitiva. */
export function purgeDate(deletedAt: Date) {
  return new Date(deletedAt.getTime() + RECOVERY_DAYS * DAY_MS);
}
