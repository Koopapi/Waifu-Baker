import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { cards, characters, dropTables, sets } from "@/db/schema";
import { canEdit, type EditableField, type SetStatus } from "@/domain/catalog/collection-rules";
import { consecutiveNumbers, isCardComplete, rarityCounts, rarityGaps, type Rarity } from "@/domain/catalog/card-rules";
import { validateUpload } from "@/domain/catalog/upload-rules";
import { mapLimit } from "@/lib/map-limit";
import { drawPack } from "@/domain/catalog/draw";
import { cryptoRng } from "@/server/rng";
import { composeCard, type CardSize } from "@/server/cards/compose";
import type { CardStore } from "@/server/ports/card-store";
import type { DbLike } from "@/server/db-types";
import { AdminError, isUniqueViolation } from "@/server/errors";
import { auditChange, recordAudit } from "./audit";
import { rarityTier } from "@/domain/catalog/rarity-tier";
import type { LayersConfig } from "@/domain/cards/layers";
import { retierLayers } from "@/domain/cards/layers-rarity";

type CardRow = typeof cards.$inferSelect;
type Variant = CardRow["variant"];
const COMPOSE_PARALLEL = 4;
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

const sha256 = (b: Buffer) => createHash("sha256").update(b).digest("hex");

async function lockSet(db: DbLike, setId: string) {
  const [set] = await db.select().from(sets).where(eq(sets.id, setId)).for("update");
  if (!set) throw new AdminError("not_found", "La colección no existe.", { entity: "set" });
  return set;
}

function assertEditable(status: SetStatus, field: EditableField) {
  if (!canEdit(status, field)) {
    throw new AdminError("locked", "Esta colección ya está publicada: no se pueden añadir, quitar ni cambiar rarezas, variantes o números.", { what: "cards" });
  }
}

/** Compone la carta y guarda sus 4 tamaños. Las claves llevan la huella del contenido. */
async function composeAndStore(store: CardStore, card: Pick<CardRow, "id" | "setId" | "number" | "rarity" | "originalKey">, setCode: string) {
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
async function deleteKeys(store: CardStore, keys: (string | null | undefined)[], db?: DbLike) {
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

const composedKeys = (c: Pick<CardRow, "keyFull" | "keyMid" | "keyThumb" | "keyPublic">) => [c.keyFull, c.keyMid, c.keyThumb, c.keyPublic];

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

/** RF-11, RF-12, RF-13: una imagen → una carta en borrador, numerada y compuesta. */
export async function uploadCardImage(db: DbLike, store: CardStore, actorUserId: string, setId: string, file: UploadFile) {
  const meta = await inspectUpload(file);
  const hash = sha256(file.body);
  const id = randomUUID();
  const originalKey = `sets/${setId}/original/${hash}.${EXT[file.mime]}`;

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
      const [row] = await tx
        .insert(cards)
        .values({ id, setId, number: (last?.n ?? 0) + 1, originalSha256: hash, originalKey, width: meta.width, height: meta.height })
        .returning();
      await recordAudit(tx, {
        actorUserId,
        action: "card_upload",
        entityType: "card",
        entityId: id,
        after: { setId, number: row.number, filename: file.filename },
      });
      return { created: row, setCode: set.code };
    }));
  } catch (e) {
    if (isUniqueViolation(e)) throw new AdminError("duplicate_image", "Esta imagen ya está en la colección.");
    throw e;
  }

  await store.put(originalKey, file.body);
  try {
    const keys = await composeAndStore(store, created, setCode);
    const [done] = await db.update(cards).set(keys).where(eq(cards.id, id)).returning();
    return done;
  } catch (e) {
    await db.delete(cards).where(eq(cards.id, id));
    await store.delete(originalKey);
    throw e;
  }
}

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

