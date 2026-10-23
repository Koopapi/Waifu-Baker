// Spec 017 (ampliación), RF-6 a RF-9 y RF-21: biblioteca general de elementos, común a todas las colecciones.
import { createHash } from "node:crypto";
import { asc, eq, inArray } from "drizzle-orm";
import { cards, libraryItems, sets } from "@/db/schema";
import { isTempKey, particleLayerSchema } from "@/domain/cards/layers";
import { LIBRARY_KINDS, libraryKey, libraryName, presetFromLayer, uploadKindFor, usesByKey, type LibraryImageKind, type ParticlePreset } from "@/domain/cards/library";
import { prepareLayerImage } from "@/server/cards/layer-images";
import type { CardStore } from "@/server/ports/card-store";
import type { DbLike } from "@/server/db-types";
import { AdminError, isUniqueViolation } from "@/server/errors";
import type { UploadFile } from "./cards";
import { recordAudit } from "./audit";

type Row = typeof libraryItems.$inferSelect;
const sha256 = (b: Buffer) => createHash("sha256").update(b).digest("hex");

export interface LibraryItemView {
  id: string;
  kind: Row["kind"];
  name: string;
  key: string | null;
  particles: ParticlePreset | null;
  /** RF-9: cartas que usan la imagen y sus colecciones (las partículas se copian: siempre 0). */
  uses: number;
  sets: string[];
}

function validName(raw: string) {
  const name = libraryName(raw);
  if (!name) throw new AdminError("invalid_name", "Ponle un nombre al elemento.");
  return name;
}

/** RF-7: la misma imagen no se guarda dos veces; avisa con el nombre de la que ya está. */
async function assertNewImage(db: DbLike, sha: string) {
  const [dup] = await db.select({ name: libraryItems.name }).from(libraryItems).where(eq(libraryItems.sha256, sha));
  if (dup) throw new AdminError("duplicate_item", `Esta imagen ya está en la biblioteca («${dup.name}»).`, { name: dup.name });
}

async function insertImage(db: DbLike, store: CardStore, actorUserId: string, kind: LibraryImageKind, name: string, body: Buffer) {
  const sha = sha256(body);
  await assertNewImage(db, sha);
  const key = libraryKey(sha);
  await store.put(key, body);
  try {
    const [row] = await db.insert(libraryItems).values({ kind, name, key, sha256: sha }).returning();
    await recordAudit(db, { actorUserId, action: "library_item_add", entityType: "library_item", entityId: row.id, after: { kind, name, key } });
    return row;
  } catch (e) {
    if (isUniqueViolation(e)) throw new AdminError("duplicate_item", "Esta imagen ya está en la biblioteca.", { name });
    throw e;
  }
}

/** RF-6 y RF-7: sube un fondo, un sello o un adorno con las reglas de su tipo. */
export async function uploadLibraryImage(db: DbLike, store: CardStore, actorUserId: string, kind: LibraryImageKind, file: UploadFile) {
  const name = validName(file.filename);
  const image = await prepareLayerImage(file, uploadKindFor(kind));
  const row = await insertImage(db, store, actorUserId, kind, name, image.body);
  return { ...row, key: row.key!, width: image.width, height: image.height, scaled: image.scaled };
}

/** Para la siembra: la imagen de la biblioteca con esa huella (con su archivo en el almacén), o la sube si aún no está. */
export async function ensureLibraryImage(db: DbLike, store: CardStore, actorUserId: string, kind: LibraryImageKind, file: UploadFile) {
  const image = await prepareLayerImage(file, uploadKindFor(kind));
  const [found] = await db.select().from(libraryItems).where(eq(libraryItems.sha256, sha256(image.body)));
  if (!found) return insertImage(db, store, actorUserId, kind, validName(file.filename), image.body);
  if (!(await store.get(found.key!))) await store.put(found.key!, image.body);
  return found;
}

/** RF-6 y RF-21: guarda unas partículas con nombre (sin su semilla ni su posición en la carta). */
export async function saveLibraryParticles(db: DbLike, actorUserId: string, input: { name: string; particles: unknown }) {
  const parsed = particleLayerSchema.safeParse(input.particles);
  if (!parsed.success) throw new AdminError("invalid_layers", "La configuración de partículas no es válida.", { path: parsed.error.issues[0]?.path.join(".") ?? "" });
  const name = validName(input.name);
  const [row] = await db.insert(libraryItems).values({ kind: "particulas", name, particles: presetFromLayer(parsed.data) }).returning();
  await recordAudit(db, { actorUserId, action: "library_item_add", entityType: "library_item", entityId: row.id, after: { kind: "particulas", name } });
  return row;
}

