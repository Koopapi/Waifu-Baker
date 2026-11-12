import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { cards, cardVersions, characters, dropTables, sets } from "@/db/schema";
import { consecutiveNumbers, isCardComplete, rarityCounts, rarityGaps } from "@/domain/catalog/card-rules";
import { validateUpload } from "@/domain/catalog/upload-rules";
import { mapLimit } from "@/lib/map-limit";
import { regenerateCardFlat } from "./flat-regen";
import { drawPack } from "@/domain/catalog/draw";
import type { PackKind } from "@/domain/catalog/default-odds";
import { cryptoRng } from "@/server/rng";
import type { CardStore } from "@/server/ports/card-store";
import type { DbLike } from "@/server/db-types";
import { AdminError, isUniqueViolation } from "@/server/errors";
import { auditChange, recordAudit } from "./audit";
import { rarityTier } from "@/domain/catalog/rarity-tier";
import { configFromCharacter, replaceCharacter } from "@/domain/cards/layers-rarity";
import { characterLayer, imageKeys, layerKey } from "@/domain/cards/layers";
import { prepareCharacterImage } from "@/server/cards/character-images";
import { sheetOf } from "@/domain/cards/versions";
import { insertVersion, saveCard } from "./card-save";
import { getCardDefaults } from "./settings";
import {
  applyPatch,
  assertEditable,
  composeAndStore,
  composedKeys,
  deleteKeys,
  lockSet,
  needsRecompose,
  pendingFlatKeys,
  pick,
  releaseLayerImages,
  retierIfLayered,
  sha256,
  type CardPatch,
  type CardRow,
} from "./card-shared";
export type { CardPatch } from "./card-shared";

const COMPOSE_PARALLEL = 4;
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export interface UploadFile {
  body: Buffer;
  mime: string;
  filename: string;
}

/** RF-12: lee las dimensiones y aplica las reglas de subida. */
export async function inspectUpload(file: UploadFile) {
  let meta: { width: number | null; height: number | null } = { width: null, height: null };
  try {
    const m = await sharp(file.body).metadata();
    meta = { width: m.width ?? null, height: m.height ?? null };
  } catch {
    /* se rechaza abajo como ilegible */
  }
  const verdict = validateUpload({ mime: file.mime, bytes: file.body.length, width: meta.width });
  if (!verdict.ok) throw new AdminError(verdict.code, verdict.message, verdict.params);
  return meta;
}

/** Semilla estable de las partículas a partir de la huella de la imagen (1 a 2^31 − 2, como carta-capas.js). */
const seedFrom = (hash: string) => (parseInt(hash.slice(0, 8), 16) % 2_147_483_646) + 1;

/**
 * RF-11, RF-12, RF-13: una imagen → una carta en borrador, numerada y compuesta. Spec 017, RF-1 a RF-3: la imagen es la
 * chica recortada y la carta nace por capas, con ella como personaje y el estilo automático; `uncut` avisa si la imagen
 * no tiene transparencia.
 */
