import { eq } from "drizzle-orm";
import { sets, users } from "@/db/schema";
import type { Rarity } from "@/domain/catalog/card-rules";
import type { Slot } from "@/domain/catalog/odds";
import type { CardStore } from "@/server/ports/card-store";
import type { DbLike } from "@/server/db-types";
import { AdminError } from "@/server/errors";
import { createCharacter } from "./characters";
import { reviewCard, updateCard, uploadCardImage, type UploadFile } from "./cards";
import { createSet, publishSet, saveOdds } from "./collections";
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
  cards: { file: UploadFile; name: string; rarity: Rarity }[];
  slots: Partial<Slot>[];
  /** Porcentaje 0-100, como en el formulario del panel. */
  holoPercent?: number;
}

const setVersion = async (db: DbLike, setId: string) => (await db.select({ v: sets.version }).from(sets).where(eq(sets.id, setId)))[0].v;

/** Crea personaje y colección, sube las cartas, las completa (y revisa si es 18+), guarda probabilidades y publica. */
export async function seedPublishedSet(db: DbLike, store: CardStore, actorUserId: string, input: SeedSetInput) {
  const character = await createCharacter(db, actorUserId, { name: input.characterName });
  const set = await createSet(db, actorUserId, { code: input.code, name: input.name, isAdult: input.isAdult, packSize: input.packSize });
  for (const c of input.cards) {
    const uploaded = await uploadCardImage(db, store, actorUserId, set.id, c.file);
    const updated = await updateCard(db, store, actorUserId, uploaded.id, uploaded.version, { name: c.name, characterId: character.id, rarity: c.rarity });
    // RF-18 de la spec 003: en una colección 18+ cada carta pasa la revisión de personaje adulto.
    if (input.isAdult) await reviewCard(db, store, actorUserId, updated.id, updated.version, true);
  }
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
