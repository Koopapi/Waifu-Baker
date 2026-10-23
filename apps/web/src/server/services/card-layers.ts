import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { cards } from "@/db/schema";
import { settleAutoStyle } from "@/domain/cards/layers-rarity";
import { characterLayer, checkLayersConfig, imageKeys, isImageLayer, isImageSeal, isSetLayerKey, isTempKey, layerKey, repeatedImages, type LayersConfig } from "@/domain/cards/layers";
import type { CardStore } from "@/server/ports/card-store";
import type { DbLike } from "@/server/db-types";
import { AdminError } from "@/server/errors";
import { recordAudit } from "./audit";

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
 * una imagen repetida se guarde una sola vez (RF-40). Devuelve la configuración con las claves definitivas.
 */
async function settleKeys(store: CardStore, setId: string, config: LayersConfig): Promise<{ config: LayersConfig; temps: string[] }> {
  const map = new Map<string, string>();
  const temps: string[] = [];
  for (const key of new Set(imageKeys(config))) {
    if (isSetLayerKey(setId, key)) {
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

/** Borra las imágenes de capa que ya no usa ninguna carta de la colección (vigente ni pendiente). */
async function releaseLayerImages(db: DbLike, store: CardStore, setId: string, candidates: string[]) {
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
  let setId = "";
  const card = await db.transaction(async (tx) => {
    const [cur] = await tx.select().from(cards).where(eq(cards.id, cardId)).for("update");
    if (!cur) throw new AdminError("not_found", "La carta no existe.", { entity: "card" });
    if (cur.version !== input.expectedVersion && !input.force) throw staleVersion();
    validConfig(requested, cur.layers);
    setId = cur.setId;
    const settled = await settleKeys(store, cur.setId, settleAutoStyle(cur.layers, requested));
    temps = settled.temps;
    previous = cur.layers;
    const [updated] = await tx
      .update(cards)
      .set({ layers: settled.config, version: cur.version + 1, updatedAt: sql`now()` })
      .where(eq(cards.id, cardId))
      .returning();
    await recordAudit(tx, {
      actorUserId,
      action: cur.layers ? "card_layers_update" : "card_layers_add",
      entityType: "card",
      entityId: cardId,
      before: { layers: cur.layers },
      after: { layers: settled.config },
      meta: { forced: Boolean(input.force && cur.version !== input.expectedVersion) },
    });
    return updated;
  });
  await releaseLayerImages(db, store, setId, [...imageKeys(previous), ...temps]);
  return { card, repeated: repeatedImages(card.layers!) };
}

/**
 * RF-18, RF-67 y RF-68: quita todas las capas. Una carta con imagen original vuelve a verse con ella; una carta creada
 * desde capas no tiene original y no puede quedarse sin capas. Spec 017, RF-5: una carta con chica tampoco.
 */
export async function removeCardLayers(db: DbLike, store: CardStore, actorUserId: string, cardId: string, input: { expectedVersion: number; force?: boolean }) {
  let previous: LayersConfig | null = null;
  let setId = "";
  const card = await db.transaction(async (tx) => {
    const [cur] = await tx.select().from(cards).where(eq(cards.id, cardId)).for("update");
    if (!cur) throw new AdminError("not_found", "La carta no existe.", { entity: "card" });
    if (cur.version !== input.expectedVersion && !input.force) throw staleVersion();
    if (cur.layers && characterLayer(cur.layers)) throw characterRequired();
    if (!cur.originalKey) throw new AdminError("layers_required", "Esta carta se creó desde capas: necesita al menos una capa de imagen visible.");
    setId = cur.setId;
    previous = cur.layers;
    const [updated] = await tx.update(cards).set({ layers: null, version: cur.version + 1, updatedAt: sql`now()` }).where(eq(cards.id, cardId)).returning();
    await recordAudit(tx, { actorUserId, action: "card_layers_remove", entityType: "card", entityId: cardId, before: { layers: cur.layers }, after: { layers: null } });
    return updated;
  });
  await releaseLayerImages(db, store, setId, imageKeys(previous));
  return card;
}

/** RF-20: la configuración guardada y la versión de la carta, para recargar el editor tras un conflicto. */
export async function getCardLayers(db: DbLike, cardId: string) {
  const [cur] = await db.select({ layers: cards.layers, version: cards.version, originalKey: cards.originalKey }).from(cards).where(eq(cards.id, cardId));
  if (!cur) throw new AdminError("not_found", "La carta no existe.", { entity: "card" });
  return { layers: cur.layers, version: cur.version, hasOriginal: Boolean(cur.originalKey) };
}
