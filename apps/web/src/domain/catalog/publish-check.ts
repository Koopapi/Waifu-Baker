// RF-6 y RF-7: todas las comprobaciones antes de publicar, devueltas a la vez y enlazadas.
import { RARITY_LABEL, rarityGaps, type Rarity } from "./card-rules";
import { validateOdds, type Problem, type Slot } from "./odds";

export interface PublishInput {
  isAdult: boolean;
  packSize: number;
  slots: Partial<Slot>[];
  holoChance: number;
  cards: {
    id: string;
    number: number;
    name: string;
    characterId: string | null;
    rarity: Rarity | null;
    keyFull: string | null;
    adultReviewedAt: Date | null;
    pendingOriginalKey: string | null;
  }[];
}

const pad = (n: number) => String(n).padStart(3, "0");

export function publishProblems(input: PublishInput): Problem[] {
  const out: Problem[] = [];
  if (input.cards.length === 0) out.push({ code: "no_cards", message: "La colección no tiene cartas.", target: { kind: "set" } });
  out.push(...validateOdds(input.slots, input.packSize, input.holoChance));
  for (const rarity of rarityGaps(input.cards, input.slots)) {
    out.push({
      code: "rarity_without_cards",
      message: `${RARITY_LABEL[rarity]}: tiene probabilidad en el sobre pero ninguna carta.`,
      target: { kind: "rarity", rarity },
    });
  }
  for (const c of [...input.cards].sort((a, b) => a.number - b.number)) {
    const target = { kind: "card" as const, id: c.id, number: c.number };
    const missing = [!c.characterId && "personaje", !c.name.trim() && "nombre", !c.rarity && "rareza", !c.keyFull && "imagen compuesta"].filter(Boolean);
    if (missing.length) out.push({ code: "card_incomplete", message: `Carta ${pad(c.number)}: falta ${missing.join(", ")}.`, target });
    if (!input.isAdult) continue;
    if (c.pendingOriginalKey) {
      out.push({ code: "card_pending_art", message: `Carta ${pad(c.number)}: tiene arte nuevo pendiente de revisión.`, target });
    } else if (!c.adultReviewedAt) {
      out.push({ code: "card_unreviewed", message: `Carta ${pad(c.number)}: falta la revisión «personaje claramente adulto».`, target });
    }
  }
  return out;
}
