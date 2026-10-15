// Spec 006, RF-1 a RF-3, RF-6 y RF-7: el álbum de una colección con sus huecos. Puro.
import type { Rarity } from "../catalog/card-rules";

export interface BinderCard {
  id: string;
  number: number;
  name: string;
  rarity: Rarity | null;
  flavorText: string;
}

export interface OwnedRow {
  cardId: string;
  holo: boolean;
  qty: number;
  firstObtainedAt: Date;
}

export interface OwnedSlot {
  cardId: string;
  name: string;
  rarity: Rarity | null;
  flavorText: string;
  qty: number;
  holoQty: number;
  firstObtainedAt: Date;
}

/** De una carta que falta solo se expone su número (RF-3). */
export interface BinderSlot {
  number: number;
  owned: OwnedSlot | null;
}

export function buildBinder(cards: BinderCard[], owned: OwnedRow[]) {
  const byCard = new Map<string, OwnedRow[]>();
  for (const o of owned) byCard.set(o.cardId, [...(byCard.get(o.cardId) ?? []), o]);
  const slots: BinderSlot[] = [...cards]
    .sort((a, b) => a.number - b.number)
    .map((c) => {
      const rows = byCard.get(c.id) ?? [];
      const qty = rows.filter((r) => !r.holo).reduce((a, r) => a + r.qty, 0);
      const holoQty = rows.filter((r) => r.holo).reduce((a, r) => a + r.qty, 0);
      if (qty + holoQty === 0) return { number: c.number, owned: null };
      const first = rows.map((r) => r.firstObtainedAt).sort((a, b) => a.getTime() - b.getTime())[0];
      return {
        number: c.number,
        owned: { cardId: c.id, name: c.name, rarity: c.rarity, flavorText: c.flavorText, qty, holoQty, firstObtainedAt: first },
      };
    });
  return { slots, progress: { owned: slots.filter((s) => s.owned).length, total: slots.length } };
}

export type BinderMode = "all" | "owned" | "missing" | "holo";

/** RF-7. El filtro por rareza solo afecta a las que se tienen (de las que faltan no se sabe). */
export function filterBinder(slots: BinderSlot[], f: { mode: BinderMode; rarity?: Rarity | null }) {
  return slots.filter((s) => {
    if (f.mode === "owned" && !s.owned) return false;
    if (f.mode === "missing" && s.owned) return false;
    if (f.mode === "holo" && !(s.owned && s.owned.holoQty > 0)) return false;
    if (f.rarity && s.owned?.rarity !== f.rarity) return false;
    return true;
  });
}