function applyPatch(cur: CardRow, patch: CardPatch, status: SetStatus) {
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

/** Solo cambia la imagen si cambia el marco (rareza) o el número: la carta no lleva más texto. */
const needsRecompose = (cur: CardRow, next: { rarity: Rarity | null; number?: number }) =>
  cur.rarity !== next.rarity || (next.number !== undefined && cur.number !== next.number);

/**
 * Spec 016, RF-25: si cambia la rareza de una carta con capas, su marco y su sello de texto siguen al escalón nuevo.
 * Devuelve las columnas a cambiar y si queda un sello de imagen que hay que revisar a mano.
 */
function retierIfLayered(cur: CardRow, rarity: Rarity | null): { patch: { layers?: LayersConfig }; sealToReview: boolean } {
  if (!cur.layers || !rarity || cur.rarity === rarity) return { patch: {}, sealToReview: false };
  const r = retierLayers(cur.layers as LayersConfig, rarityTier(rarity));
  return { patch: { layers: r.config }, sealToReview: r.imageSealToReview };
}

/** RF-14 y RF-16: edita una carta con control de versión y regenera si cambia lo que se ve. */
export async function updateCard(db: DbLike, store: CardStore, actorUserId: string, cardId: string, expectedVersion: number, patch: CardPatch) {
  const toDelete: (string | null)[] = [];
  let sealToReview = false;
  const result = await db.transaction(async (tx) => {
    const [cur] = await tx.select().from(cards).where(eq(cards.id, cardId)).for("update");
    if (!cur) throw new AdminError("not_found", "La carta no existe.", { entity: "card" });
    if (cur.version !== expectedVersion) {
      throw new AdminError("stale_version", "La carta cambió desde que la abriste. Recarga para ver la versión actual.", { entity: "card" });
    }
    const [set] = await tx.select().from(sets).where(eq(sets.id, cur.setId));
    const next = applyPatch(cur, patch, set.status);
    let keys = {};
    if (needsRecompose(cur, next)) {
      keys = await composeAndStore(store, { ...cur, ...next }, set.code);
      toDelete.push(...composedKeys(cur));
    }
    const retier = retierIfLayered(cur, next.rarity);
    sealToReview = retier.sealToReview;
    const merged = { ...cur, ...next, ...keys };
    try {
      const [row] = await tx
        .update(cards)
        .set({ ...next, ...keys, ...retier.patch, status: isCardComplete(merged) ? "ready" : "draft", version: cur.version + 1, updatedAt: sql`now()` })
        .where(and(eq(cards.id, cardId), eq(cards.version, expectedVersion)))
        .returning();
      await auditChange(tx, { actorUserId, action: "card_update", entityType: "card", entityId: cardId, before: pick(cur), after: next });
      return row;
    } catch (e) {
      if ((e as { code?: string }).code === "23503") throw new AdminError("not_found", "El personaje elegido ya no existe.", { entity: "chosen_character" });
      throw e;
    }
  });
  await deleteKeys(store, toDelete, db);
  // Spec 016, RF-25: el panel avisa si la carta tiene un sello de imagen que ya no encaja con su rareza.
  return { ...result, layersSealToReview: sealToReview };
}

const pick = (c: CardRow) => ({ name: c.name, flavorText: c.flavorText, characterId: c.characterId, rarity: c.rarity, variant: c.variant });

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
    const plans = rows.map((cur) => ({ cur, next: applyPatch(cur, patch, set.status) }));
    const recomposed = await mapLimit(plans, COMPOSE_PARALLEL, async ({ cur, next }) =>
      needsRecompose(cur, next) ? composeAndStore(store, { ...cur, ...next }, set.code) : null,
    );
    for (const [i, { cur, next }] of plans.entries()) {
      const keys = recomposed[i] ?? {};
      if (recomposed[i]) toDelete.push(...composedKeys(cur));
      const retier = retierIfLayered(cur, next.rarity);
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
  const recomposed = await mapLimit(changed, COMPOSE_PARALLEL, (r) =>
    composeAndStore(store, { ...r, number: numbers.get(r.id)! }, set.code),
  );
  for (const [i, r] of changed.entries()) {
    await tx
      .update(cards)
      .set({ number: numbers.get(r.id)!, ...recomposed[i], version: r.version + 1, updatedAt: sql`now()` })
      .where(eq(cards.id, r.id));
  }
  return changed.flatMap(composedKeys);
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
  await db.transaction(async (tx) => {
    const [card] = await tx.select().from(cards).where(eq(cards.id, cardId));
    if (!card) throw new AdminError("not_found", "La carta no existe.", { entity: "card" });
    const set = await lockSet(tx, card.setId);
    assertEditable(set.status, "removeCard");
    await tx.delete(cards).where(eq(cards.id, cardId));
    const rest = await tx.select().from(cards).where(eq(cards.setId, set.id)).orderBy(asc(cards.number)).for("update");
    toDelete = [card.originalKey, card.pendingOriginalKey, ...composedKeys(card), ...(await renumber(tx, store, set, rest, rest.map((r) => r.id)))];
    await recordAudit(tx, { actorUserId, action: "card_delete", entityType: "card", entityId: cardId, before: { number: card.number, name: card.name } });
  });
  await deleteKeys(store, toDelete, db);
}

/** RF-17 y cuadrícula: colección, cartas con su personaje, recuento por rareza y huecos. */
export async function getSetOverview(db: DbLike, setId: string) {
  const [set] = await db.select().from(sets).where(eq(sets.id, setId));
  if (!set) return null;
  const [odds] = await db.select().from(dropTables).where(eq(dropTables.setId, setId)).orderBy(desc(dropTables.version)).limit(1);
  const list = await db
    .select({ card: cards, characterName: characters.name })
    .from(cards)
    .leftJoin(characters, eq(characters.id, cards.characterId))
    .where(eq(cards.setId, setId))
    .orderBy(asc(cards.number));
  const plain = list.map((r) => ({ ...r.card, characterName: r.characterName }));
  return { set, odds: odds ?? null, cards: plain, counts: rarityCounts(plain), gaps: rarityGaps(plain, odds?.slots ?? []) };
}

/** Regenera todas las cartas de una colección (por ejemplo, tras cambiar el marco en Pencil). */
export async function regenerateSet(db: DbLike, store: CardStore, actorUserId: string, setId: string) {
  const [set] = await db.select().from(sets).where(eq(sets.id, setId));
  if (!set) throw new AdminError("not_found", "La colección no existe.", { entity: "set" });
  const rows = await db.select().from(cards).where(eq(cards.setId, setId)).orderBy(asc(cards.number));
  const keys = await mapLimit(rows, COMPOSE_PARALLEL, (r) => composeAndStore(store, r, set.code));
  for (const [i, r] of rows.entries()) {
    await db.update(cards).set(keys[i]).where(eq(cards.id, r.id));
  }
  await recordAudit(db, { actorUserId, action: "set_regenerate", entityType: "set", entityId: setId, after: { cards: rows.length } });
  await deleteKeys(store, rows.flatMap(composedKeys), db);
  return rows.length;
}

/**
 * RF-18 y RF-19: marca o quita la revisión «personaje claramente adulto». Si había arte nuevo
 * pendiente (colección 18+ publicada), aprobarlo lo convierte en el arte vigente y recompone.
 */
export async function reviewCard(db: DbLike, store: CardStore, actorUserId: string, cardId: string, expectedVersion: number, reviewed: boolean) {
  const toDelete: (string | null)[] = [];
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
      const keys = await composeAndStore(store, { ...cur, originalKey: cur.pendingOriginalKey }, set.code);
      toDelete.push(cur.originalKey, ...composedKeys(cur));
      patch = { ...patch, ...keys, originalKey: cur.pendingOriginalKey, originalSha256: sha256(pending.body), pendingOriginalKey: null };
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
  return row;
}

/**
 * Reemplaza el arte de una carta (permitido también en publicadas, RF-8). En una 18+ ya
 * publicada el arte nuevo queda pendiente y se sigue mostrando el anterior hasta revisarlo.
 */
export async function replaceCardArt(db: DbLike, store: CardStore, actorUserId: string, cardId: string, expectedVersion: number, file: UploadFile) {
  const meta = await inspectUpload(file);
  const hash = sha256(file.body);
  const toDelete: (string | null)[] = [];
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
      const keys = await composeAndStore(store, { ...cur, originalKey: key }, set.code);
      toDelete.push(cur.originalKey, ...composedKeys(cur));
      patch = {
        ...keys,
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
  return row;
}

/**
 * RF-23: sortea un sobre con las cartas y probabilidades reales de la colección (también en
 * borrador) sin escribir nada: ni sobres, ni colección de usuarios, ni historial.
 */
export async function simulatePack(db: DbLike, setId: string) {
  const [set] = await db.select().from(sets).where(eq(sets.id, setId));
  if (!set) throw new AdminError("not_found", "La colección no existe.", { entity: "set" });
  const [odds] = await db.select().from(dropTables).where(eq(dropTables.setId, setId)).orderBy(desc(dropTables.version)).limit(1);
  const rows = await db.select().from(cards).where(eq(cards.setId, setId));
  const withRarity = rows.filter((r) => r.rarity && r.keyMid);
  if (withRarity.length === 0) {
    throw new AdminError("no_cards", "Asigna rareza al menos a una carta para simular un sobre.", { context: "simulate" });
  }
  const drawn = drawPack({ cards: withRarity, slots: odds?.slots ?? [], holoChance: odds?.holoChance ?? 0 }, cryptoRng, { unique: true });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return drawn.map((d) => ({ ...byId.get(d.cardId)!, holo: d.holo, substitutedFrom: d.substitutedFrom ?? null }));
}
