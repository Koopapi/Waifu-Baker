// Spec 017, RF-6 a RF-9: biblioteca de fondos de una colección.
import { createHash } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { cards, setBackgrounds, sets } from "@/db/schema";
import { backgroundKey, imageKeys } from "@/domain/cards/layers";
import { prepareLayerImage } from "@/server/cards/layer-images";
import type { CardStore } from "@/server/ports/card-store";
import type { DbLike } from "@/server/db-types";
import { AdminError, isUniqueViolation } from "@/server/errors";
import type { UploadFile } from "./cards";
import { recordAudit } from "./audit";

const sha256 = (b: Buffer) => createHash("sha256").update(b).digest("hex");
/** Nombre que se ve en la biblioteca: el del archivo sin extensión. */
const displayName = (filename: string) => filename.replace(/\.[^.]+$/, "").trim().slice(0, 80) || "fondo";

export interface SetBackground {
  id: string;
  key: string;
  name: string;
  /** Cartas de la colección que lo usan (vigente o pendiente). */
  uses: number;
}

/** RF-9: cuántas cartas de la colección usan cada clave de imagen. */
async function usesByKey(db: DbLike, setId: string): Promise<Map<string, number>> {
  const rows = await db.select({ layers: cards.layers, pending: cards.layersPending }).from(cards).where(eq(cards.setId, setId));
  const uses = new Map<string, number>();
  for (const r of rows) for (const k of new Set([...imageKeys(r.layers), ...imageKeys(r.pending)])) uses.set(k, (uses.get(k) ?? 0) + 1);
  return uses;
}

/** RF-6 y RF-7: sube un fondo a la biblioteca con las reglas de las capas (proporción del lienzo, WebP). */
export async function uploadSetBackground(db: DbLike, store: CardStore, actorUserId: string, setId: string, file: UploadFile) {
  const [set] = await db.select({ id: sets.id }).from(sets).where(eq(sets.id, setId));
  if (!set) throw new AdminError("not_found", "La colección no existe.", { entity: "set" });
  const image = await prepareLayerImage(file, "layer");
  const sha = sha256(image.body);
  const [dup] = await db.select({ name: setBackgrounds.name }).from(setBackgrounds).where(and(eq(setBackgrounds.setId, setId), eq(setBackgrounds.sha256, sha)));
  if (dup) throw new AdminError("duplicate_background", `Este fondo ya está en la biblioteca («${dup.name}»).`, { name: dup.name });
  const key = backgroundKey(setId, sha);
  await store.put(key, image.body);
  try {
    const [row] = await db.insert(setBackgrounds).values({ setId, key, sha256: sha, name: displayName(file.filename) }).returning();
    await recordAudit(db, { actorUserId, action: "set_background_add", entityType: "set_background", entityId: row.id, after: { setId, name: row.name, key } });
    return { ...row, width: image.width, height: image.height, scaled: image.scaled };
  } catch (e) {
    if (isUniqueViolation(e)) throw new AdminError("duplicate_background", "Este fondo ya está en la biblioteca.", { name: displayName(file.filename) });
    throw e;
  }
}

/** RF-6 y RF-9: los fondos de la colección, en orden de subida, con cuántas cartas usan cada uno. */
export async function listSetBackgrounds(db: DbLike, setId: string): Promise<SetBackground[]> {
  const rows = await db.select().from(setBackgrounds).where(eq(setBackgrounds.setId, setId)).orderBy(asc(setBackgrounds.createdAt), asc(setBackgrounds.name));
  const uses = await usesByKey(db, setId);
  return rows.map((r) => ({ id: r.id, key: r.key, name: r.name, uses: uses.get(r.key) ?? 0 }));
}

/** RF-6 y RF-9: quita un fondo de la biblioteca si ninguna carta lo usa, y borra su imagen. */
export async function removeSetBackground(db: DbLike, store: CardStore, actorUserId: string, setId: string, backgroundId: string) {
  const [row] = await db.select().from(setBackgrounds).where(and(eq(setBackgrounds.id, backgroundId), eq(setBackgrounds.setId, setId)));
  if (!row) throw new AdminError("not_found", "El fondo no existe.", { entity: "background" });
  const count = (await usesByKey(db, setId)).get(row.key) ?? 0;
  if (count > 0) throw new AdminError("background_in_use", `Este fondo lo usan ${count} cartas: cámbialo en ellas antes de quitarlo.`, { count });
  await db.delete(setBackgrounds).where(eq(setBackgrounds.id, row.id));
  await recordAudit(db, { actorUserId, action: "set_background_remove", entityType: "set_background", entityId: row.id, before: { setId, name: row.name, key: row.key } });
  await store.delete(row.key);
}