/** Imágenes de capa o de sello de una carta (guardadas en su colección o recién subidas). */
const isCardImageKey = (key: string) => isTempKey(key) || /^sets\/[0-9a-f-]{36}\/layers\/[0-9a-f]{64}\.webp$/.test(key);

/** RF-21: «Guardar en la biblioteca» una capa o el sello de una carta. La carta no cambia. */
export async function saveLibraryFromCard(db: DbLike, store: CardStore, actorUserId: string, input: { kind: LibraryImageKind; key: string; name: string }) {
  if (!(LIBRARY_KINDS as readonly string[]).includes(input.kind) || input.kind === ("particulas" as string)) throw new AdminError("invalid_layers", "Tipo de elemento no válido.", { path: "kind" });
  const [already] = await db.select({ name: libraryItems.name }).from(libraryItems).where(eq(libraryItems.key, input.key));
  if (already) throw new AdminError("duplicate_item", `Esta imagen ya está en la biblioteca («${already.name}»).`, { name: already.name });
  if (!isCardImageKey(input.key)) throw new AdminError("invalid_layers", "Esa imagen no es una capa de la carta.", { path: "key" });
  const file = await store.get(input.key);
  if (!file) throw new AdminError("layer_missing", "Una de las capas ya no está disponible.");
  return insertImage(db, store, actorUserId, input.kind, validName(input.name), file.body);
}

/** RF-6 y RF-9: toda la biblioteca, por tipo y en orden de llegada, con el uso de cada imagen. */
export async function listLibrary(db: DbLike): Promise<LibraryItemView[]> {
  const rows = await db.select().from(libraryItems).orderBy(asc(libraryItems.kind), asc(libraryItems.createdAt), asc(libraryItems.name));
  const uses = await libraryUses(db);
  return rows.map((r) => {
    const u = (r.key && uses.get(r.key)) || { cards: 0, sets: [] };
    return { id: r.id, kind: r.kind, name: r.name, key: r.key, particles: r.particles, uses: u.cards, sets: u.sets };
  });
}

async function libraryUses(db: DbLike) {
  const rows = await db.select({ setCode: sets.code, layers: cards.layers, pending: cards.layersPending }).from(cards).innerJoin(sets, eq(sets.id, cards.setId));
  return usesByKey(rows);
}

/** Las claves (de entre `keys`) que son imágenes de la biblioteca: una carta las usa sin copiarlas y nunca se borran. */
export async function libraryKeysAmong(db: DbLike, keys: string[]): Promise<Set<string>> {
  if (keys.length === 0) return new Set();
  const rows = await db.select({ key: libraryItems.key }).from(libraryItems).where(inArray(libraryItems.key, [...new Set(keys)]));
  return new Set(rows.map((r) => r.key!));
}

/** RF-6: cambia el nombre de un elemento. */
export async function renameLibraryItem(db: DbLike, actorUserId: string, id: string, rawName: string) {
  const name = validName(rawName);
  const [cur] = await db.select().from(libraryItems).where(eq(libraryItems.id, id));
  if (!cur) throw new AdminError("not_found", "El elemento no existe.", { entity: "library_item" });
  const [row] = await db.update(libraryItems).set({ name }).where(eq(libraryItems.id, id)).returning();
  await recordAudit(db, { actorUserId, action: "library_item_rename", entityType: "library_item", entityId: id, before: { name: cur.name }, after: { name } });
  return row;
}

/** RF-6 y RF-9: quita un elemento; una imagen que usa alguna carta no se quita. */
export async function removeLibraryItem(db: DbLike, store: CardStore, actorUserId: string, id: string) {
  const [row] = await db.select().from(libraryItems).where(eq(libraryItems.id, id));
  if (!row) throw new AdminError("not_found", "El elemento no existe.", { entity: "library_item" });
  if (row.key) {
    const u = (await libraryUses(db)).get(row.key);
    if (u) throw new AdminError("item_in_use", `Lo usan ${u.cards} cartas (${u.sets.join(", ")}): cámbialo en ellas antes de quitarlo.`, { count: u.cards, sets: u.sets.join(", ") });
  }
  await db.delete(libraryItems).where(eq(libraryItems.id, id));
  await recordAudit(db, { actorUserId, action: "library_item_remove", entityType: "library_item", entityId: id, before: { kind: row.kind, name: row.name, key: row.key } });
  if (row.key) await store.delete(row.key);
}
