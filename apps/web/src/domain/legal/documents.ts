// Spec 007: versiones de los documentos legales y quién debe aceptarlos. Puro.
/** Edad mínima por defecto; el administrador puede subirla a 18 (spec 010, RF-17). */
export const MIN_AGE = 16;
export const MIN_AGE_OPTIONS = [16, 18] as const;
export type MinAge = (typeof MIN_AGE_OPTIONS)[number];
export const isMinAge = (n: unknown): n is MinAge => MIN_AGE_OPTIONS.includes(n as MinAge);

export const LEGAL_DOCS = {
  terms: { version: 1, updated: "2026-10-15" },
  privacy: { version: 1, updated: "2026-10-15" },
  content: { version: 1, updated: "2026-10-15" },
} as const;
export type LegalDoc = keyof typeof LEGAL_DOCS;
export const LEGAL_DOC_IDS = Object.keys(LEGAL_DOCS) as LegalDoc[];

/** La versión de los términos que hay que aceptar. Cambiarla vuelve a pedir la aceptación (RF-3). */
export const TERMS_VERSION = LEGAL_DOCS.terms.version;

/**
 * RF-1 a RF-3: falta confirmar la edad o aceptar la versión vigente de los términos. Spec 010, RF-18:
 * también si confirmó una edad menor que la mínima vigente (las cuentas anteriores confirmaron 16).
 */
export function needsAcceptance(
  u: { ageConfirmedAt: Date | null; termsVersion: number | null; ageConfirmedMin?: number | null },
  current: number = TERMS_VERSION,
  minAge: number = MIN_AGE,
) {
  return !u.ageConfirmedAt || (u.termsVersion ?? 0) < current || (u.ageConfirmedMin ?? MIN_AGE) < minAge;
}

/** Solo rutas internas como destino tras aceptar (evita redirecciones a otros sitios). */
export function safeNext(next: string | null | undefined, fallback = "/sobres") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
