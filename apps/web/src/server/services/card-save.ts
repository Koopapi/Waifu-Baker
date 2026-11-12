// Spec 027, RF-1, RF-2 y RF-17 a RF-25: el guardado único de la carta (ficha y capas en una sola transacción) y sus
// versiones. `updateCard` (ficha) y `saveCardLayers`/`removeCardLayers` (capas) son envoltorios de `saveCard`.
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { cards, cardVersions, sets, users } from "@/db/schema";
import { isCardComplete } from "@/domain/catalog/card-rules";
import { rarityTier } from "@/domain/catalog/rarity-tier";
import { characterLayer, imageKeys, isTempKey, repeatedImages, type LayersConfig } from "@/domain/cards/layers";
import { settleAutoStyle } from "@/domain/cards/layers-rarity";
import { changedParts, sheetOf, versionsToPrune, type CardSheet, type ChangedPart } from "@/domain/cards/versions";
import { composeCard } from "@/server/cards/compose";
import { renderCardFlat, storeFlat } from "@/server/cards/flat-store";
import type { CardStore } from "@/server/ports/card-store";
import type { DbLike } from "@/server/db-types";
import { AdminError } from "@/server/errors";
import { auditChange, recordAudit } from "./audit";
import { getCardDefaults } from "./settings";
import {
  applyPatch,
  characterRequired,
  composeAndStore,
  toPendingKeys,
  composedKeys,
  deleteUnusedFlat,
  needsRecompose,
  pendingFlatKeys,
  pick,
  releaseLayerImages,
  retierIfLayered,
  settleKeys,
  staleVersion,
  validConfig,
  type CardPatch,
  type CardRow,
} from "./card-shared";

export interface SaveCardInput {
  /** Cambios de la ficha (nombre, texto, personaje, rareza, variante). */
  ficha?: CardPatch;
  /** La configuración de capas tal como la envía la ventana; `null` quita las capas; sin el campo, no se tocan. */
  layers?: unknown;
  expectedVersion: number;
  /** Guardar aunque otro administrador haya guardado antes (confirmado en la ventana, spec 016 RF-18). */
  force?: boolean;
  /** RF-20 y RF-24: los cambios vienen de «Volver a esta versión». */
  restoredFrom?: number;
}

export interface SaveCardResult {
  card: CardRow;
  /** Spec 016, RF-39: imágenes que aparecen dos veces en la carta (se guarda igual). */
  repeated: string[];
  /** Spec 018, RF-18: el cambio de capas quedó pendiente de revisión 18+. */
  pending: boolean;
  /** Spec 016, RF-25: queda un sello de imagen que ya no encaja con la rareza nueva. */
  layersSealToReview: boolean;
  changed: ChangedPart;
  /** El número de la versión creada (RF-17). */
  versionNumber: number;
}

const isString = (k: string | null): k is string => Boolean(k);

/**
 * RF-1 y RF-2: guarda la ficha y las capas en una sola transacción; si algo no es válido (ficha, capas o conflicto de
 * edición), nada cambia. La imagen fija se saca antes de escribir (spec 018, RF-3 y RF-4). Cada guardado crea una
 * versión (RF-17) y queda en la auditoría con su número (RF-24).
 */
