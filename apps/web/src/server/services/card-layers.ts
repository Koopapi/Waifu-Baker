import { eq, sql } from "drizzle-orm";
import { cards, sets } from "@/db/schema";
import { exportCreatorConfig } from "@/domain/cards/layers-io";
import { imageKeys } from "@/domain/cards/layers";
import type { CardStore } from "@/server/ports/card-store";
import type { DbLike } from "@/server/db-types";
import { AdminError } from "@/server/errors";
import { recordAudit } from "./audit";
import { saveCard } from "./card-save";
import { deleteUnusedFlat, pendingFlatKeys, releaseLayerImages, staleVersion, type CardRow } from "./card-shared";

export { releaseLayerImages };

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

/**
 * Spec 016, RF-12 a RF-18: guarda la configuración por capas de una carta. Si otro administrador guardó la carta
 * desde que se abrió el editor, avisa del conflicto salvo que se fuerce (RF-19 a RF-21); cada guardado queda en la
 * auditoría con los valores anteriores y nuevos (RF-2). Desde la spec 027 es el guardado único de la carta
 * (`saveCard`) solo con las capas.
 */
export async function saveCardLayers(db: DbLike, store: CardStore, actorUserId: string, cardId: string, input: SaveLayersInput): Promise<SaveLayersResult> {
  if (input.config === undefined || input.config === null) throw new AdminError("invalid_layers", "La configuración de capas no es válida.", { path: "" });
  const r = await saveCard(db, store, actorUserId, cardId, { layers: input.config, expectedVersion: input.expectedVersion, force: input.force });
  return { card: r.card, repeated: r.repeated };
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
 * desde capas no tiene original y no puede quedarse sin capas. Spec 017, RF-5: una carta con chica tampoco. Desde la
 * spec 027 pasa por el guardado único (`saveCard` con `layers: null`).
 */
export async function removeCardLayers(db: DbLike, store: CardStore, actorUserId: string, cardId: string, input: { expectedVersion: number; force?: boolean }) {
  const r = await saveCard(db, store, actorUserId, cardId, { layers: null, expectedVersion: input.expectedVersion, force: input.force });
  return r.card;
}

/** RF-20: la configuración guardada y la versión de la carta, para recargar el editor tras un conflicto. */
export async function getCardLayers(db: DbLike, cardId: string) {
  const [cur] = await db.select({ layers: cards.layers, pending: cards.layersPending, version: cards.version, originalKey: cards.originalKey }).from(cards).where(eq(cards.id, cardId));
  if (!cur) throw new AdminError("not_found", "La carta no existe.", { entity: "card" });
  // Spec 018, RF-18: si hay un cambio pendiente de revisión, el editor sigue sobre él.
  return { layers: cur.pending ?? cur.layers, pending: Boolean(cur.pending), version: cur.version, hasOriginal: Boolean(cur.originalKey) };
}

/**
 * Spec 017, RF-17: la carta en el formato del creador del paquete de diseño: `carta.json` con los nombres de archivo de sus capas y su
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
