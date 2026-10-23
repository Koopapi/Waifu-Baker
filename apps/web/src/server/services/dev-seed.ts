import { eq } from "drizzle-orm";
import sharp from "sharp";
import { cards, sets, users } from "@/db/schema";
import { missingParts, setBackground, STORED_LAYER } from "@/domain/cards/layers";
import type { Rarity } from "@/domain/catalog/card-rules";
import type { Slot } from "@/domain/catalog/odds";
import type { CardStore } from "@/server/ports/card-store";
import type { DbLike } from "@/server/db-types";
import { AdminError } from "@/server/errors";
import { createCharacter } from "./characters";
import { reviewCard, updateCard, uploadCardImage, type UploadFile } from "./cards";
import { saveCardLayers } from "./card-layers";
import { createSet, publishSet, saveOdds } from "./collections";
import { ensureLibraryImage } from "./library";
import { upsertUserFromLogin } from "./users";
import { giftPacks } from "./users-admin";

/**
 * Siembra de datos para desarrollo y E2E (solo la usa `/api/dev/seed`). Recorre los mismos casos de
 * uso que el panel, en el mismo orden, para que las cartas se compongan igual que en producción.
 */
export interface SeedSetInput {
  code: string;
  name: string;
  characterName: string;
  packSize: number;
  isAdult: boolean;
  /** `character`: personaje de la carta; si falta, el de la colección (`characterName`). */
  cards: { file: UploadFile; name: string; rarity: Rarity; character?: string }[];
  slots: Partial<Slot>[];
  /** Porcentaje 0-100, como en el formulario del panel. */
  holoPercent?: number;
}

const setVersion = async (db: DbLike, setId: string) => (await db.select({ v: sets.version }).from(sets).where(eq(sets.id, setId)))[0].v;

/** Fondo liso con un degradado del tamaño del lienzo, para armar las cartas de prueba. */
async function testBackground(hue: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${STORED_LAYER.width}" height="${STORED_LAYER.height}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="hsl(${hue},70%,72%)"/><stop offset="1" stop-color="hsl(${(hue + 60) % 360},65%,40%)"/>
    </linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Spec 017, RF-20: arma las cartas de una colección de prueba. Toma (o sube) un fondo de la biblioteca general y lo pone
 * a cada carta que no tenga fondo; la ilustración completa queda como chica (mientras no haya recortes).
 */
export async function assembleSetCards(db: DbLike, store: CardStore, actorUserId: string, setId: string, hue = 320) {
  const bg = await ensureLibraryImage(db, store, actorUserId, "fondo", { body: await testBackground(hue), mime: "image/png", filename: "Fondo de prueba.png" });
  const rows = await db.select().from(cards).where(eq(cards.setId, setId));
  for (const c of rows) {
    if (!c.layers || !missingParts(c.layers).includes("fondo")) continue;
    await saveCardLayers(db, store, actorUserId, c.id, { config: setBackground(c.layers, bg.key!), expectedVersion: c.version });
  }
  return bg;
}

/** Crea personaje y colección, sube las cartas, las completa (y revisa si es 18+), guarda probabilidades y publica. */
export async function seedPublishedSet(db: DbLike, store: CardStore, actorUserId: string, input: SeedSetInput) {
  const characters = new Map<string, string>();
  const characterId = async (name: string) => {
    if (!characters.has(name)) characters.set(name, (await createCharacter(db, actorUserId, { name })).id);
    return characters.get(name)!;
  };
  const set = await createSet(db, actorUserId, { code: input.code, name: input.name, isAdult: input.isAdult, packSize: input.packSize });
  for (const c of input.cards) {
    const uploaded = await uploadCardImage(db, store, actorUserId, set.id, c.file);
    const updated = await updateCard(db, store, actorUserId, uploaded.id, uploaded.version, {
      name: c.name,
      characterId: await characterId(c.character ?? input.characterName),
      rarity: c.rarity,
    });
    // RF-18 de la spec 003: en una colección 18+ cada carta pasa la revisión de personaje adulto.
    if (input.isAdult) await reviewCard(db, store, actorUserId, updated.id, updated.version, true);
  }
  await assembleSetCards(db, store, actorUserId, set.id);
  await saveOdds(db, actorUserId, set.id, await setVersion(db, set.id), { slots: input.slots, holoChance: (input.holoPercent ?? 0) / 100 });
  const { problems } = await publishSet(db, actorUserId, set.id, await setVersion(db, set.id));
  if (problems.length) throw new Error(`No se pudo publicar ${input.code}: ${problems.map((p) => p.message).join(" ")}`);
  return set.id;
}

/** Regala sobres a un usuario de desarrollo por su nombre; si aún no existe, se crea como lo haría el login. */
export async function seedGift(db: DbLike, actorUserId: string, input: { userName: string; setCode: string; count: number; reason: string }) {
  // Mismo nombre normalizado e id que el login de desarrollo (`src/auth.ts`).
  const name = input.userName.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  const patreonUserId = `dev:${name}`;
  let [user] = await db.select().from(users).where(eq(users.patreonUserId, patreonUserId));
  user ??= await upsertUserFromLogin(db, { patreonUserId, displayName: name, role: "user" });
  const [set] = await db.select({ id: sets.id }).from(sets).where(eq(sets.code, input.setCode));
  if (!set) throw new AdminError("not_found", "La colección no existe.", { entity: "set" });
  await giftPacks(db, actorUserId, { userId: user.id, setId: set.id, count: input.count, reason: input.reason });
  return user.id;
}
