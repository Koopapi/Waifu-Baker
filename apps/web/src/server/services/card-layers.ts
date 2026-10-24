import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { cards, sets } from "@/db/schema";
import { exportCreatorConfig } from "@/domain/cards/layers-io";
import { settleAutoStyle } from "@/domain/cards/layers-rarity";
import { rarityTier } from "@/domain/catalog/rarity-tier";
import { characterLayer, checkLayersConfig, imageKeys, isImageLayer, isImageSeal, isSetLayerKey, isTempKey, layerKey, repeatedImages, type LayersConfig } from "@/domain/cards/layers";
import type { CardStore } from "@/server/ports/card-store";
import type { DbLike } from "@/server/db-types";
import { AdminError } from "@/server/errors";
import { recordAudit } from "./audit";
import { libraryKeysAmong } from "./library";
import { renderCardFlat, storeFlat } from "@/server/cards/flat-store";
import { composeCard } from "@/server/cards/compose";

type CardRow = typeof cards.$inferSelect;
const sha256 = (b: Buffer) => createHash("sha256").update(b).digest("hex");

export interface SaveLayersInput {
  /** La configuración tal como la envía el editor: claves de la colección o del área temporal. */
  config: unknown;
  expectedVersion: number;
  /** RF-21: guardar aunque otro administrador haya guardado antes (confirmado en el editor). */
  force?: boolean;
}

export interface SaveLayersResult {
  card: CardRow;
  /** RF-39: imágenes que aparecen dos veces en la carta (se guarda igual). */
  repeated: string[];
}

function staleVersion() {
  return new AdminError("stale_version", "La carta cambió desde que la abriste. Recarga para ver la versión actual.", { entity: "card" });
}

function characterRequired() {
  return new AdminError("character_required", "La chica (capa de personaje) no se puede quitar ni ocultar; puedes sustituirla.");
}