export async function uploadCardImage(db: DbLike, store: CardStore, actorUserId: string, setId: string, file: UploadFile) {
  const meta = await inspectUpload(file);
  const character = await prepareCharacterImage(file);
  const hash = sha256(file.body);
  const id = randomUUID();
  const originalKey = `sets/${setId}/original/${hash}.${EXT[file.mime]}`;
  const characterKey = layerKey(setId, sha256(character.body));

  let created: CardRow;
  let setCode: string;
  try {
    ({ created, setCode } = await db.transaction(async (tx) => {
      const set = await lockSet(tx, setId);
      assertEditable(set.status, "addCard");
      const [dup] = await tx
        .select({ number: cards.number })
        .from(cards)
        .where(and(eq(cards.setId, setId), eq(cards.originalSha256, hash)))
        .limit(1);
      if (dup) throw new AdminError("duplicate_image", `Esta imagen ya está en la colección (carta ${String(dup.number).padStart(3, "0")}).`, { number: dup.number });
      const [last] = await tx.select({ n: cards.number }).from(cards).where(eq(cards.setId, setId)).orderBy(desc(cards.number)).limit(1);
      // Spec 028, RF-1: con el sello y el borde por defecto vigentes.
      const defaults = await getCardDefaults(tx);
      const [row] = await tx
        .insert(cards)
        .values({ id, setId, number: (last?.n ?? 0) + 1, originalSha256: hash, originalKey, width: meta.width, height: meta.height, layers: configFromCharacter(characterKey, "n", seedFrom(hash), defaults) })
        .returning();
      await recordAudit(tx, {
        actorUserId,
        action: "card_upload",
        entityType: "card",
        entityId: id,
        after: { setId, number: row.number, filename: file.filename },
      });
      // Spec 027, RF-17: la carta nace con su versión 1 (a la que se puede volver).
      await insertVersion(tx, { cardId: id, ficha: sheetOf(row), layers: row.layers ?? null, changed: "ambas", pending: false, actorUserId });
      return { created: row, setCode: set.code };
    }));
  } catch (e) {
    if (isUniqueViolation(e)) throw new AdminError("duplicate_image", "Esta imagen ya está en la colección.");
    throw e;
  }

  await store.put(originalKey, file.body);
  await store.put(characterKey, character.body);
  try {
    // Hasta la spec 018, el coleccionista ve la imagen compuesta con el marco de Pencil a partir del original.
    const keys = await composeAndStore(store, created, setCode);
    const [done] = await db.update(cards).set(keys).where(eq(cards.id, id)).returning();
    return { ...done, uncut: character.uncut };
  } catch (e) {
    await db.delete(cards).where(eq(cards.id, id));
    await store.delete(originalKey);
    await releaseLayerImages(db, store, setId, [characterKey]);
    throw e;
  }
}

/**
 * RF-14 y RF-16: edita la ficha de una carta con control de versión y regenera la imagen si cambia lo que se ve. Desde la
 * spec 027 es el guardado único de la carta (`saveCard`) solo con la ficha: crea una versión y queda en la auditoría.
 */
export async function updateCard(db: DbLike, store: CardStore, actorUserId: string, cardId: string, expectedVersion: number, patch: CardPatch) {
  const r = await saveCard(db, store, actorUserId, cardId, { ficha: patch, expectedVersion });
  // Spec 016, RF-25: el panel avisa si la carta tiene un sello de imagen que ya no encaja con su rareza.
  return { ...r.card, layersSealToReview: r.layersSealToReview };
}

/** RF-14: aplica personaje, rareza o variante a varias cartas; todo o nada. Spec 016, RF-25: retoca las cartas con capas. */
export async function bulkUpdateCards(
  db: DbLike,
  store: CardStore,
  actorUserId: string,
  setId: string,
  versions: Record<string, number>,
  patch: Pick<CardPatch, "characterId" | "rarity" | "variant">,
) {
  const ids = Object.keys(versions);
  if (ids.length === 0) return { updated: 0, layersSealsToReview: 0 };
  const toDelete: (string | null)[] = [];
  let sealsToReview = 0;
  await db.transaction(async (tx) => {
    const set = await lockSet(tx, setId);
    const rows = await tx.select().from(cards).where(and(eq(cards.setId, setId), inArray(cards.id, ids))).for("update");
    if (rows.length !== ids.length) throw new AdminError("not_found", "Alguna de las cartas seleccionadas ya no existe.", { entity: "selected_cards" });
    if (rows.some((r) => r.version !== versions[r.id])) {
      throw new AdminError("stale_version", "Alguna carta cambió desde que cargaste la página. Recarga y vuelve a intentarlo.", { entity: "selected_cards" });
    }
    const defaults = await getCardDefaults(tx);
    const plans = rows.map((cur) => {
      const next = applyPatch(cur, patch, set.status);
      return { cur, next, retier: retierIfLayered(cur, next.rarity, defaults) };
    });
    const recomposed = await mapLimit(plans, COMPOSE_PARALLEL, async ({ cur, next, retier }) =>
      needsRecompose(cur, next) ? composeAndStore(store, { ...cur, ...next, ...retier.patch }, set.code) : null,
    );
    for (const [i, { cur, next, retier }] of plans.entries()) {
      const keys = recomposed[i] ?? {};
      if (recomposed[i]) toDelete.push(...composedKeys(cur));
      if (retier.sealToReview) sealsToReview += 1;
      const merged = { ...cur, ...next, ...keys };
      await tx
        .update(cards)
        .set({ ...next, ...keys, ...retier.patch, status: isCardComplete(merged) ? "ready" : "draft", version: cur.version + 1, updatedAt: sql`now()` })
        .where(eq(cards.id, cur.id));
      await auditChange(tx, { actorUserId, action: "card_bulk_update", entityType: "card", entityId: cur.id, before: pick(cur), after: next });
    }
  });
  await deleteKeys(store, toDelete, db);
  return { updated: ids.length, layersSealsToReview: sealsToReview };
}

