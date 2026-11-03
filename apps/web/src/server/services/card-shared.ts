// Spec 027: lo que comparten el guardado único de la carta (card-save.ts), la edición de la ficha (cards.ts) y las
// capas (card-layers.ts): reglas de la ficha, imagen fija, asiento de claves y limpieza de imágenes.
import { createHash } from "node:crypto";
import { eq, inArray, or } from "drizzle-orm";
import { cards, cardVersions, sets } from "@/db/schema";
import { canEdit, type EditableField, type SetStatus } from "@/domain/catalog/collection-rules";
import type { Rarity } from "@/domain/catalog/card-rules";
import { rarityTier } from "@/domain/catalog/rarity-tier";
import { checkLayersConfig, imageKeys, isImageLayer, isImageSeal, isSetLayerKey, isTempKey, layerKey, type LayersConfig } from "@/domain/cards/layers";
import { retierLayers } from "@/domain/cards/layers-rarity";
import { composeCard, type CardSize } from "@/server/cards/compose";
import { renderCardFlat, storeFlat } from "@/server/cards/flat-store";
import type { CardStore } from "@/server/ports/card-store";
import type { DbLike } from "@/server/db-types";
import { AdminError } from "@/server/errors";
import { libraryKeysAmong } from "./library";

export type CardRow = typeof cards.$inferSelect;
export type Variant = CardRow["variant"];

export const sha256 = (b: Buffer) => createHash("sha256").update(b).digest("hex");

export async function lockSet(db: DbLike, setId: string) {
  const [set] = await db.select().from(sets).where(eq(sets.id, setId)).for("update");
  if (!set) throw new AdminError("not_found", "La colección no existe.", { entity: "set" });
  return set;
}

export function assertEditable(status: SetStatus, field: EditableField) {
  if (!canEdit(status, field)) {
    throw new AdminError("locked", "Esta colección ya está publicada: no se pueden añadir, quitar ni cambiar rarezas, variantes o números.", { what: "cards" });
  }
}

/**
 * La imagen que ve el coleccionista. Spec 018, RF-1 y RF-2: una carta por capas lleva su imagen fija (sacada de
 * carta-capas.js); solo una carta sin capas (anterior a la spec 017) se sigue componiendo con el marco de Pencil.
 * Las claves llevan la huella del contenido.
 */
export async function composeAndStore(store: CardStore, card: Pick<CardRow, "id" | "setId" | "number" | "rarity" | "originalKey" | "layers">, setCode: string) {
  if (card.layers) return storeFlat(store, card, await renderCardFlat(store, card.layers));
  const original = card.originalKey ? await store.get(card.originalKey) : null;
  if (!original) throw new AdminError("missing_original", "No se encontró la imagen original de la carta.", { what: "original" });
  let composed;
  try {
    composed = await composeCard(original.body, { number: card.number, rarity: card.rarity, setCode });
  } catch {
    throw new AdminError("unreadable", "No se pudo leer la imagen: el archivo parece dañado.");
  }
  const tag = sha256(composed.full).slice(0, 10);
  const keys = {} as Record<CardSize, string>;
  for (const size of ["full", "mid", "thumb", "public"] as const) {
    keys[size] = `sets/${card.setId}/cards/${card.id}/${size}.${tag}.webp`;
    await store.put(keys[size], composed[size]);
  }
  return { keyFull: keys.full, keyMid: keys.mid, keyThumb: keys.thumb, keyPublic: keys.public, blurhash: composed.blurhash };
}

/**
 * Borra imágenes que ya no se usan. Las claves llevan la huella del contenido, así que una imagen
 * recompuesta idéntica (p. ej. «sin rareza» → común, mismo marco) tiene la MISMA clave: nunca se
 * borra una clave que siga referenciada por alguna carta.
 */
