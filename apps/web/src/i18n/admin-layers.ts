// Spec 016: textos del editor de cartas por capas en los dos idiomas. Solo lo importa el panel, así que no viajan a
// las páginas del coleccionista (el diccionario general sí viaja a todas).
import { adminLayers as en } from "./dictionaries/en/admin-layers";
import { adminLayers as es } from "./dictionaries/es/admin-layers";
import { useLocale } from "./client";
import type { Locale } from "./locales";

export const adminLayersDictionaries: Record<Locale, typeof en> = { en, es };

export function useAdminLayersT() {
  return adminLayersDictionaries[useLocale()];
}
