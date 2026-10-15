// Spec 008, RF-1 y RF-4: idiomas disponibles y cookie donde se recuerda la elección. Puro.
export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "wb_locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Cualquier valor desconocido (o ausente) cae en inglés. */
export function normalizeLocale(value: string | null | undefined): Locale {
  return (LOCALES as readonly string[]).includes(value ?? "") ? (value as Locale) : DEFAULT_LOCALE;
}

/** Etiqueta BCP 47 para Intl (fechas y números). */
export const INTL_TAG: Record<Locale, string> = { en: "en-US", es: "es-ES" };
