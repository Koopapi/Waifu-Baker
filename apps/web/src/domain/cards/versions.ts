// Spec 027, RF-17 a RF-25: versiones de una carta. Reglas puras: qué guarda una versión (la ficha y las capas), qué
// cambió entre dos fotos y cuántas se conservan por carta.
import type { Rarity } from "@/domain/catalog/card-rules";
import { stableJson } from "./layers-rarity";
import type { LayersConfig } from "./layers";

/** RF-18: se conservan las últimas 10 versiones de cada carta. */
export const MAX_VERSIONS = 10;

export type CardVariant = "normal" | "holo" | "alt";

/** La ficha de la carta tal como la edita la ventana (lo demás de la carta no se versiona). */
export interface CardSheet {
  name: string;
  flavorText: string;
  characterId: string | null;
  rarity: Rarity | null;
  variant: CardVariant;
}

/** Lo que cambió en un guardado (RF-19). Spec 038, RF-10: `rareza` = el sello pasó a los nombres nuevos de rareza. */
export const CHANGED_PARTS = ["ficha", "capas", "ambas", "rareza"] as const;
export type ChangedPart = (typeof CHANGED_PARTS)[number];

export interface CardSnapshot {
  ficha: CardSheet;
  layers: LayersConfig | null;
}

export const sheetOf = (c: CardSheet): CardSheet => ({ name: c.name, flavorText: c.flavorText, characterId: c.characterId, rarity: c.rarity, variant: c.variant });

export const sameSheet = (a: CardSheet, b: CardSheet) => stableJson(sheetOf(a)) === stableJson(sheetOf(b));
export const sameLayers = (a: LayersConfig | null | undefined, b: LayersConfig | null | undefined) => stableJson(a ?? null) === stableJson(b ?? null);
export const sameSnapshot = (a: CardSnapshot, b: CardSnapshot) => sameSheet(a.ficha, b.ficha) && sameLayers(a.layers, b.layers);

/** Qué cambió de una foto a la siguiente; si nada cambió se registra como «ficha» (un guardado sin cambios). */
export function changedParts(prev: CardSnapshot, next: CardSnapshot): ChangedPart {
  const ficha = !sameSheet(prev.ficha, next.ficha);
  const capas = !sameLayers(prev.layers, next.layers);
  return ficha && capas ? "ambas" : capas ? "capas" : "ficha";
}

/** RF-18 y RF-21: los números de versión que sobran (las más antiguas) cuando hay más de `keep`. */
export function versionsToPrune(numbers: number[], keep = MAX_VERSIONS): number[] {
  return [...numbers].sort((a, b) => b - a).slice(keep);
}
