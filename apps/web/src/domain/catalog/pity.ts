// RF-13 y RF-14: protección de mala suerte. N = sobres; con N−1 seguidos sin épica o superior,
// el siguiente la garantiza. N = 0 la desactiva.
import { RARITIES, type Rarity } from "./card-rules";

const EPIC_INDEX = RARITIES.indexOf("epic");

export const isEpicPlus = (r: Rarity) => RARITIES.indexOf(r) >= EPIC_INDEX;
export const EPIC_PLUS: Rarity[] = RARITIES.filter(isEpicPlus);

export function pityActive(packsSinceEpic: number, threshold: number): boolean {
  return threshold > 0 && packsSinceEpic >= threshold - 1;
}

export function nextPityCounter(packsSinceEpic: number, hadEpicPlus: boolean): number {
  return hadEpicPlus ? 0 : packsSinceEpic + 1;
}

/** Spec 028, RF-12 y RF-13: la garantía de EX de los sobres gold usa las mismas reglas con su propio contador. */
export const isEx = (r: Rarity) => r === "ex";
