// RF-6 y RF-7: todas las comprobaciones antes de publicar, devueltas a la vez y enlazadas. Spec 017, RF-15 y RF-16: también
// que cada carta esté armada (chica y fondo visibles).
import { RARITY_LABEL, rarityGaps, type Rarity } from "./card-rules";
import { validateOdds, type Problem, type Slot } from "./odds";
import { missingParts, type LayersConfig } from "@/domain/cards/layers";

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
    /** Spec 017: configuración por capas (la carta tiene que estar armada). */
    layers: LayersConfig | null;
  }[];
}

const pad = (n: number) => String(n).padStart(3, "0");

/** Campos que le pueden faltar a una carta; los códigos van en `params.missing` (spec 008). */
type CardField = "character" | "name" | "rarity" | "image";
const FIELD_LABEL: Record<CardField, string> = { character: "personaje", name: "nombre", rarity: "rareza", image: "imagen compuesta" };

export function publishProblems(input: PublishInput): Problem[] {
  const out: Problem[] = [];
  if (input.cards.length === 0) out.push({ code: "no_cards", message: "La colección no tiene cartas.", target: { kind: "set" } });
  out.push(...validateOdds(input.slots, input.packSize, input.holoChance));
  for (const rarity of rarityGaps(input.cards, input.slots)) {
    out.push({
      code: "rarity_without_cards",
      message: `${RARITY_LABEL[rarity]}: tiene probabilidad en el sobre pero ninguna carta.`,
      target: { kind: "rarity", rarity },
      params: { rarity },
    });
  }
  for (const c of [...input.cards].sort((a, b) => a.number - b.number)) {
    const target = { kind: "card" as const, id: c.id, number: c.number };
    const missing = ([!c.characterId && "character", !c.name.trim() && "name", !c.rarity && "rarity", !c.keyFull && "image"] as const).filter(
      (f): f is CardField => Boolean(f),
    );
    if (missing.length) {
      out.push({
        code: "card_incomplete",
        message: `Carta ${pad(c.number)}: falta ${missing.map((f) => FIELD_LABEL[f]).join(", ")}.`,
        target,
        params: { number: c.number, missing: missing.join(",") },
      });
    }
    const parts = missingParts(c.layers);
    if (parts.length) {
      const labels = { personaje: "la chica", fondo: "el fondo" } as const;
      out.push({
        code: "card_not_assembled",
        message: `Carta ${pad(c.number)}: no está armada (falta ${parts.map((p) => labels[p]).join(" y ")}).`,
        target,
        params: { number: c.number, missing: parts.join(",") },
      });
    }
    if (!input.isAdult) continue;
    if (c.pendingOriginalKey) {
      out.push({ code: "card_pending_art", message: `Carta ${pad(c.number)}: tiene arte nuevo pendiente de revisión.`, target, params: { number: c.number } });
    } else if (!c.adultReviewedAt) {
      out.push({ code: "card_unreviewed", message: `Carta ${pad(c.number)}: falta la revisión «personaje claramente adulto».`, target, params: { number: c.number } });
    }
  }
  return out;
}