export async function deleteKeys(store: CardStore, keys: (string | null | undefined)[], db?: DbLike) {
  let candidates = [...new Set(keys.filter((k): k is string => Boolean(k)))];
  if (db && candidates.length) {
    const inUse = await db
      .select({ a: cards.keyFull, b: cards.keyMid, c: cards.keyThumb, d: cards.keyPublic, e: cards.originalKey, f: cards.pendingOriginalKey })
      .from(cards)
      .where(
        or(
          inArray(cards.keyFull, candidates),
          inArray(cards.keyMid, candidates),
          inArray(cards.keyThumb, candidates),
          inArray(cards.keyPublic, candidates),
          inArray(cards.originalKey, candidates),
          inArray(cards.pendingOriginalKey, candidates),
        ),
      );
    const used = new Set(inUse.flatMap((r) => Object.values(r)).filter(Boolean));
    candidates = candidates.filter((k) => !used.has(k));
  }
  await Promise.all(candidates.map((k) => store.delete(k)));
}

export const composedKeys = (c: Pick<CardRow, "keyFull" | "keyMid" | "keyThumb" | "keyPublic">) => [c.keyFull, c.keyMid, c.keyThumb, c.keyPublic];

export interface CardPatch {
  name?: string;
  flavorText?: string;
  characterId?: string | null;
  rarity?: Rarity | null;
  variant?: Variant;
}

const FIELD_RULE: Record<keyof CardPatch, EditableField> = {
  name: "name",
  flavorText: "flavorText",
  characterId: "name",
  rarity: "rarity",
  variant: "variant",
};

/** La ficha nueva a partir de la actual y el parche, con las reglas de la colección (publicada: sin rareza ni variante). */
export function applyPatch(cur: CardRow, patch: CardPatch, status: SetStatus) {
  const next = {
    name: patch.name === undefined ? cur.name : patch.name.trim(),
    flavorText: patch.flavorText === undefined ? cur.flavorText : patch.flavorText.trim(),
    characterId: patch.characterId === undefined ? cur.characterId : patch.characterId,
    rarity: patch.rarity === undefined ? cur.rarity : patch.rarity,
    variant: patch.variant === undefined ? cur.variant : patch.variant,
  };
  if (next.name.length > 60) throw new AdminError("invalid_name", "El nombre de la carta admite hasta 60 caracteres.", { entity: "card", max: 60 });
  for (const key of Object.keys(FIELD_RULE) as (keyof CardPatch)[]) {
    if (next[key] !== cur[key]) assertEditable(status, FIELD_RULE[key]);
  }
  return next;
}

/**
 * Solo cambia la imagen si cambia el marco (rareza) o el número: la carta no lleva más texto. Spec 018: la carta por
 * capas no lleva número dibujado, así que solo la rareza la cambia.
 */
export const needsRecompose = (cur: CardRow, next: { rarity: Rarity | null; number?: number }) =>
  cur.rarity !== next.rarity || (!cur.layers && next.number !== undefined && cur.number !== next.number);

/**
 * Spec 016, RF-25: si cambia la rareza de una carta con capas, su marco y su sello de texto siguen al escalón nuevo.
 * Devuelve las columnas a cambiar y si queda un sello de imagen que hay que revisar a mano.
 */
export function retierIfLayered(cur: CardRow, rarity: Rarity | null): { patch: { layers?: LayersConfig }; sealToReview: boolean } {
  if (!cur.layers || !rarity || cur.rarity === rarity) return { patch: {}, sealToReview: false };
  const r = retierLayers(cur.layers as LayersConfig, rarityTier(rarity));
  return { patch: { layers: r.config }, sealToReview: r.imageSealToReview };
}

export const pick = (c: CardRow) => ({ name: c.name, flavorText: c.flavorText, characterId: c.characterId, rarity: c.rarity, variant: c.variant });

export const staleVersion = () => new AdminError("stale_version", "La carta cambió desde que la abriste. Recarga para ver la versión actual.", { entity: "card" });

export const characterRequired = () => new AdminError("character_required", "La chica (capa de personaje) no se puede quitar ni ocultar; puedes sustituirla.");

