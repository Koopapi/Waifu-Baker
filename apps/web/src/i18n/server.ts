import "server-only";
import { cookies } from "next/headers";
import { dictionaries, type Dict } from "./index";
import { LOCALE_COOKIE, normalizeLocale, type Locale } from "./locales";

/** RF-1: idioma de la petición; sin cookie (o con un valor raro), inglés. */
export async function getLocale(): Promise<Locale> {
  return normalizeLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}

/** Diccionario del idioma de la petición, para componentes de servidor, acciones y rutas. */
export async function getDict(): Promise<Dict> {
  return dictionaries[await getLocale()];
}
