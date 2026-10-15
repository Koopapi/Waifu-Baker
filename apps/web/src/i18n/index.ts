import { dict as en } from "./dictionaries/en";
import { dict as es } from "./dictionaries/es";
import type { Locale } from "./locales";

export type Dict = typeof en;

// El tipo obliga a que el español tenga exactamente las mismas claves que el inglés (RF-10).
const esChecked: Dict = es;

export const dictionaries: Record<Locale, Dict> = { en, es: esChecked };
export { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE, normalizeLocale, type Locale } from "./locales";
