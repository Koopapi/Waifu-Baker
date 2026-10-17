// Spec 014, RF-5 a RF-8: portada del sobre de cada colección y sobre diseñado a mano.
import { createHash } from "node:crypto";
import sharp from "sharp";
import { and, eq, inArray } from "drizzle-orm";
import { cards, sets, users } from "@/db/schema";
import { resolveCover } from "@/domain/catalog/pack-cover";
import type { CardStore } from "@/server/ports/card-store";
import type { DbLike } from "@/server/db-types";
import { AdminError } from "@/server/errors";
import { recordAudit } from "./audit";
import { inspectUpload, type UploadFile } from "./cards";

/** Tamaño del sobre a mano: proporción 2:3, como el sobre compuesto. */
export const PACK_IMAGE = { width: 600, height: 900 } as const;

async function getSet(db: DbLike, setId: string) {
  const [set] = await db.select().from(sets).where(eq(sets.id, setId));
  if (!set) throw new AdminError("not_found", "La colección no existe.", { entity: "set" });
  return set;
}

/** Datos para dibujar el sobre: portada resuelta (RF-6) y sobre a mano si lo hay (RF-7). */
export async function packArt(db: DbLike, setId: string) {
  const [set] = await db.select().from(sets).where(eq(sets.id, setId));
  if (!set) return null;
  const list = await db.select({ id: cards.id, number: cards.number, rarity: cards.rarity, keyMid: cards.keyMid }).from(cards).where(eq(cards.setId, setId));
  const coverCardId = resolveCover(list, set.coverCardId);
  return {
    setId: set.id,
    code: set.code,
    name: set.name,
    isAdult: set.isAdult,
    chosenCoverId: set.coverCardId,
    coverCardId,
    coverKey: list.find((c) => c.id === coverCardId)?.keyMid ?? null,
    packImageKey: set.packImageKey,
  };
}

/** RF-6: elige (o quita, con `null`) la carta de portada. */
export async function setCoverCard(db: DbLike, actorUserId: string, setId: string, cardId: string | null) {
  const set = await getSet(db, setId);
  if (cardId) {
    const [card] = await db.select({ id: cards.id }).from(cards).where(and(eq(cards.id, cardId), eq(cards.setId, setId)));
    if (!card) throw new AdminError("card_not_in_set", "Esa carta no es de esta colección.");
  }
  await db.update(sets).set({ coverCardId: cardId, updatedAt: new Date() }).where(eq(sets.id, setId));
  await recordAudit(db, { actorUserId, action: "set.cover", entityType: "set", entityId: setId, before: { coverCardId: set.coverCardId }, after: { coverCardId: cardId } });
}

/** RF-7: sube un sobre diseñado a mano; se recorta a 2:3 sin deformarlo y sustituye al anterior. */
export async function uploadPackImage(db: DbLike, store: CardStore, actorUserId: string, setId: string, file: UploadFile) {
  const set = await getSet(db, setId);
  await inspectUpload(file);
  const body = await sharp(file.body).resize(PACK_IMAGE.width, PACK_IMAGE.height, { fit: "cover", position: "attention" }).webp({ quality: 88 }).toBuffer();
  const key = `sets/${setId}/pack/${createHash("sha256").update(body).digest("hex").slice(0, 32)}.webp`;
  await store.put(key, body);
  await db.update(sets).set({ packImageKey: key, updatedAt: new Date() }).where(eq(sets.id, setId));
  if (set.packImageKey && set.packImageKey !== key) await store.delete(set.packImageKey);
  await recordAudit(db, { actorUserId, action: "set.pack_image", entityType: "set", entityId: setId, after: { filename: file.filename } });
  return key;
}

/** RF-7: quita el sobre a mano; vuelve el sobre compuesto. */
export async function removePackImage(db: DbLike, store: CardStore, actorUserId: string, setId: string) {
  const set = await getSet(db, setId);
  if (!set.packImageKey) return;
  await db.update(sets).set({ packImageKey: null, updatedAt: new Date() }).where(eq(sets.id, setId));
  await store.delete(set.packImageKey);
  await recordAudit(db, { actorUserId, action: "set.pack_image_remove", entityType: "set", entityId: setId });
}

/**
 * RF-8: imagen de portada o de sobre a mano para quien tiene sesión; en colecciones 18+, solo con la edad
 * verificada (la misma regla que para abrir sus sobres) o para el administrador (vista previa del panel).
 */
export async function packArtFile(db: DbLike, store: CardStore, userId: string | null, setId: string, kind: "cover" | "pack") {
  if (!userId) return null;
  const art = await packArt(db, setId);
  if (!art) return null;
  if (art.isAdult) {
    const [u] = await db.select({ declared: users.isAdultDeclared, verified: users.adultVerifiedAt, role: users.role }).from(users).where(eq(users.id, userId));
    if (u?.role !== "admin" && (!u?.declared || !u.verified)) return null;
  }
  const key = kind === "pack" ? art.packImageKey : art.coverKey;
  return key ? store.get(key) : null;
}

/** RF-8: datos del sobre de varias colecciones a la vez (para «Mis sobres» y la apertura). */
export async function packArtForSets(db: DbLike, setIds: readonly string[]): Promise<Map<string, { coverVersion: string | null; packImage: string | null }>> {
  const out = new Map<string, { coverVersion: string | null; packImage: string | null }>();
  if (setIds.length === 0) return out;
  const rows = await db.select({ id: sets.id, coverCardId: sets.coverCardId, packImageKey: sets.packImageKey }).from(sets).where(inArray(sets.id, [...setIds]));
  const list = await db.select({ id: cards.id, setId: cards.setId, number: cards.number, rarity: cards.rarity }).from(cards).where(inArray(cards.setId, [...setIds]));
  for (const s of rows) {
    out.set(s.id, { coverVersion: resolveCover(list.filter((c) => c.setId === s.id), s.coverCardId), packImage: s.packImageKey });
  }
  return out;
}
