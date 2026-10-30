import { inArray, and, asc, count, desc, eq, isNull, sql } from "drizzle-orm";
import { cards, dropTables, sets } from "@/db/schema";
import { canEdit, nextStatusAllowed, type EditableField, type SetStatus } from "@/domain/catalog/collection-rules";
import { validateOdds, type Problem, type Slot } from "@/domain/catalog/odds";
import { publishProblems } from "@/domain/catalog/publish-check";
import { PACK_KINDS, type PackKind, defaultSlots } from "@/domain/catalog/default-odds";
import type { DbLike } from "@/server/db-types";
import { AdminError, isUniqueViolation } from "@/server/errors";
import { auditChange, recordAudit } from "./audit";

const CODE_RE = /^[A-Z0-9]{2,8}$/;

function normalizeCode(raw: string) {
  const code = raw.trim().toUpperCase();
  if (!CODE_RE.test(code)) {
    throw new AdminError("invalid_code", "El código debe tener de 2 a 8 letras o números, sin espacios (por ejemplo WB01).", { min: 2, max: 8 });
  }
  return code;
}

function normalizeName(raw: string) {
  const name = raw.trim();
  if (!name || name.length > 80) throw new AdminError("invalid_name", "El nombre es obligatorio y admite hasta 80 caracteres.", { entity: "set", max: 80 });
  return name;
}

function normalizePackSize(n: number | undefined) {
  const size = n ?? 5;
  if (!Number.isInteger(size) || size < 1 || size > 10) {
    throw new AdminError("invalid_pack_size", "El sobre debe tener entre 1 y 10 cartas.", { min: 1, max: 10 });
  }
  return size;
}