/** Aplica una numeración nueva sin chocar con el índice único y regenera las que cambian. */
async function renumber(tx: DbLike, store: CardStore, set: typeof sets.$inferSelect, rows: CardRow[], orderedIds: string[]) {
  const numbers = consecutiveNumbers(orderedIds);
  const changed = rows.filter((r) => numbers.get(r.id) !== r.number);
  for (const r of changed) await tx.update(cards).set({ number: -numbers.get(r.id)! }).where(eq(cards.id, r.id));
  // Spec 018: la carta por capas no lleva el número dibujado; solo se recomponen las antiguas.
  const recomposed = await mapLimit(changed, COMPOSE_PARALLEL, (r) =>
    r.layers ? Promise.resolve({}) : composeAndStore(store, { ...r, number: numbers.get(r.id)! }, set.code),
  );
  for (const [i, r] of changed.entries()) {
    await tx
      .update(cards)
      .set({ number: numbers.get(r.id)!, ...recomposed[i], version: r.version + 1, updatedAt: sql`now()` })
      .where(eq(cards.id, r.id));
  }
  return changed.filter((r) => !r.layers).flatMap(composedKeys);
}

/** RF-15: reordena todas las cartas de una colección en borrador. */
export async function reorderCards(db: DbLike, store: CardStore, actorUserId: string, setId: string, orderedIds: string[]) {
  let toDelete: (string | null)[] = [];
  await db.transaction(async (tx) => {
    const set = await lockSet(tx, setId);
    assertEditable(set.status, "number");
    const rows = await tx.select().from(cards).where(eq(cards.setId, setId)).for("update");
    const current = new Set(rows.map((r) => r.id));
    if (orderedIds.length !== rows.length || new Set(orderedIds).size !== orderedIds.length || orderedIds.some((id) => !current.has(id))) {
      throw new AdminError("invalid_order", "El orden enviado no coincide con las cartas actuales. Recarga la página.");
    }
    toDelete = await renumber(tx, store, set, rows, orderedIds);
    await recordAudit(tx, { actorUserId, action: "cards_reorder", entityType: "set", entityId: setId, after: { order: orderedIds } });
  });
  await deleteKeys(store, toDelete, db);
}

/** Quita una carta de una colección en borrador y renumera las siguientes (RF-15). */
export async function deleteCard(db: DbLike, store: CardStore, actorUserId: string, cardId: string) {
  let toDelete: (string | null)[] = [];
  let layerKeys: string[] = [];
  let setId = "";
  await db.transaction(async (tx) => {
    const [card] = await tx.select().from(cards).where(eq(cards.id, cardId));
    if (!card) throw new AdminError("not_found", "La carta no existe.", { entity: "card" });
    const set = await lockSet(tx, card.setId);
    assertEditable(set.status, "removeCard");
    setId = card.setId;
    // Spec 027: las versiones se van con la carta (en cascada) y sus imágenes se sueltan si ya nadie las usa.
    const versions = await tx.select({ layers: cardVersions.layers }).from(cardVersions).where(eq(cardVersions.cardId, cardId));
    layerKeys = [...imageKeys(card.layers), ...imageKeys(card.layersPending), ...versions.flatMap((v) => imageKeys(v.layers))];
    await tx.delete(cards).where(eq(cards.id, cardId));
    const rest = await tx.select().from(cards).where(eq(cards.setId, set.id)).orderBy(asc(cards.number)).for("update");
    toDelete = [card.originalKey, card.pendingOriginalKey, ...composedKeys(card), ...pendingFlatKeys(card.pendingKeys), ...(await renumber(tx, store, set, rest, rest.map((r) => r.id)))];
    await recordAudit(tx, { actorUserId, action: "card_delete", entityType: "card", entityId: cardId, before: { number: card.number, name: card.name } });
  });
  await deleteKeys(store, toDelete, db);
  await releaseLayerImages(db, store, setId, layerKeys);
}

