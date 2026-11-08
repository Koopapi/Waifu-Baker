// Spec 030: diseño del sobre por capas de cada colección y tipo (editor del panel y el sobre en el juego).
import { createHash } from "node:crypto";
import sharp, { type Metadata } from "sharp";
import { and, eq, inArray } from "drizzle-orm";
import { packDesigns, sets, users } from "@/db/schema";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from "@/domain/catalog/upload-rules";
import type { PackKind } from "@/domain/catalog/default-odds";
import { basicRegistro, checkPackDesign, designRefs, mapRefs, PACK_THUMB, packDesignKey, packThumbKey, toRegistro, UPLOAD_REF, type PackDesign, type PackInfo } from "@/domain/packs/design";
import { packArtUrl, packViewKey, type PackViewData } from "@/domain/packs/view";
import { verifyPackAsset } from "@/domain/signed-url";
import { imageSecret, packAssetUrl } from "@/server/cards/image-urls";
import type { CardStore } from "@/server/ports/card-store";
import type { DbLike } from "@/server/db-types";
import { AdminError } from "@/server/errors";
import { recordAudit } from "./audit";
import { packArtForSets } from "./pack-art";
import type { UploadFile } from "./cards";

/** Lado mayor con el que se guarda una imagen del diseño (2 × el lienzo); más grande se reduce, sin deformar. */
const MAX_STORED = { width: 2000, height: 3500 } as const;

const sha256 = (b: Buffer) => createHash("sha256").update(b).digest("hex");

async function getSetRow(db: DbLike, setId: string) {
  const [set] = await db.select().from(sets).where(eq(sets.id, setId));
  if (!set) throw new AdminError("not_found", "La colección no existe.", { entity: "set" });
  return set;
}

const infoOf = (set: { name: string; code: string; packSize: number }): PackInfo => ({ nombre: set.name, codigo: set.code, cartas: set.packSize });

/** RF-11: el diseño guardado de una colección y tipo, para volver al editor (o `null` si aún no tiene). */
export async function getPackDesign(db: DbLike, setId: string, kind: PackKind) {
  const [row] = await db.select().from(packDesigns).where(and(eq(packDesigns.setId, setId), eq(packDesigns.kind, kind)));
  return row ?? null;
}

/** Estado de los dos sobres de una colección (tarjeta «Sobre» del panel). */
export async function packDesignStatus(db: DbLike, setId: string) {
  const rows = await db.select({ kind: packDesigns.kind, thumbKey: packDesigns.thumbKey, updatedAt: packDesigns.updatedAt }).from(packDesigns).where(eq(packDesigns.setId, setId));
  return { silver: rows.find((r) => r.kind === "silver") ?? null, gold: rows.find((r) => r.kind === "gold") ?? null };
}

/** Valida y deja en WebP una imagen nueva del diseño (PNG, WebP o JPG; RF-4). Conserva sus medidas (la revisión las lee). */
async function prepareImage(file: UploadFile): Promise<Buffer> {
  if (!(ALLOWED_UPLOAD_TYPES as readonly string[]).includes(file.mime)) throw new AdminError("unsupported_type", "Formato no admitido: sube PNG, JPEG o WebP.");
  if (file.body.length > MAX_UPLOAD_BYTES) throw new AdminError("too_large", "El archivo supera 20 MB: redúcelo o expórtalo como WebP.", { maxMb: MAX_UPLOAD_BYTES / 1024 / 1024 });
  let meta: Metadata;
  try {
    meta = await sharp(file.body).metadata();
  } catch {
    throw new AdminError("unreadable", "No se pudo leer la imagen: el archivo parece dañado.");
  }
  if (!meta.width || !meta.height) throw new AdminError("unreadable", "No se pudo leer la imagen: el archivo parece dañado.");
  return sharp(file.body).rotate().resize({ ...MAX_STORED, fit: "inside", withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 90 }).toBuffer();
}

