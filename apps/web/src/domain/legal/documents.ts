// Spec 007: versiones de los documentos legales y quién debe aceptarlos. Puro.
export const MIN_AGE = 16;

export const LEGAL_DOCS = {
  terms: { version: 1, updated: "2026-10-15" },
  privacy: { version: 1, updated: "2026-10-15" },
  content: { version: 1, updated: "2026-10-15" },
} as const;
export type LegalDoc = keyof typeof LEGAL_DOCS;
export const LEGAL_DOC_IDS = Object.keys(LEGAL_DOCS) as LegalDoc[];

/** La versión de los términos que hay que aceptar. Cambiarla vuelve a pedir la aceptación (RF-3). */
export const TERMS_VERSION = LEGAL_DOCS.terms.version;

/** RF-1 a RF-3: falta confirmar la edad o aceptar la versión vigente de los términos. */
export function needsAcceptance(u: { ageConfirmedAt: Date | null; termsVersion: number | null }, current: number = TERMS_VERSION) {
  return !u.ageConfirmedAt || (u.termsVersion ?? 0) < current;
}

/** Solo rutas internas como destino tras aceptar (evita redirecciones a otros sitios). */
export function safeNext(next: string | null | undefined, fallback = "/sobres") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