/** La última versión de la tabla de un tipo de sobre (spec 022, RF-12). */
async function latestDropTable(db: DbLike, setId: string, kind: PackKind) {
  const [row] = await db
    .select()
    .from(dropTables)
    .where(and(eq(dropTables.setId, setId), eq(dropTables.kind, kind)))
    .orderBy(desc(dropTables.version))
    .limit(1);
  return row ?? null;
}

/** RF-17 y cuadrícula: colección, cartas con su personaje, recuento por rareza y huecos (en las dos tablas, spec 022). */
export async function getSetOverview(db: DbLike, setId: string) {
  const [set] = await db.select().from(sets).where(eq(sets.id, setId));
  if (!set) return null;
  const [odds, gold] = await Promise.all([latestDropTable(db, setId, "silver"), latestDropTable(db, setId, "gold")]);
  const list = await db
    .select({ card: cards, characterName: characters.name })
    .from(cards)
    .leftJoin(characters, eq(characters.id, cards.characterId))
    .where(eq(cards.setId, setId))
    .orderBy(asc(cards.number));
  const plain = list.map((r) => ({ ...r.card, characterName: r.characterName }));
  const slots = [...(odds?.slots ?? []), ...(gold?.slots ?? [])];
  return { set, odds, gold, cards: plain, counts: rarityCounts(plain), gaps: rarityGaps(plain, slots) };
}

/**
 * Regenera todas las cartas de una colección (por ejemplo, tras cambiar el marco en Pencil). Spec 037, RF-18: también
 * reintenta las que fallaron; una carta armada que falla queda con su motivo y no corta las demás.
 */
export async function regenerateSet(db: DbLike, store: CardStore, actorUserId: string, setId: string) {
  const [set] = await db.select().from(sets).where(eq(sets.id, setId));
  if (!set) throw new AdminError("not_found", "La colección no existe.", { entity: "set" });
  const rows = await db.select().from(cards).where(eq(cards.setId, setId)).orderBy(asc(cards.number));
  const layered = rows.filter((r) => r.layers);
  const plain = rows.filter((r) => !r.layers);
  const keys = await mapLimit(plain, COMPOSE_PARALLEL, (r) => composeAndStore(store, r, set.code));
  for (const [i, r] of plain.entries()) {
    await db.update(cards).set(keys[i]).where(eq(cards.id, r.id));
  }
  await deleteKeys(store, plain.flatMap(composedKeys), db);
  let failed = 0;
  for (const r of layered) {
    if ((await regenerateCardFlat(db, store, r.id)).ok === false) failed += 1;
  }
  await recordAudit(db, { actorUserId, action: "set_regenerate", entityType: "set", entityId: setId, after: { cards: rows.length, failed } });
  return rows.length - failed;
}

/**
 * RF-18 y RF-19: marca o quita la revisión «personaje claramente adulto». Si había arte nuevo
 * pendiente (colección 18+ publicada), aprobarlo lo convierte en el arte vigente y recompone.
 */