/** RF-10: la miniatura que genera el navegador al guardar: una imagen de 500 × 875. */
async function prepareThumb(file: UploadFile | null): Promise<Buffer> {
  const invalid = () => new AdminError("invalid_pack_design", "La miniatura del sobre no es válida.", { path: "thumb" });
  if (!file || !["image/png", "image/webp"].includes(file.mime) || file.body.length > MAX_UPLOAD_BYTES) throw invalid();
  let meta: Metadata;
  try {
    meta = await sharp(file.body).metadata();
  } catch {
    throw invalid();
  }
  if (meta.width !== PACK_THUMB.width || meta.height !== PACK_THUMB.height) throw invalid();
  return sharp(file.body).webp({ quality: 90, alphaQuality: 100 }).toBuffer();
}

export interface SavePackDesignInput {
  /** El diseño que manda el editor: claves ya guardadas de la colección o marcas `upload:<n>` para lo nuevo. */
  design: unknown;
  /** Las imágenes nuevas, por su marca. */
  uploads: Map<string, UploadFile>;
  /** RF-10: la miniatura de 500 × 875. */
  thumb: UploadFile | null;
}

/** Claves que usa algún diseño (de los dos tipos) de la colección. */
async function keysInUse(db: DbLike, setId: string): Promise<Set<string>> {
  const rows = await db.select({ design: packDesigns.design, thumbKey: packDesigns.thumbKey }).from(packDesigns).where(eq(packDesigns.setId, setId));
  return new Set(rows.flatMap((r) => [...designRefs(r.design), r.thumbKey]));
}

/**
 * RF-10 a RF-12: guarda el diseño del sobre de una colección y tipo con sus imágenes y la miniatura, en el almacén
 * propio, y lo registra en la auditoría. Un diseño inválido no se guarda (ni sus imágenes) y el error dice qué campo
 * falla. Las imágenes que el diseño anterior usaba y ya no usa ningún diseño de la colección se borran.
 */
export async function savePackDesign(db: DbLike, store: CardStore, actorUserId: string, setId: string, kind: PackKind, input: SavePackDesignInput) {
  await getSetRow(db, setId);
  const first = checkPackDesign(input.design, setId, { allowUploads: true });
  if (!first.ok) throw new AdminError(first.issue.code, "El diseño del sobre no es válido.", { path: first.issue.path });
  const thumbBody = await prepareThumb(input.thumb);

  // Primero se preparan todas las imágenes (si una no vale, no se guarda nada).
  const prepared = new Map<string, Buffer>();
  for (const ref of designRefs(first.design).filter((r) => UPLOAD_REF.test(r))) {
    const file = input.uploads.get(ref);
    if (!file) throw new AdminError("pack_upload_missing", "Falta una imagen del diseño.", { path: ref });
    prepared.set(ref, await prepareImage(file));
  }
  const before = await keysInUse(db, setId);
  const written: string[] = [];
  const keyOf = new Map<string, string>();
  for (const [ref, body] of prepared) {
    const key = packDesignKey(setId, sha256(body));
    keyOf.set(ref, key);
    if (!before.has(key)) {
      await store.put(key, body);
      written.push(key);
    }
  }
  const thumbKey = packThumbKey(setId, sha256(thumbBody));
  if (!before.has(thumbKey)) {
    await store.put(thumbKey, thumbBody);
    written.push(thumbKey);
  }
  const final = mapRefs(first.design, (ref) => keyOf.get(ref) ?? ref);
  const checked = checkPackDesign(final, setId);
  if (!checked.ok) throw new AdminError(checked.issue.code, "El diseño del sobre no es válido.", { path: checked.issue.path });

  let row;
  try {
    row = await db.transaction(async (tx) => {
      const [old] = await tx.select().from(packDesigns).where(and(eq(packDesigns.setId, setId), eq(packDesigns.kind, kind))).for("update");
      const values = { design: checked.design, thumbKey, updatedBy: actorUserId, updatedAt: new Date() };
      const [saved] = old
        ? await tx.update(packDesigns).set({ ...values, version: old.version + 1 }).where(eq(packDesigns.id, old.id)).returning()
        : await tx.insert(packDesigns).values({ setId, kind, ...values }).returning();
      await recordAudit(tx, {
        actorUserId,
        action: "set.pack_design",
        entityType: "set",
        entityId: setId,
        before: { kind, design: old?.design ?? null },
        after: { kind, design: checked.design },
        meta: { version: saved.version },
      });
      return saved;
    });
  } catch (e) {
    for (const k of written) await store.delete(k);
    throw e;
  }
  const inUse = await keysInUse(db, setId);
  for (const k of before) if (!inUse.has(k)) await store.delete(k);
  // Para el editor: la clave guardada de cada imagen nueva (sigue con ella sin volver a subirla).
  return Object.assign(row, { keys: Object.fromEntries(keyOf) as Record<string, string> });
}

