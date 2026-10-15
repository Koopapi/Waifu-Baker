import { asc, count, eq, sql } from "drizzle-orm";
import { cards, characters } from "@/db/schema";
import { slugify } from "@/domain/text/slug";
import type { DbLike } from "@/server/db-types";
import { AdminError, isUniqueViolation } from "@/server/errors";
import { auditChange, recordAudit } from "./audit";

function cleanName(raw: string) {
  const name = raw.trim();
  if (!name || name.length > 60) throw new AdminError("invalid_name", "El nombre es obligatorio y admite hasta 60 caracteres.", { entity: "character", max: 60 });
  return name;
}

/** RF-10: el identificador se deriva del nombre al crear y no cambia después. */
export async function createCharacter(db: DbLike, actorUserId: string, input: { name: string; bio?: string; identityTags?: string }) {
  const name = cleanName(input.name);
  const slug = slugify(name);
  if (!slug) throw new AdminError("invalid_name", "El nombre debe contener letras o números.", { reason: "no_alnum" });
  try {
    return await db.transaction(async (tx) => {
      const [c] = await tx
        .insert(characters)
        .values({ name, slug, bio: (input.bio ?? "").trim(), identityTags: (input.identityTags ?? "").trim() })
        .returning();
      await recordAudit(tx, { actorUserId, action: "character_create", entityType: "character", entityId: c.id, after: { name, slug } });
      return c;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AdminError("duplicate_slug", `Ya existe un personaje con el identificador «${slug}».`, { slug });
    throw e;
  }
}

export async function updateCharacter(
  db: DbLike,
  actorUserId: string,
  id: string,
  patch: { name?: string; bio?: string; identityTags?: string },
) {
  return db.transaction(async (tx) => {
    const [cur] = await tx.select().from(characters).where(eq(characters.id, id)).for("update");
    if (!cur) throw new AdminError("not_found", "El personaje no existe.", { entity: "character" });
    const next = {
      name: patch.name === undefined ? cur.name : cleanName(patch.name),
      bio: patch.bio === undefined ? cur.bio : patch.bio.trim(),
      identityTags: patch.identityTags === undefined ? cur.identityTags : patch.identityTags.trim(),
    };
    const [u] = await tx.update(characters).set({ ...next, updatedAt: sql`now()` }).where(eq(characters.id, id)).returning();
    await auditChange(tx, {
      actorUserId,
      action: "character_update",
      entityType: "character",
      entityId: id,
      before: { name: cur.name, bio: cur.bio, identityTags: cur.identityTags },
      after: next,
    });
    return u;
  });
}

/** Caso límite de la spec: no se borra un personaje que tiene cartas asignadas. */
export async function deleteCharacter(db: DbLike, actorUserId: string, id: string) {
  return db.transaction(async (tx) => {
    const [{ n }] = await tx.select({ n: count() }).from(cards).where(eq(cards.characterId, id));
    if (n > 0) {
      throw new AdminError("character_in_use", `Este personaje tiene ${n} carta(s). Reasígnalas antes de borrarlo.`, { count: n });
    }
    const [gone] = await tx.delete(characters).where(eq(characters.id, id)).returning();
    if (!gone) throw new AdminError("not_found", "El personaje no existe.", { entity: "character" });
    await recordAudit(tx, { actorUserId, action: "character_delete", entityType: "character", entityId: id, before: { name: gone.name } });
  });
}

export async function listCharacters(db: DbLike) {
  return db
    .select({
      id: characters.id,
      name: characters.name,
      slug: characters.slug,
      bio: characters.bio,
      identityTags: characters.identityTags,
      cardCount: count(cards.id),
    })
    .from(characters)
    .leftJoin(cards, eq(cards.characterId, characters.id))
    .groupBy(characters.id)
    .orderBy(asc(characters.name));
}
