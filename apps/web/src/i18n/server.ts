import "server-only";
import { cookies } from "next/headers";
import { dictionaries, type Dict } from "./index";
import { LOCALE_COOKIE, normalizeLocale, type Locale } from "./locales";
import { panelErrors as panelErrorsEn } from "./dictionaries/en/panel-errors";
import { panelErrors as panelErrorsEs } from "./dictionaries/es/panel-errors";

/** Errores del panel de capas que solo se traducen en el servidor (no viajan al navegador). */
export const panelErrors: Record<Locale, Dict["errors"]> = { en: panelErrorsEn, es: panelErrorsEs };

/** RF-1: idioma de la petición; sin cookie (o con un valor raro), inglés. */
export async function getLocale(): Promise<Locale> {
  return normalizeLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}

/** Diccionario del idioma de la petición, para componentes de servidor, acciones y rutas (con los errores del panel). */
export async function getDict(): Promise<Dict> {
  const locale = await getLocale();
  const dict = dictionaries[locale];
  return { ...dict, errors: { ...dict.errors, ...panelErrors[locale] } };
}
