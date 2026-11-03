// Spec 027, RF-10 a RF-16: el borrador de la ventana de la carta, que vive solo en el navegador del administrador.
// Reglas puras: su forma, cuánto dura y cómo se lee y se escribe en un almacén (localStorage o uno falso en los tests).
import { z } from "zod";
import { RARITIES } from "@/domain/catalog/card-rules";
import { layersConfigSchema } from "./layers";

/** RF-15: un borrador vive 5 días desde el último cambio. */
export const DRAFT_TTL_MS = 5 * 24 * 60 * 60 * 1000;
/** RF-10: el borrador se escribe poco después del último cambio (nunca en cada movimiento de un deslizador). */
export const DRAFT_WRITE_DELAY_MS = 500;

export const sheetSchema = z.object({
  name: z.string().max(60),
  flavorText: z.string(),
  characterId: z.string().uuid().nullable(),
  rarity: z.enum(RARITIES).nullable(),
  variant: z.enum(["normal", "holo", "alt"]),
});

export const draftSchema = z.object({
  cardId: z.string().uuid(),
  /** La versión de la carta sobre la que se hicieron los cambios (RF-14). */
  baseVersion: z.number().int().positive(),
  ficha: sheetSchema,
  layers: layersConfigSchema.nullable(),
  /** Cuándo se escribió (ms desde la época). */
  savedAt: z.number().int().nonnegative(),
  /** Si los cambios vienen de «Volver a esta versión» (RF-20, RF-24). */
  restoredFrom: z.number().int().positive().optional(),
});
export type CardDraft = z.infer<typeof draftSchema>;

export const draftKey = (cardId: string) => `wb:card-draft:${cardId}`;
export const isStaleDraft = (d: Pick<CardDraft, "savedAt">, now: number) => now - d.savedAt > DRAFT_TTL_MS;

/** El borrador guardado para esa carta, o nada si no lo hay, no es válido, es de otra carta o caducó. */
export function parseDraft(raw: string | null | undefined, cardId: string, now: number): CardDraft | null {
  if (!raw) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = draftSchema.safeParse(json);
  if (!parsed.success || parsed.data.cardId !== cardId || isStaleDraft(parsed.data, now)) return null;
  return parsed.data;
}

/** Lo mínimo de `localStorage` que usa el borrador. */
export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Lee el borrador; `available` es false si el navegador no deja usar el almacén (modo privado, cupo lleno). */
export function readDraft(storage: DraftStorage | null | undefined, cardId: string, now: number): { draft: CardDraft | null; available: boolean } {
  try {
    if (!storage) return { draft: null, available: false };
    const draft = parseDraft(storage.getItem(draftKey(cardId)), cardId, now);
    if (!draft) storage.removeItem(draftKey(cardId));
    return { draft, available: true };
  } catch {
    return { draft: null, available: false };
  }
}

/** Escribe el borrador; devuelve false si el almacén no lo acepta (la ventana sigue funcionando sin borrador). */
export function writeDraft(storage: DraftStorage | null | undefined, draft: CardDraft): boolean {
  try {
    if (!storage) return false;
    storage.setItem(draftKey(draft.cardId), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

/** RF-13: borra el borrador de esa carta (al guardar o descartar). */
export function clearDraft(storage: DraftStorage | null | undefined, cardId: string): boolean {
  try {
    if (!storage) return false;
    storage.removeItem(draftKey(cardId));
    return true;
  } catch {
    return false;
  }
}
