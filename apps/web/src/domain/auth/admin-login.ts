// Spec 024, RF-14 a RF-19: reglas del inicio de sesión de administradores. Puro (el reloj se pasa como argumento).

/** RF-19: fallos seguidos (contraseña o código) que bloquean al usuario. */
export const MAX_FAILURES = 5;
/** RF-19: duración del bloqueo. */
export const LOCK_MS = 15 * 60 * 1000;
/** RF-17: un código vale 5 minutos. */
export const CODE_TTL_MS = 5 * 60 * 1000;
/** RF-18: como mucho 3 reenvíos (4 códigos) cada 10 minutos. */
export const MAX_RESENDS = 3;
export const RESEND_WINDOW_MS = 10 * 60 * 1000;
/** Tras la contraseña, hay 10 minutos para terminar (vincular Telegram y poner el código). */
export const PENDING_MS = 10 * 60 * 1000;
/** El enlace para vincular Telegram vale 15 minutos. */
export const LINK_TTL_MS = 15 * 60 * 1000;
export const MIN_PASSWORD = 12;

export const isLocked = (lockedUntil: Date | null, now: Date) => Boolean(lockedUntil && lockedUntil.getTime() > now.getTime());

/** RF-19: suma un fallo; al quinto, bloquea 15 minutos y vuelve a contar desde cero. */
export function afterFailure(failures: number, now: Date): { failures: number; lockedUntil: Date | null; locked: boolean } {
  const next = failures + 1;
  if (next >= MAX_FAILURES) return { failures: 0, lockedUntil: new Date(now.getTime() + LOCK_MS), locked: true };
  return { failures: next, lockedUntil: null, locked: false };
}

/** RF-18: si se puede enviar otro código, según los enviados en los últimos 10 minutos. */
export function canSendCode(sentAt: Date[], now: Date): boolean {
  const recent = sentAt.filter((d) => now.getTime() - d.getTime() < RESEND_WINDOW_MS).length;
  return recent < 1 + MAX_RESENDS;
}

/** Usuario: minúsculas, números, punto, guion o guion bajo; de 3 a 32. */
export const validUsername = (u: string) => /^[a-z0-9._-]{3,32}$/.test(u);

/** Contraseña nueva: al menos 12 caracteres. */
export const validPassword = (p: string) => p.length >= MIN_PASSWORD && p.length <= 200;

/** RF-17: el código de 6 cifras escrito por la persona (admite espacios). */
export const normalizeCode = (c: string) => c.replace(/\s+/g, "");
export const looksLikeCode = (c: string) => /^\d{6}$/.test(normalizeCode(c));
