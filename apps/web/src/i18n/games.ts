// Spec 020: textos de Juegos y Expediciones en los dos idiomas. Solo los importan las páginas de juegos, la ficha de
// carta y el panel, así que no viajan al resto de páginas del coleccionista (el diccionario general sí).
import { games as en } from "./dictionaries/en/games";
import { games as es } from "./dictionaries/es/games";
import { useLocale } from "./client";
import type { Locale } from "./locales";

export const gamesDictionaries: Record<Locale, typeof en> = { en, es };
export type GamesDict = typeof en;

export function useGamesT() {
  return gamesDictionaries[useLocale()];
}

/** Pinta una frase del reporte con los nombres del equipo en el orden que guardó el servidor. */
export function renderPhrase(t: GamesDict, key: string, names: string[], order: number[], zone: string) {
  const tpl = t.phrases[key] ?? "";
  const at = (i: number) => names[order[i] ?? i] ?? names[0] ?? "";
  return tpl.replaceAll("{a}", at(0)).replaceAll("{b}", at(1)).replaceAll("{c}", at(2)).replaceAll("{zone}", zone);
}