/** RF-17, RF-36, RF-37 y spec 017, RF-5: traduce el veredicto del dominio a un error de negocio. */
function validConfig(input: unknown, previous?: LayersConfig | null): LayersConfig {
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
 * una imagen repetida se guarde una sola vez (RF-40). Devuelve la configuración con las claves definitivas. Spec 017: las
 * imágenes de la biblioteca general se usan con su clave, sin copiarlas.
 */
async function settleKeys(db: DbLike, store: CardStore, setId: string, config: LayersConfig): Promise<{ config: LayersConfig; temps: string[] }> {
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
 * Borra las imágenes de capa que ya no usa ninguna carta de la colección (vigente ni pendiente). Las de la biblioteca
 * general (spec 017) no: se quitan desde la biblioteca.
 */
export async function releaseLayerImages(db: DbLike, store: CardStore, setId: string, keys: string[]) {
  const library = await libraryKeysAmong(db, keys);
  const candidates = keys.filter((k) => !library.has(k));
  if (candidates.length === 0) return;
  const rows = await db.select({ layers: cards.layers, pending: cards.layersPending }).from(cards).where(eq(cards.setId, setId));
  const used = new Set(rows.flatMap((r) => [...imageKeys(r.layers), ...imageKeys(r.pending)]));
  await Promise.all([...new Set(candidates)].filter((k) => !used.has(k)).map((k) => store.delete(k)));
}

/**
 * Spec 016, RF-12 a RF-18: guarda la configuración por capas de una carta. Si otro administrador guardó la carta
 * desde que se abrió el editor, avisa del conflicto salvo que se fuerce (RF-19 a RF-21); cada guardado queda en la
 * auditoría con los valores anteriores y nuevos (RF-2).
 */
export async function saveCardLayers(db: DbLike, store: CardStore, actorUserId: string, cardId: string, input: SaveLayersInput): Promise<SaveLayersResult> {
  const requested = validConfig(input.config);
  let previous: LayersConfig | null = null;
  let temps: string[] = [];
  let oldFlat: string[] = [];
  let setId = "";
  const card = await db.transaction(async (tx) => {
    const [cur] = await tx.select().from(cards).where(eq(cards.id, cardId)).for("update");
    if (!cur) throw new AdminError("not_found", "La carta no existe.", { entity: "card" });
    if (cur.version !== input.expectedVersion && !input.force) throw staleVersion();
    // Spec 018, RF-18: en una colección 18+ publicada, el cambio queda pendiente de revisión; se edita sobre lo pendiente.
    const [set] = await tx.select({ isAdult: sets.isAdult, status: sets.status }).from(sets).where(eq(sets.id, cur.setId));
    const pendingMode = set.isAdult && set.status !== "draft";
    const base = pendingMode ? (cur.layersPending ?? cur.layers) : cur.layers;
    validConfig(requested, base);
    setId = cur.setId;
    const config = settleAutoStyle(base, requested, rarityTier(cur.rarity));
    // Spec 018, RF-3 y RF-4: la imagen fija se saca antes de guardar nada; si falla, la carta no cambia.
    const flat = await renderCardFlat(store, config);
    const settled = await settleKeys(tx, store, cur.setId, config);
    temps = settled.temps;
    const flatKeys = await storeFlat(store, cur, flat);
    let change: Partial<CardRow>;
    if (pendingMode) {
      previous = cur.layersPending;
      oldFlat = pendingFlatKeys(cur.pendingKeys);
      change = { layersPending: settled.config, pendingKeys: { full: flatKeys.keyFull, mid: flatKeys.keyMid, thumb: flatKeys.keyThumb, public: flatKeys.keyPublic, blurhash: flatKeys.blurhash } };
    } else {
      previous = cur.layers;
      oldFlat = [cur.keyFull, cur.keyMid, cur.keyThumb, cur.keyPublic].filter((k): k is string => Boolean(k));
      change = { layers: settled.config, ...flatKeys };
    }
    const [updated] = await tx
      .update(cards)
      .set({ ...change, version: cur.version + 1, updatedAt: sql`now()` })
      .where(eq(cards.id, cardId))
      .returning();
    await recordAudit(tx, {
      actorUserId,
      action: pendingMode ? "card_layers_pending" : cur.layers ? "card_layers_update" : "card_layers_add",
      entityType: "card",
      entityId: cardId,
      before: { layers: cur.layers },
      after: { layers: settled.config },
      meta: { forced: Boolean(input.force && cur.version !== input.expectedVersion) },
    });
    return updated;
  });
  await releaseLayerImages(db, store, setId, [...imageKeys(previous), ...temps]);
  await deleteUnusedFlat(store, card, oldFlat);
  return { card, repeated: repeatedImages((card.layersPending ?? card.layers)!) };
}

/** Las claves de la imagen fija pendiente de revisión (spec 018). */
const pendingFlatKeys = (k: CardRow["pendingKeys"]) => (k ? [k.full, k.mid, k.thumb, k.public] : []);

/** Las imágenes fijas llevan el id de la carta en la clave: las que ya no usa ni lo vigente ni lo pendiente, se borran. */
async function deleteUnusedFlat(store: CardStore, card: CardRow, keys: string[]) {
  const inUse = new Set([card.keyFull, card.keyMid, card.keyThumb, card.keyPublic, ...pendingFlatKeys(card.pendingKeys)]);
  await Promise.all(keys.filter((k) => !inUse.has(k)).map((k) => store.delete(k)));
}

/** Spec 018, RF-20: descarta el cambio de capas pendiente de revisión; la carta sigue como estaba. */
export async function discardPendingLayers(db: DbLike, store: CardStore, actorUserId: string, cardId: string, input: { expectedVersion: number }) {
  let pending: CardRow | null = null;
  const card = await db.transaction(async (tx) => {
    const [cur] = await tx.select().from(cards).where(eq(cards.id, cardId)).for("update");
    if (!cur) throw new AdminError("not_found", "La carta no existe.", { entity: "card" });
    if (cur.version !== input.expectedVersion) throw staleVersion();
    if (!cur.layersPending) throw new AdminError("no_pending_layers", "Esta carta no tiene cambios de capas pendientes.");
    pending = cur;
    const [updated] = await tx.update(cards).set({ layersPending: null, pendingKeys: null, version: cur.version + 1, updatedAt: sql`now()` }).where(eq(cards.id, cardId)).returning();
    await recordAudit(tx, { actorUserId, action: "card_layers_discard", entityType: "card", entityId: cardId, before: { layers: cur.layersPending } });
    return updated;
  });
  const old = pending as CardRow | null;
  if (old) {
    await releaseLayerImages(db, store, old.setId, imageKeys(old.layersPending));
    await deleteUnusedFlat(store, card, pendingFlatKeys(old.pendingKeys));
  }
  return card;
}

/**
 * RF-18, RF-67 y RF-68: quita todas las capas. Una carta con imagen original vuelve a verse con ella; una carta creada
 * desde capas no tiene original y no puede quedarse sin capas. Spec 017, RF-5: una carta con chica tampoco.
 */
export async function removeCardLayers(db: DbLike, store: CardStore, actorUserId: string, cardId: string, input: { expectedVersion: number; force?: boolean }) {
  let previous: LayersConfig | null = null;
  let oldFlat: string[] = [];
  let setId = "";
  const card = await db.transaction(async (tx) => {
    const [cur] = await tx.select().from(cards).where(eq(cards.id, cardId)).for("update");
    if (!cur) throw new AdminError("not_found", "La carta no existe.", { entity: "card" });
    if (cur.version !== input.expectedVersion && !input.force) throw staleVersion();
    if (cur.layers && characterLayer(cur.layers)) throw characterRequired();
    if (!cur.originalKey) throw new AdminError("layers_required", "Esta carta se creó desde capas: necesita al menos una capa de imagen visible.");
    setId = cur.setId;
    previous = cur.layers;
    // Spec 016, RF-14 (cartas anteriores a la spec 017): vuelve a la imagen compuesta con el marco de Pencil.
    const original = await store.get(cur.originalKey);
    if (!original) throw new AdminError("missing_original", "No se encontró la imagen original de la carta.", { what: "original" });
    const [set] = await tx.select({ code: sets.code }).from(sets).where(eq(sets.id, cur.setId));
    const composed = await storeFlat(store, cur, await composeCard(original.body, { number: cur.number, rarity: cur.rarity, setCode: set.code }));
    oldFlat = [cur.keyFull, cur.keyMid, cur.keyThumb, cur.keyPublic].filter((k): k is string => Boolean(k));
    const [updated] = await tx.update(cards).set({ layers: null, ...composed, version: cur.version + 1, updatedAt: sql`now()` }).where(eq(cards.id, cardId)).returning();
    await recordAudit(tx, { actorUserId, action: "card_layers_remove", entityType: "card", entityId: cardId, before: { layers: cur.layers }, after: { layers: null } });
    return updated;
  });
  await releaseLayerImages(db, store, setId, imageKeys(previous));
  await deleteUnusedFlat(store, card, oldFlat);
  return card;
}

/** RF-20: la configuración guardada y la versión de la carta, para recargar el editor tras un conflicto. */
export async function getCardLayers(db: DbLike, cardId: string) {
  const [cur] = await db.select({ layers: cards.layers, pending: cards.layersPending, version: cards.version, originalKey: cards.originalKey }).from(cards).where(eq(cards.id, cardId));
  if (!cur) throw new AdminError("not_found", "La carta no existe.", { entity: "card" });
  // Spec 018, RF-18: si hay un cambio pendiente de revisión, el editor sigue sobre él.
  return { layers: cur.pending ?? cur.layers, pending: Boolean(cur.pending), version: cur.version, hasOriginal: Boolean(cur.originalKey) };
}

/**
 * Spec 017, RF-17: la carta en el formato del creador de Bruno: `carta.json` con los nombres de archivo de sus capas y su
 * encuadre, y cada imagen con ese nombre (para el ZIP de la descarga).
 */
export async function exportCardLayers(db: DbLike, store: CardStore, cardId: string) {
  const [row] = await db.select({ card: cards, code: sets.code }).from(cards).innerJoin(sets, eq(sets.id, cards.setId)).where(eq(cards.id, cardId));
  if (!row) throw new AdminError("not_found", "La carta no existe.", { entity: "card" });
  if (!row.card.layers) throw new AdminError("no_layers", "Esta carta todavía no tiene capas que exportar.");
  const id = `carta-${String(row.card.number).padStart(3, "0")}`;
  const { json, files } = exportCreatorConfig(row.card.layers, id);
  const images = await Promise.all(
    files.map(async (f) => {
      const file = await store.get(f.key);
      if (!file) throw new AdminError("layer_missing", "Una de las capas ya no está disponible.");
      return { name: f.name, body: file.body };
    }),
  );
  return { fileName: `${row.code}-${id}.zip`, files: [{ name: "carta.json", body: Buffer.from(JSON.stringify(json, null, 2)) }, ...images] };
}
