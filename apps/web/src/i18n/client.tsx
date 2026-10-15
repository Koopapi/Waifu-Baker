"use client";

import { createContext, useContext } from "react";
import { dictionaries, type Dict } from "./index";
import { DEFAULT_LOCALE, type Locale } from "./locales";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** El servidor solo pasa el idioma: los diccionarios tienen funciones y no viajan como props. */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Diccionario del idioma activo para componentes cliente. */
export function useT(): Dict {
  return dictionaries[useLocale()];
}