export async function saveCard(db: DbLike, store: CardStore, actorUserId: string, cardId: string, input: SaveCardInput): Promise<SaveCardResult> {
  const touchesLayers = input.layers !== undefined;
  const removes = input.layers === null;
  // Lo que no sea una configuración válida se rechaza antes de tocar nada.
  const requested = touchesLayers && !removes ? validConfig(input.layers) : null;
  let release: string[] = [];
  let oldFlat: (string | null)[] = [];
  let setId = "";
  let repeated: string[] = [];
  let sealToReview = false;
  let pending = false;
  let changed: ChangedPart = "ficha";
  let versionNumber = 0;

  const card = await db.transaction(async (tx) => {
    const [cur] = await tx.select().from(cards).where(eq(cards.id, cardId)).for("update");
    if (!cur) throw new AdminError("not_found", "La carta no existe.", { entity: "card" });
    const stale = cur.version !== input.expectedVersion;
    if (stale && !input.force) throw staleVersion();
    const [set] = await tx.select().from(sets).where(eq(sets.id, cur.setId));
    setId = cur.setId;
    const next = applyPatch(cur, input.ficha ?? {}, set.status);
    // Spec 018, RF-18: en una colección 18+ publicada el cambio de capas queda pendiente; se edita sobre lo pendiente.
    const pendingMode = set.isAdult && set.status !== "draft";
    // Spec 028, RF-2 y RF-3: el estilo de la rareza lleva el sello y el borde por defecto vigentes.
    const defaults = await getCardDefaults(tx);
    let change: Partial<CardRow> = { ...next };
    let before: LayersConfig | null = cur.layers;
    let after: LayersConfig | null = cur.layers;

    if (!touchesLayers) {
      // Solo la ficha: como siempre, el estilo sigue a la rareza nueva y la imagen fija se regenera si cambia el marco.
      const retier = retierIfLayered(cur, next.rarity, defaults);
      sealToReview = retier.sealToReview;
      if (needsRecompose(cur, next)) {
        const keys = await composeAndStore(store, { ...cur, ...next, ...retier.patch }, set.code);
        oldFlat = composedKeys(cur);
        change = { ...change, ...keys };
      }
      change = { ...change, ...retier.patch };
      after = retier.patch.layers ?? cur.layers;
    } else if (removes) {
      // Spec 016, RF-18, RF-67 y RF-68 y spec 017, RF-5: quitar las capas vuelve a la imagen compuesta del original.
      if (cur.layers && characterLayer(cur.layers)) throw characterRequired();
      if (!cur.originalKey) throw new AdminError("layers_required", "Esta carta se creó desde capas: necesita al menos una capa de imagen visible.");
      const original = await store.get(cur.originalKey);
      if (!original) throw new AdminError("missing_original", "No se encontró la imagen original de la carta.", { what: "original" });
      const composed = await storeFlat(store, cur, await composeCard(original.body, { number: cur.number, rarity: next.rarity, setCode: set.code }));
      oldFlat = composedKeys(cur);
      release = imageKeys(cur.layers);
      change = { ...change, layers: null, ...composed };
      after = null;
    } else {
      const base = pendingMode ? (cur.layersPending ?? cur.layers) : cur.layers;
      validConfig(requested, base);
      // Spec 017, RF-13 y RF-14: el estilo automático se asienta con la rareza nueva (la de la ficha que se guarda).
      const config = settleAutoStyle(base, requested!, rarityTier(next.rarity), defaults);
      const flat = await renderCardFlat(store, config);
      const settled = await settleKeys(tx, store, cur.setId, config);
      const flatKeys = await storeFlat(store, cur, flat);
      before = base;
      after = settled.config;
      if (pendingMode) {
        release = [...imageKeys(cur.layersPending), ...settled.temps];
        oldFlat = pendingFlatKeys(cur.pendingKeys);
        change = { ...change, layersPending: settled.config, pendingKeys: toPendingKeys(flatKeys) };
        pending = true;
      } else {
        release = [...imageKeys(cur.layers), ...settled.temps];
        oldFlat = composedKeys(cur);
        change = { ...change, layers: settled.config, ...flatKeys };
      }
      repeated = repeatedImages(settled.config);
    }

    const merged = { ...cur, ...change };
    let row: CardRow;
    try {
      [row] = await tx
        .update(cards)
        .set({ ...change, status: isCardComplete(merged) ? "ready" : "draft", version: cur.version + 1, updatedAt: sql`now()` })
        .where(eq(cards.id, cardId))
        .returning();
    } catch (e) {
      if ((e as { code?: string }).code === "23503") throw new AdminError("not_found", "El personaje elegido ya no existe.", { entity: "chosen_character" });
      throw e;
    }

    // RF-17 y RF-23: la versión es la foto de lo guardado; en una 18+ publicada, la del cambio pendiente.
    changed = changedParts({ ficha: sheetOf(cur), layers: before }, { ficha: sheetOf(row), layers: after });
    const v = await insertVersion(tx, { cardId, ficha: sheetOf(row), layers: pending ? (row.layersPending ?? null) : (row.layers ?? null), changed, pending, actorUserId });
    versionNumber = v.number;
    release = [...release, ...v.releasedKeys];

    // RF-24: cada guardado (y cada vuelta a una versión) queda en la auditoría con el número de versión.
    const meta: Record<string, unknown> = { version: row.version, versionNumber: v.number, forced: Boolean(input.force && stale) };
    if (input.restoredFrom) meta.restoredFrom = input.restoredFrom;
    await auditChange(tx, { actorUserId, action: "card_update", entityType: "card", entityId: cardId, before: pick(cur), after: next, meta });
    if (touchesLayers) {
      await recordAudit(tx, {
        actorUserId,
        action: removes ? "card_layers_remove" : pendingMode ? "card_layers_pending" : cur.layers ? "card_layers_update" : "card_layers_add",
        entityType: "card",
        entityId: cardId,
        before: { layers: cur.layers },
        after: { layers: after },
        meta,
      });
    }
    return row;
  });

  await releaseLayerImages(db, store, setId, release);
  await deleteUnusedFlat(store, card, oldFlat.filter(isString));
  return { card, repeated, pending, layersSealToReview: sealToReview, changed, versionNumber };
}

