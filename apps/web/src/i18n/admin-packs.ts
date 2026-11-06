// Spec 030: textos del editor de sobres en los dos idiomas. Solo los importa el panel, así que no viajan a las páginas
// del coleccionista (el diccionario general sí viaja a todas).
import { adminPacks as en } from "./dictionaries/en/admin-packs";
import { adminPacks as es } from "./dictionaries/es/admin-packs";
import { useLocale } from "./client";
import type { Locale } from "./locales";

export const adminPacksDictionaries: Record<Locale, typeof en> = { en, es };

export function useAdminPacksT() {
  return adminPacksDictionaries[useLocale()];
}
