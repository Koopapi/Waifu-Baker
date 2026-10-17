import { randomBytes } from "node:crypto";
import { and, asc, count, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { cards, dropTables, packOpenings, packs, pityCounters, sets, userCards, users } from "@/db/schema";
import type { Rarity } from "@/domain/catalog/card-rules";
import { drawPackWithPity } from "@/domain/catalog/draw";
import { isEpicPlus, nextPityCounter, pityActive } from "@/domain/catalog/pity";
import { hmacRng } from "@/domain/random";
import type { DbLike } from "@/server/db-types";
import { AppError } from "@/server/errors";

/** v2 (spec 014, RF-21): sin cartas repetidas dentro del sobre. Las aperturas guardan su versión (RF-22). */
export const RNG_VERSION = "hmac-sha256-v2";
const OPEN_ALL_MAX = 50;

export interface OpenedCard {
  cardId: string;
  number: number;
  name: string;
  rarity: Rarity;
  holo: boolean;
  /** Primera vez que el usuario obtiene esta versión (normal u holo) de la carta. */
  isNew: boolean;
  qtyAfter: number;
  /** La protección de mala suerte sustituyó esta carta. */
  pity: boolean;
}

export interface OpeningResult {
  openingId: string;
  packId: string;
  setId: string;
  setCode: string;
  pityApplied: boolean;
  cards: OpenedCard[];
}

interface StoredRoll {
  slot: number;
  rarity: Rarity;
  cardId: string;
  holo: boolean;
  pity: boolean;
  isNew: boolean;
  qtyAfter: number;
}

interface StoredRolls {
  pityActive: boolean;
  pityUnavailable: boolean;
  draws: StoredRoll[];
}

const notFound = () => new AppError("not_found", "Ese sobre no existe.", { entity: "pack" });

/** Reconstruye el resultado guardado (RF-6, RF-17). */
async function resultFromOpening(db: DbLike, packId: string): Promise<OpeningResult> {
  const [row] = await db
    .select({ opening: packOpenings, setId: sets.id, setCode: sets.code })
    .from(packOpenings)
    .innerJoin(packs, eq(packs.id, packOpenings.packId))
    .innerJoin(sets, eq(sets.id, packs.setId))
    .where(eq(packOpenings.packId, packId));
  if (!row) throw notFound();
  const rolls = row.opening.rolls as StoredRolls;
  const ids = rolls.draws.map((d) => d.cardId);
  const info = await db.select({ id: cards.id, number: cards.number, name: cards.name }).from(cards).where(inArray(cards.id, ids));
  const byId = new Map(info.map((c) => [c.id, c]));
  return {
    openingId: row.opening.id,
    packId,
    setId: row.setId,
    setCode: row.setCode,
    pityApplied: row.opening.pityApplied,
    cards: rolls.draws.map((d) => ({
      cardId: d.cardId,
      number: byId.get(d.cardId)?.number ?? 0,
      name: byId.get(d.cardId)?.name ?? "",
      rarity: d.rarity,
      holo: d.holo,
      isNew: d.isNew,
      qtyAfter: d.qtyAfter,
      pity: d.pity,
    })),
  };
}

/**
 * RF-5 a RF-11 y RF-13/RF-14: abre un sobre en una transacción. El contenido lo decide el servidor
 * con una semilla aleatoria de 32 bytes; si el sobre ya estaba abierto, devuelve lo guardado.
 */
export async function openPack(
  db: DbLike,
  input: { userId: string; packId: string; country?: string | null; seed?: Buffer },
): Promise<OpeningResult> {
  if (input.country?.toUpperCase() === "BE") {
    throw new AppError(
      "geo_blocked",
      "En Bélgica la ley trata los sobres con contenido aleatorio como juego de azar, así que no se pueden abrir desde allí. Tus sobres se conservan.",
    );
  }
  return db.transaction(async (tx) => {
    const [pack] = await tx.select().from(packs).where(eq(packs.id, input.packId)).for("update");
    if (!pack || pack.userId !== input.userId || pack.status === "void") throw notFound();
    if (pack.status === "opened") return resultFromOpening(tx, pack.id);

    const [user] = await tx.select().from(users).where(eq(users.id, input.userId));
    if (!user || user.deletedAt) throw notFound();
    const [set] = await tx.select().from(sets).where(eq(sets.id, pack.setId));
    if (set.isAdult && !(user.isAdultDeclared && user.adultVerifiedAt)) {
      throw new AppError("age_not_verified", "Este sobre es de una colección 18+: verifica tu edad para abrirlo.", { context: "open" });
    }
    const [odds] = await tx
      .select()
      .from(dropTables)
      .where(and(eq(dropTables.setId, set.id), isNotNull(dropTables.publishedAt)))
      .orderBy(desc(dropTables.version))
      .limit(1);
    if (!odds) throw new AppError("not_published", "Esta colección aún no tiene probabilidades publicadas.");
    // Orden fijo: con la misma semilla, la apertura debe dar siempre las mismas cartas (auditoría, spec 004).
    const pool = await tx
      .select()
      .from(cards)
      .where(and(eq(cards.setId, set.id), isNotNull(cards.rarity)))
      .orderBy(asc(cards.number), asc(cards.variant), asc(cards.id));
    const byId = new Map(pool.map((c) => [c.id, c]));

    await tx.insert(pityCounters).values({ userId: user.id, setId: set.id }).onConflictDoNothing();
    const [counter] = await tx
      .select()
      .from(pityCounters)
      .where(and(eq(pityCounters.userId, user.id), eq(pityCounters.setId, set.id)))
      .for("update");
    const active = pityActive(counter.packsSinceEpic, odds.pityThreshold);

    const seed = input.seed ?? randomBytes(32);
    const result = drawPackWithPity({ cards: pool, slots: odds.slots, holoChance: odds.holoChance }, hmacRng(seed), active, { unique: true });

    const draws: StoredRoll[] = [];
    for (const d of result.draws) {
      const [inv] = await tx
        .insert(userCards)
        .values({ userId: user.id, cardId: d.cardId, holo: d.holo })
        .onConflictDoUpdate({
          target: [userCards.userId, userCards.cardId, userCards.holo],
          set: { qty: sql`${userCards.qty} + 1`, lastObtainedAt: sql`now()` },
        })
        .returning({ qty: userCards.qty });
      draws.push({ slot: d.slot, rarity: d.rarity, cardId: d.cardId, holo: d.holo, pity: Boolean(d.pity), isNew: inv.qty === 1, qtyAfter: inv.qty });
    }

    const rolls: StoredRolls = { pityActive: active, pityUnavailable: Boolean(result.pityUnavailable), draws };
    const [opening] = await tx
      .insert(packOpenings)
      .values({
        packId: pack.id,
        userId: user.id,
        dropTableId: odds.id,
        serverSeed: seed.toString("hex"),
        rngVersion: RNG_VERSION,
        rolls,
        cardIds: draws.map((d) => d.cardId),
        pityApplied: result.pityApplied,
      })
      .returning();
    await tx.update(packs).set({ status: "opened", openedAt: sql`now()` }).where(eq(packs.id, pack.id));
    await tx
      .update(pityCounters)
      .set({ packsSinceEpic: nextPityCounter(counter.packsSinceEpic, draws.some((d) => isEpicPlus(d.rarity))), updatedAt: sql`now()` })
      .where(and(eq(pityCounters.userId, user.id), eq(pityCounters.setId, set.id)));

    return {
      openingId: opening.id,
      packId: pack.id,
      setId: set.id,
      setCode: set.code,
      pityApplied: result.pityApplied,
      cards: draws.map((d) => ({
        cardId: d.cardId,
        number: byId.get(d.cardId)!.number,
        name: byId.get(d.cardId)!.name,
        rarity: d.rarity,
        holo: d.holo,
        isNew: d.isNew,
        qtyAfter: d.qtyAfter,
        pity: d.pity,
      })),
    };
  });
}

/** RF-18 y RF-19: abre por separado los sobres sellados de una colección (hasta 50). */
export async function openAllPacks(
  db: DbLike,
  input: { userId: string; setId: string; country?: string | null; limit?: number },
): Promise<OpeningResult[]> {
  const limit = Math.min(input.limit ?? OPEN_ALL_MAX, OPEN_ALL_MAX);
  const sealed = await db
    .select({ id: packs.id })
    .from(packs)
    .where(and(eq(packs.userId, input.userId), eq(packs.setId, input.setId), eq(packs.status, "sealed")))
    .orderBy(asc(packs.grantedAt))
    .limit(limit);
  const out: OpeningResult[] = [];
  for (const p of sealed) out.push(await openPack(db, { userId: input.userId, packId: p.id, country: input.country }));
  return out;
}

/** Resultado de una apertura propia (para reanudar o volver a ver). */
export async function getOpeningResult(db: DbLike, userId: string, packId: string) {
  const [pack] = await db.select().from(packs).where(eq(packs.id, packId));
  if (!pack || pack.userId !== userId || pack.status !== "opened") return null;
  return resultFromOpening(db, packId);
}

/** RF-1 y RF-3: sobres sellados por colección; los 18+ sin verificación salen bloqueados. */
export async function listMyPacks(db: DbLike, userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return [];
  const verified = Boolean(user.isAdultDeclared && user.adultVerifiedAt);
  const rows = await db
    .select({ setId: sets.id, code: sets.code, name: sets.name, isAdult: sets.isAdult, status: sets.status, sealed: count(packs.id) })
    .from(packs)
    .innerJoin(sets, eq(sets.id, packs.setId))
    .where(and(eq(packs.userId, userId), eq(packs.status, "sealed")))
    .groupBy(sets.id)
    .orderBy(asc(sets.code));
  return rows.map((r) => ({ ...r, locked: r.isAdult && !verified }));
}

/** RF-17: la última apertura que el usuario no llegó a terminar de ver. */
export async function pendingOpening(db: DbLike, userId: string) {
  const [row] = await db
    .select({ packId: packOpenings.packId, setId: packs.setId })
    .from(packOpenings)
    .innerJoin(packs, eq(packs.id, packOpenings.packId))
    .where(and(eq(packOpenings.userId, userId), isNull(packOpenings.clientAckAt)))
    .orderBy(desc(packOpenings.openedAt))
    .limit(1);
  return row ?? null;
}

/** El usuario terminó de ver estas aperturas. */
export async function ackOpenings(db: DbLike, userId: string, packIds: string[]) {
  if (packIds.length === 0) return;
  await db
    .update(packOpenings)
    .set({ clientAckAt: sql`now()` })
    .where(and(eq(packOpenings.userId, userId), inArray(packOpenings.packId, packIds), isNull(packOpenings.clientAckAt)));
}
