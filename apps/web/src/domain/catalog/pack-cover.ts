// Spec 014, RF-5 y RF-6: qué ilustración va en la portada del sobre de una colección.
import { RARITIES, type Rarity } from "./card-rules";

interface CoverCandidate {
  id: string;
  number: number;
  rarity: Rarity | null;
}

/** La elegida por el administrador si sigue en la colección con rareza; si no, la de mayor rareza (y menor número). */
export function resolveCover(cards: readonly CoverCandidate[], chosenId: string | null): string | null {
  const valid = cards.filter((c) => c.rarity !== null);
  if (chosenId && valid.some((c) => c.id === chosenId)) return chosenId;
  const best = [...valid].sort((a, b) => RARITIES.indexOf(b.rarity!) - RARITIES.indexOf(a.rarity!) || a.number - b.number)[0];
  return best?.id ?? null;
}