/** RF-4: crea la colección en borrador con unas probabilidades iniciales editables. */
export async function createSet(
  db: DbLike,
  actorUserId: string,
  input: { code: string; name: string; isAdult: boolean; packSize?: number },
) {
  const code = normalizeCode(input.code);
  const name = normalizeName(input.name);
  const packSize = normalizePackSize(input.packSize);
  try {
    return await db.transaction(async (tx) => {
      const [set] = await tx
        .insert(sets)
        .values({ code, name, slug: code.toLowerCase(), isAdult: input.isAdult, packSize })
        .returning();
      // Spec 022, RF-12: una tabla por tipo de sobre.
      await tx.insert(dropTables).values(PACK_KINDS.map((kind) => ({ setId: set.id, kind, slots: defaultSlots(packSize, kind), pityThreshold: kind === "silver" ? 10 : 0 })));
      await recordAudit(tx, {
        actorUserId,
        action: "set_create",
        entityType: "set",
        entityId: set.id,
        after: { code, name, isAdult: input.isAdult, packSize },
      });
      return set;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AdminError("duplicate_code", `Ya existe una colección con el código ${code}.`, { code });
    throw e;
  }
}

export interface SetPatch {
  name?: string;
  isAdult?: boolean;
  packSize?: number;
}

const PATCH_FIELD: Record<keyof SetPatch, EditableField> = { name: "setName", isAdult: "isAdult", packSize: "packSize" };

/** RF-4 y RF-8: edita respetando el estado y la versión que tenía el formulario. */
export async function updateSet(db: DbLike, actorUserId: string, setId: string, expectedVersion: number, patch: SetPatch) {
  return db.transaction(async (tx) => {
    const [cur] = await tx.select().from(sets).where(eq(sets.id, setId)).for("update");
    if (!cur) throw new AdminError("not_found", "La colección no existe.", { entity: "set" });
    if (cur.version !== expectedVersion) {
      throw new AdminError("stale_version", "La colección cambió desde que la abriste. Recarga la página para ver los cambios.", { entity: "set" });
    }
    const next = {
      name: patch.name === undefined ? cur.name : normalizeName(patch.name),
      isAdult: patch.isAdult ?? cur.isAdult,
      packSize: patch.packSize === undefined ? cur.packSize : normalizePackSize(patch.packSize),
    };
    for (const key of Object.keys(PATCH_FIELD) as (keyof SetPatch)[]) {
      if (next[key] !== cur[key] && !canEdit(cur.status, PATCH_FIELD[key])) {
        throw new AdminError("locked", "Esta colección ya está publicada: solo puedes cambiar su nombre.", { what: "set" });
      }
    }
    const [updated] = await tx
      .update(sets)
      // Spec 021, RF-2: una colección 18+ nunca es gratuita.
      .set({ ...next, ...(next.isAdult ? { isFree: false } : {}), version: cur.version + 1, updatedAt: sql`now()` })
      .where(and(eq(sets.id, setId), eq(sets.version, expectedVersion)))
      .returning();
    if (next.isAdult !== cur.isAdult) {
      // Caso límite de la spec: al cambiar la clasificación, ninguna revisión 18+ previa vale.
      await tx.update(cards).set({ adultReviewedBy: null, adultReviewedAt: null }).where(eq(cards.setId, setId));
    }
    if (next.packSize !== cur.packSize) {
      for (const kind of PACK_KINDS) {
        await tx.update(dropTables).set({ slots: defaultSlots(next.packSize, kind), updatedAt: sql`now()` }).where(and(eq(dropTables.setId, setId), eq(dropTables.kind, kind)));
      }
    }
    await auditChange(tx, {
      actorUserId,
      action: "set_update",
      entityType: "set",
      entityId: setId,
      before: { name: cur.name, isAdult: cur.isAdult, packSize: cur.packSize },
      after: next,
    });
    return updated;
  });
}

export async function listSets(db: DbLike) {
  return db
    .select({
      id: sets.id,
      code: sets.code,
      name: sets.name,
      isAdult: sets.isAdult,
      status: sets.status,
      packSize: sets.packSize,
      isWelcome: sets.isWelcome,
      isFree: sets.isFree,
      updatedAt: sets.updatedAt,
      cardCount: count(cards.id),
    })
    .from(sets)
    .leftJoin(cards, eq(cards.setId, sets.id))
    .groupBy(sets.id)
    .orderBy(asc(sets.code));
}

/** Spec 021, RF-1 y RF-2: gratuita (sale en las fuentes gratis) o de Patreon; una 18+ nunca puede ser gratuita. */
export async function setFreeSet(db: DbLike, actorUserId: string, setId: string, free: boolean) {
  return db.transaction(async (tx) => {
    const [cur] = await tx.select().from(sets).where(eq(sets.id, setId)).for("update");
    if (!cur) throw new AdminError("not_found", "La colección no existe.", { entity: "set" });
    if (free && cur.isAdult) throw new AdminError("free_adult", "Una colección 18+ no puede ser gratuita.");
    if (cur.isFree === free) return cur;
    const [u] = await tx.update(sets).set({ isFree: free, updatedAt: sql`now()` }).where(eq(sets.id, setId)).returning();
    await recordAudit(tx, { actorUserId, action: "set.free", entityType: "set", entityId: setId, before: { isFree: cur.isFree }, after: { isFree: free } });
    return u;
  });
}

export async function getSet(db: DbLike, setId: string) {
  const [row] = await db.select().from(sets).where(eq(sets.id, setId)).limit(1);
  return row ?? null;
}

async function lockForTransition(db: DbLike, setId: string, expectedVersion: number) {
  const [cur] = await db.select().from(sets).where(eq(sets.id, setId)).for("update");
  if (!cur) throw new AdminError("not_found", "La colección no existe.", { entity: "set" });
  if (cur.version !== expectedVersion) {
    throw new AdminError("stale_version", "La colección cambió desde que la abriste. Recarga la página.", { entity: "set", variant: "short" });
  }
  return cur;
}

async function editableDropTable(db: DbLike, setId: string, kind: PackKind = "silver") {
  const [dt] = await db.select().from(dropTables).where(and(eq(dropTables.setId, setId), eq(dropTables.kind, kind))).orderBy(desc(dropTables.version)).limit(1);
  if (!dt) throw new AdminError("not_found", "La colección no tiene tabla de probabilidades.", { entity: "drop_table" });
  return dt;
}

/** RF-20: guarda pesos por ranura y probabilidad de holo de una colección en borrador. */
export async function saveOdds(
  db: DbLike,
  actorUserId: string,
  setId: string,
  expectedVersion: number,
  input: { slots: Partial<Slot>[]; holoChance: number; pityThreshold?: number; kind?: PackKind },
) {
  const kind = input.kind ?? "silver";
  if (input.pityThreshold !== undefined && (!Number.isInteger(input.pityThreshold) || input.pityThreshold < 0 || input.pityThreshold > 100)) {
    throw new AdminError("invalid_odds", "La protección debe ser un número entero de sobres entre 0 y 100 (0 la desactiva).", { field: "pity", min: 0, max: 100 });
  }
  return db.transaction(async (tx) => {
    const cur = await lockForTransition(tx, setId, expectedVersion);
    if (!canEdit(cur.status, "odds")) {
      throw new AdminError("locked", "Las probabilidades de una colección publicada no se pueden cambiar (RF-8).", { what: "odds" });
    }
    const problems = validateOdds(input.slots, cur.packSize, input.holoChance, kind);
    if (problems.length) {
      // Spec 008: los problemas viajan como JSON para traducir cada uno por su código.
      const encoded = JSON.stringify(problems.map((p) => ({ code: p.code, params: kind === "gold" ? { ...p.params, kind } : p.params })));
      throw new AdminError("invalid_odds", problems.map((p) => p.message).join(" "), { problems: encoded });
    }
    const dt = await editableDropTable(tx, setId, kind);
    if (dt.publishedAt) throw new AdminError("locked", "Esta versión de probabilidades ya está publicada.", { what: "odds_version" });
    const slots = input.slots.map((s) => ({ common: 0, rare: 0, epic: 0, legendary: 0, ex: 0, ...s }));
    // Spec 022, RF-18: la protección de mala suerte solo existe en el sobre plata.
    const pityThreshold = kind === "gold" ? 0 : (input.pityThreshold ?? dt.pityThreshold);
    await tx.update(dropTables).set({ slots, holoChance: input.holoChance, pityThreshold, updatedAt: sql`now()` }).where(eq(dropTables.id, dt.id));
    await tx.update(sets).set({ version: cur.version + 1, updatedAt: sql`now()` }).where(eq(sets.id, setId));
    await auditChange(tx, {
      actorUserId,
      action: "odds_update",
      entityType: "set",
      entityId: setId,
      before: { kind, slots: dt.slots, holoChance: dt.holoChance, pityThreshold: dt.pityThreshold },
      after: { kind, slots, holoChance: input.holoChance, pityThreshold },
    });
  });
}

/** RF-6, RF-7, RF-21: publica si no hay problemas; si los hay, los devuelve todos sin publicar. */
export async function publishSet(db: DbLike, actorUserId: string, setId: string, expectedVersion: number): Promise<{ problems: Problem[] }> {
  return db.transaction(async (tx) => {
    const cur = await lockForTransition(tx, setId, expectedVersion);
    if (!nextStatusAllowed(cur.status, "published")) {
      throw new AdminError("invalid_transition", "Solo se puede publicar una colección en borrador.", { action: "publish" });
    }
    const dt = await editableDropTable(tx, setId, "silver");
    // Spec 022, RF-13 y RF-16: se publican las dos tablas o ninguna.
    const [gold] = await tx.select().from(dropTables).where(and(eq(dropTables.setId, setId), eq(dropTables.kind, "gold"))).orderBy(desc(dropTables.version)).limit(1);
    const rows = await tx.select().from(cards).where(eq(cards.setId, setId));
    const problems = publishProblems({
      isAdult: cur.isAdult,
      packSize: cur.packSize,
      slots: dt.slots,
      holoChance: dt.holoChance,
      gold: gold ? { slots: gold.slots, holoChance: gold.holoChance } : null,
      cards: rows,
    });
    if (problems.length) return { problems };
    await tx.update(sets).set({ status: "published", publishedAt: sql`now()`, version: cur.version + 1, updatedAt: sql`now()` }).where(eq(sets.id, setId));
    await tx.update(dropTables).set({ publishedAt: sql`now()`, isPublic: true, updatedAt: sql`now()` }).where(inArray(dropTables.id, [dt.id, gold!.id]));
    await recordAudit(tx, { actorUserId, action: "set_publish", entityType: "set", entityId: setId, after: { cards: rows.length, dropTableVersion: dt.version } });
    return { problems: [] };
  });
}

/** RF-9: deja de conceder sobres de la colección; lo ya obtenido y los sobres sin abrir siguen intactos. */
export async function archiveSet(db: DbLike, actorUserId: string, setId: string, expectedVersion: number) {
  return db.transaction(async (tx) => {
    const cur = await lockForTransition(tx, setId, expectedVersion);
    if (!nextStatusAllowed(cur.status as SetStatus, "archived")) {
      throw new AdminError("invalid_transition", "Solo se puede archivar una colección publicada.", { action: "archive" });
    }
    // Una colección archivada deja de ser la de bienvenida (spec 001).
    await tx.update(sets).set({ status: "archived", archivedAt: sql`now()`, isWelcome: false, version: cur.version + 1, updatedAt: sql`now()` }).where(eq(sets.id, setId));
    await recordAudit(tx, { actorUserId, action: "set_archive", entityType: "set", entityId: setId });
  });
}

/** Probabilidades públicas de las colecciones publicadas o archivadas (RF-21); spec 022, RF-20: plata y gold. */
export async function listPublicOdds(db: DbLike) {
  const rows = await db
    .select({ set: sets, odds: dropTables })
    .from(dropTables)
    .innerJoin(sets, eq(sets.id, dropTables.setId))
    .where(and(eq(dropTables.isPublic, true), isNull(sets.archivedAt)))
    .orderBy(asc(sets.code), desc(dropTables.version));
  const out: { set: typeof sets.$inferSelect; odds: typeof dropTables.$inferSelect; gold: typeof dropTables.$inferSelect | null }[] = [];
  for (const r of rows) {
    if (r.odds.kind !== "silver" || out.some((o) => o.set.id === r.set.id)) continue;
    out.push({ set: r.set, odds: r.odds, gold: rows.find((g) => g.set.id === r.set.id && g.odds.kind === "gold")?.odds ?? null });
  }
  return out;
}