export async function reviewCard(db: DbLike, store: CardStore, actorUserId: string, cardId: string, expectedVersion: number, reviewed: boolean) {
  const toDelete: (string | null)[] = [];
  const layersToRelease: string[] = [];
  const row = await db.transaction(async (tx) => {
    const [cur] = await tx.select().from(cards).where(eq(cards.id, cardId)).for("update");
    if (!cur) throw new AdminError("not_found", "La carta no existe.", { entity: "card" });
    if (cur.version !== expectedVersion) throw new AdminError("stale_version", "La carta cambió desde que la abriste. Recarga para ver la versión actual.", { entity: "card" });
    const [set] = await tx.select().from(sets).where(eq(sets.id, cur.setId));
    if (!set.isAdult) throw new AdminError("not_adult", "Solo las cartas de colecciones 18+ necesitan revisión.");
    let patch: Partial<CardRow> = reviewed
      ? { adultReviewedBy: actorUserId, adultReviewedAt: new Date() }
      : { adultReviewedBy: null, adultReviewedAt: null };
    if (reviewed && cur.pendingOriginalKey) {
      const pending = await store.get(cur.pendingOriginalKey);
      if (!pending) throw new AdminError("missing_original", "No se encontró el arte pendiente.", { what: "pending" });
      // Spec 017, RF-4: en una carta por capas, la chica aprobada ocupa su capa de personaje con el mismo encuadre.
      let layers = cur.layers;
      if (layers) {
        const character = await prepareCharacterImage({ body: pending.body, mime: pending.contentType, filename: cur.pendingOriginalKey });
        const characterKey = layerKey(cur.setId, sha256(character.body));
        await store.put(characterKey, character.body);
        const old = characterLayer(layers)?.key;
        if (old && old !== characterKey) layersToRelease.push(old);
        layers = replaceCharacter(layers, characterKey);
      }
      const keys = await composeAndStore(store, { ...cur, originalKey: cur.pendingOriginalKey, layers }, set.code);
      toDelete.push(cur.originalKey, ...composedKeys(cur));
      patch = { ...patch, ...keys, layers, originalKey: cur.pendingOriginalKey, originalSha256: sha256(pending.body), pendingOriginalKey: null };
    }
    // Spec 018, RF-19: aprobar un cambio de capas pendiente lo pasa a vigente, con su imagen fija ya generada.
    if (reviewed && cur.layersPending && cur.pendingKeys) {
      const k = cur.pendingKeys;
      toDelete.push(...composedKeys(cur));
      layersToRelease.push(...imageKeys(cur.layers));
      patch = { ...patch, layers: cur.layersPending, keyFull: k.full, keyMid: k.mid, keyThumb: k.thumb, keyPublic: k.public, keyHoloMid: k.holoMid ?? null, keyHoloThumb: k.holoThumb ?? null, keyHoloPublic: k.holoPublic ?? null, flatVersion: k.version ?? 0, blurhash: k.blurhash, layersPending: null, pendingKeys: null };
    }
    const [updated] = await tx
      .update(cards)
      .set({ ...patch, version: cur.version + 1, updatedAt: sql`now()` })
      .where(eq(cards.id, cardId))
      .returning();
    await recordAudit(tx, {
      actorUserId,
      action: reviewed ? "card_review" : "card_unreview",
      entityType: "card",
      entityId: cardId,
      meta: { promotedPendingArt: Boolean(reviewed && cur.pendingOriginalKey) },
    });
    return updated;
  });
  await deleteKeys(store, toDelete, db);
  if (layersToRelease.length) await releaseLayerImages(db, store, row.setId, layersToRelease);
  return row;
}

/**
 * Reemplaza el arte de una carta (permitido también en publicadas, RF-8). En una 18+ ya
 * publicada el arte nuevo queda pendiente y se sigue mostrando el anterior hasta revisarlo.
 */
