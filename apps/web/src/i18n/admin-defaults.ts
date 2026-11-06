// Spec 028: textos de los ajustes del panel en los dos idiomas. Solo los importa el panel, así que no viajan a las
// páginas del coleccionista (el diccionario general sí viaja a todas).
import { adminDefaults as en } from "./dictionaries/en/admin-defaults";
import { adminDefaults as es } from "./dictionaries/es/admin-defaults";
import { useLocale } from "./client";
import type { Locale } from "./locales";

export const adminDefaultsDictionaries: Record<Locale, typeof en> = { en, es };

export function useAdminDefaultsT() {
  return adminDefaultsDictionaries[useLocale()];
}