/**
 * RF-17, RF-18 y RF-21: añade la versión siguiente de la carta y borra las que sobran de 10 (las más antiguas); las
 * versiones existentes nunca se reescriben. Devuelve las claves de imagen de las versiones borradas, para soltarlas
 * si ya nadie las usa (RF-22). Se llama con la carta bloqueada.
 */
export async function insertVersion(
  tx: DbLike,
  v: { cardId: string; ficha: CardSheet; layers: LayersConfig | null; changed: ChangedPart; pending: boolean; actorUserId: string | null },
): Promise<{ number: number; releasedKeys: string[] }> {
  const [last] = await tx.select({ n: cardVersions.number }).from(cardVersions).where(eq(cardVersions.cardId, v.cardId)).orderBy(desc(cardVersions.number)).limit(1);
  const number = (last?.n ?? 0) + 1;
  await tx.insert(cardVersions).values({ cardId: v.cardId, number, ficha: v.ficha, layers: v.layers, changed: v.changed, pending: v.pending, actorUserId: v.actorUserId });
  const all = await tx.select({ n: cardVersions.number, layers: cardVersions.layers }).from(cardVersions).where(eq(cardVersions.cardId, v.cardId));
  const prune = versionsToPrune(all.map((r) => r.n));
  if (prune.length === 0) return { number, releasedKeys: [] };
  await tx.delete(cardVersions).where(and(eq(cardVersions.cardId, v.cardId), inArray(cardVersions.number, prune)));
  return { number, releasedKeys: all.filter((r) => prune.includes(r.n)).flatMap((r) => imageKeys(r.layers)) };
}

export interface VersionSummary {
  number: number;
  createdAt: Date;
  /** Nombre de la cuenta que guardó, o null si ya no existe. */
  actorName: string | null;
  changed: ChangedPart;
  pending: boolean;
  /** La configuración de capas de la versión (claves del almacén), para la carta mini de la lista (RF-19). */
  layers: LayersConfig | null;
}

/** RF-19: las versiones conservadas de una carta, la más reciente primero. */
export async function listVersions(db: DbLike, cardId: string): Promise<VersionSummary[]> {
  const [card] = await db.select({ id: cards.id }).from(cards).where(eq(cards.id, cardId));
  if (!card) throw new AdminError("not_found", "La carta no existe.", { entity: "card" });
  const rows = await db
    .select({ number: cardVersions.number, createdAt: cardVersions.createdAt, changed: cardVersions.changed, pending: cardVersions.pending, actorName: users.displayName, layers: cardVersions.layers })
    .from(cardVersions)
    .leftJoin(users, eq(users.id, cardVersions.actorUserId))
    .where(eq(cardVersions.cardId, cardId))
    .orderBy(desc(cardVersions.number));
  return rows.map((r) => ({ number: r.number, createdAt: r.createdAt, changed: r.changed as ChangedPart, pending: r.pending, actorName: r.actorName || null, layers: r.layers ?? null }));
}

/** RF-20: la foto completa de una versión, para cargarla en la ventana como cambios sin guardar. */
export async function getVersion(db: DbLike, cardId: string, number: number) {
  const [row] = await db.select().from(cardVersions).where(and(eq(cardVersions.cardId, cardId), eq(cardVersions.number, number)));
  if (!row) throw new AdminError("not_found", "Esa versión ya no existe.", { entity: "version" });
  return { number: row.number, ficha: row.ficha, layers: row.layers ?? null, pending: row.pending, createdAt: row.createdAt };
}

const LAYER_KEY = /^(tmp\/layers|sets\/[^/]+\/layers|library)\/[0-9a-f-]+\.webp$/;

/** RF-16: de las claves de un borrador, cuáles ya no están en el almacén (se quitan esas capas al recuperarlo). */
export async function missingKeys(store: CardStore, keys: string[]): Promise<string[]> {
  const missing: string[] = [];
  for (const key of new Set(keys)) {
    if (!(isTempKey(key) || LAYER_KEY.test(key)) || !(await store.get(key))) missing.push(key);
  }
  return missing;
}