export async function replaceCardArt(db: DbLike, store: CardStore, actorUserId: string, cardId: string, expectedVersion: number, file: UploadFile) {
  const meta = await inspectUpload(file);
  const character = await prepareCharacterImage(file);
  const hash = sha256(file.body);
  const toDelete: (string | null)[] = [];
  const layersToRelease: string[] = [];
  let setId = "";
  const row = await db.transaction(async (tx) => {
    const [cur] = await tx.select().from(cards).where(eq(cards.id, cardId)).for("update");
    if (!cur) throw new AdminError("not_found", "La carta no existe.", { entity: "card" });
    if (cur.version !== expectedVersion) throw new AdminError("stale_version", "La carta cambió desde que la abriste. Recarga para ver la versión actual.", { entity: "card" });
    const [set] = await tx.select().from(sets).where(eq(sets.id, cur.setId));
    assertEditable(set.status, "art");
    const [dup] = await tx
      .select({ id: cards.id, number: cards.number })
      .from(cards)
      .where(and(eq(cards.setId, cur.setId), eq(cards.originalSha256, hash)))
      .limit(1);
    if (dup) throw new AdminError("duplicate_image", `Esta imagen ya está en la colección (carta ${String(dup.number).padStart(3, "0")}).`, { number: dup.number });
    const key = `sets/${cur.setId}/original/${hash}.${EXT[file.mime]}`;
    await store.put(key, file.body);

    let patch: Partial<CardRow>;
    let action: string;
    if (set.isAdult && set.status !== "draft") {
      if (cur.pendingOriginalKey) toDelete.push(cur.pendingOriginalKey);
      patch = { pendingOriginalKey: key };
      action = "card_art_pending";
    } else {
      // Spec 017, RF-4: la chica nueva ocupa la capa de personaje con el mismo encuadre; spec 018: y la imagen fija
      // se saca ya con ella.
      const characterKey = layerKey(cur.setId, sha256(character.body));
      await store.put(characterKey, character.body);
      const old = cur.layers ? characterLayer(cur.layers)?.key : undefined;
      if (old && old !== characterKey) layersToRelease.push(old);
      setId = cur.setId;
      const layers = cur.layers ? replaceCharacter(cur.layers, characterKey) : configFromCharacter(characterKey, rarityTier(cur.rarity), seedFrom(hash), await getCardDefaults(db));
      const keys = await composeAndStore(store, { ...cur, originalKey: key, layers }, set.code);
      toDelete.push(cur.originalKey, ...composedKeys(cur));
      patch = {
        ...keys,
        layers,
        originalKey: key,
        originalSha256: hash,
        width: meta.width,
        height: meta.height,
        ...(set.isAdult ? { adultReviewedBy: null, adultReviewedAt: null } : {}),
      };
      action = "card_art_replace";
    }
    const [updated] = await tx
      .update(cards)
      .set({ ...patch, version: cur.version + 1, updatedAt: sql`now()` })
      .where(eq(cards.id, cardId))
      .returning();
    await recordAudit(tx, { actorUserId, action, entityType: "card", entityId: cardId, meta: { filename: file.filename } });
    return updated;
  });
  await deleteKeys(store, toDelete, db);
  if (setId) await releaseLayerImages(db, store, setId, layersToRelease);
  return { ...row, uncut: character.uncut };
}

/**
 * RF-23: sortea un sobre con las cartas y probabilidades reales de la colección (también en
 * borrador) sin escribir nada: ni sobres, ni colección de usuarios, ni historial. Spec 022, RF-21: con la tabla del tipo.
 */
export async function simulatePack(db: DbLike, setId: string, kind: PackKind = "silver") {
  const [set] = await db.select().from(sets).where(eq(sets.id, setId));
  if (!set) throw new AdminError("not_found", "La colección no existe.", { entity: "set" });
  const odds = await latestDropTable(db, setId, kind);
  const rows = await db.select().from(cards).where(eq(cards.setId, setId));
  const withRarity = rows.filter((r) => r.rarity && r.keyMid);
  if (withRarity.length === 0) {
    throw new AdminError("no_cards", "Asigna rareza al menos a una carta para simular un sobre.", { context: "simulate" });
  }
  const drawn = drawPack({ cards: withRarity, slots: odds?.slots ?? [], holoChance: odds?.holoChance ?? 0 }, cryptoRng, { unique: true });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return drawn.map((d) => ({ ...byId.get(d.cardId)!, holo: d.holo, substitutedFrom: d.substitutedFrom ?? null }));
}