/**
 * RF-14 a RF-16: el sobre de cada colección y tipo listo para pintar: su diseño con enlaces firmados para `userId` y su
 * miniatura, o el sobre básico con la portada (RF-15). Sin comprobar permisos aquí: quien llama ya enseña esos sobres.
 */
export async function packViewsFor(db: DbLike, userId: string, items: readonly { setId: string; kind: PackKind }[], now = Date.now()): Promise<Map<string, PackViewData>> {
  const out = new Map<string, PackViewData>();
  const setIds = [...new Set(items.map((i) => i.setId))];
  if (setIds.length === 0) return out;
  const [setRows, designs, art] = await Promise.all([
    db.select({ id: sets.id, code: sets.code, name: sets.name, packSize: sets.packSize }).from(sets).where(inArray(sets.id, setIds)),
    db.select().from(packDesigns).where(inArray(packDesigns.setId, setIds)),
    packArtForSets(db, setIds),
  ]);
  for (const { setId, kind } of items) {
    const set = setRows.find((s) => s.id === setId);
    if (!set) continue;
    const info = infoOf(set);
    const d = designs.find((x) => x.setId === setId && x.kind === kind);
    const base = { setId, kind, code: set.code, name: set.name };
    if (d) {
      const url = (key: string) => packAssetUrl(setId, kind, key, userId, now);
      out.set(packViewKey(setId, kind), { ...base, registro: toRegistro(d.design, info, url), thumb: url(d.thumbKey), designed: true });
    } else {
      const a = art.get(setId) ?? { coverVersion: null, packImage: null };
      out.set(packViewKey(setId, kind), { ...base, registro: basicRegistro(kind, info, packArtUrl(setId, a)), thumb: null, designed: false });
    }
  }
  return out;
}

/** Atajo para una sola colección y tipo (apertura, «Abrir todos» y simulador). */
export async function packViewFor(db: DbLike, userId: string, setId: string, kind: PackKind, now = Date.now()) {
  return (await packViewsFor(db, userId, [{ setId, kind }], now)).get(packViewKey(setId, kind)) ?? null;
}

/**
 * RNF seguridad: una imagen del diseño (o la miniatura) solo con enlace válido, de la misma sesión, si la clave es del
 * diseño vigente de esa colección y tipo y, en las colecciones 18+, con el doble control de edad (o para el
 * administrador). Las colecciones archivadas se siguen sirviendo (sus sobres sin abrir se abren con su diseño).
 */
export async function servePackAsset(db: DbLike, store: CardStore, userId: string | null, grant: { setId: string; kind: string; key: string; expires: number; sig: string }, now = Date.now()) {
  if (!userId || (grant.kind !== "silver" && grant.kind !== "gold")) return null;
  if (!verifyPackAsset({ ...grant, kind: grant.kind, userId }, imageSecret(), now)) return null;
  const row = await getPackDesign(db, grant.setId, grant.kind);
  if (!row || !(row.thumbKey === grant.key || designRefs(row.design).includes(grant.key))) return null;
  const [set] = await db.select({ isAdult: sets.isAdult }).from(sets).where(eq(sets.id, grant.setId));
  if (!set) return null;
  if (set.isAdult) {
    const [u] = await db.select({ declared: users.isAdultDeclared, verified: users.adultVerifiedAt, role: users.role }).from(users).where(eq(users.id, userId));
    if (u?.role !== "admin" && (!u?.declared || !u.verified)) return null;
  }
  return store.get(grant.key);
}

export type { PackDesign };