/** Spec 016, RF-17, RF-36, RF-37 y spec 017, RF-5: traduce el veredicto del dominio a un error de negocio. */
export function validConfig(input: unknown, previous?: LayersConfig | null): LayersConfig {
  const v = checkLayersConfig(input, previous);
  if (v.ok) return v.config;
  if (v.issue.code === "too_many_layers") throw new AdminError("too_many_layers", `Una carta admite como mucho ${v.issue.max} capas de imagen.`, { max: v.issue.max });
  if (v.issue.code === "no_visible_layer") throw new AdminError("no_visible_layer", "Hace falta al menos una capa de imagen visible.");
  if (v.issue.code === "two_characters") throw new AdminError("two_characters", "Una carta solo puede tener una chica (capa de personaje).");
  if (v.issue.code === "character_required") throw characterRequired();
  throw new AdminError("invalid_layers", "La configuración de capas no es válida.", { path: v.issue.path });
}

/**
 * Pasa cada imagen del área temporal a la colección (`sets/<setId>/layers/<sha>.webp`): la huella en la clave hace que
 * una imagen repetida se guarde una sola vez (spec 016, RF-40). Devuelve la configuración con las claves definitivas.
 * Spec 017: las imágenes de la biblioteca general se usan con su clave, sin copiarlas.
 */
export async function settleKeys(db: DbLike, store: CardStore, setId: string, config: LayersConfig): Promise<{ config: LayersConfig; temps: string[] }> {
  const map = new Map<string, string>();
  const temps: string[] = [];
  const library = await libraryKeysAmong(db, imageKeys(config));
  for (const key of new Set(imageKeys(config))) {
    if (isSetLayerKey(setId, key) || library.has(key)) {
      if (!(await store.get(key))) throw new AdminError("layer_missing", "Una de las capas ya no está disponible.");
      map.set(key, key);
    } else if (isTempKey(key)) {
      const file = await store.get(key);
      if (!file) throw new AdminError("layer_missing", "Una de las capas ya no está disponible.");
      const final = layerKey(setId, sha256(file.body));
      await store.put(final, file.body);
      map.set(key, final);
      temps.push(key);
    } else {
      throw new AdminError("invalid_layers", "La configuración de capas no es válida.", { path: "key" });
    }
  }
  const capas = config.capas.map((l) => (isImageLayer(l) ? { ...l, key: map.get(l.key)! } : l));
  const sello = isImageSeal(config.sello) ? { ...config.sello, key: map.get(config.sello.key)! } : config.sello;
  return { config: { ...config, capas, sello }, temps };
}

/**
 * Borra las imágenes de capa que ya no usa ninguna carta de la colección (vigente, pendiente ni ninguna de sus
 * versiones conservadas, spec 027 RF-22). Las de la biblioteca general (spec 017) no: se quitan desde la biblioteca.
 */
export async function releaseLayerImages(db: DbLike, store: CardStore, setId: string, keys: string[]) {
  const library = await libraryKeysAmong(db, keys);
  const candidates = keys.filter((k) => !library.has(k));
  if (candidates.length === 0) return;
  const rows = await db.select({ layers: cards.layers, pending: cards.layersPending }).from(cards).where(eq(cards.setId, setId));
  const versions = await db.select({ layers: cardVersions.layers }).from(cardVersions).innerJoin(cards, eq(cards.id, cardVersions.cardId)).where(eq(cards.setId, setId));
  const used = new Set([...rows.flatMap((r) => [...imageKeys(r.layers), ...imageKeys(r.pending)]), ...versions.flatMap((v) => imageKeys(v.layers))]);
  await Promise.all([...new Set(candidates)].filter((k) => !used.has(k)).map((k) => store.delete(k)));
}

/** Las claves de la imagen fija pendiente de revisión (spec 018). */
export const pendingFlatKeys = (k: CardRow["pendingKeys"]) => (k ? [k.full, k.mid, k.thumb, k.public] : []);

/** Las imágenes fijas llevan el id de la carta en la clave: las que ya no usa ni lo vigente ni lo pendiente, se borran. */
export async function deleteUnusedFlat(store: CardStore, card: CardRow, keys: (string | null)[]) {
  const inUse = new Set([card.keyFull, card.keyMid, card.keyThumb, card.keyPublic, ...pendingFlatKeys(card.pendingKeys)]);
  await Promise.all(keys.filter((k): k is string => Boolean(k) && !inUse.has(k)).map((k) => store.delete(k)));
}
