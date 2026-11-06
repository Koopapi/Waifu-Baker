// Spec 029: reciclar repetidas, polvo y fabricar, la línea de personaje y el simulador del vínculo. Reciclar y fabricar
// son transacciones con bloqueo de fila (como abrir un sobre): el servidor decide todo y no hay azar.
import { and, asc, desc, eq, gt, inArray, isNotNull, sql } from "drizzle-orm";
import { cards, characterBonds, characters, dropTables, sets, userCards, userRewards, users } from "@/db/schema";
import { RARITIES, type Rarity } from "@/domain/catalog/card-rules";
import { craftCost, craftProblem, type CraftProblem } from "@/domain/bonds/craft";
import { nextUnlock, titleLevel } from "@/domain/bonds/effects";
import { planRecycle, recyclableCopies, type RecycleItem, type RecyclePlan } from "@/domain/bonds/recycle";
import { PACE, daysToMaxBond } from "@/domain/bonds/simulate";
import { bondProgress } from "@/domain/expeditions/rules";
import type { DbLike } from "@/server/db-types";
import { AppError } from "@/server/errors";
import { recordAudit } from "./audit";
import { getBondSettings } from "./settings";

const VISIBLE = ["published", "archived"] as const;
const rank = (r: Rarity | null) => (r ? RARITIES.indexOf(r) : -1);

async function activeUser(db: DbLike, userId: string) {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u || u.deletedAt) throw new AppError("not_found", "El usuario no existe.", { entity: "user" });
  return { ...u, adultUnlocked: Boolean(u.isAdultDeclared && u.adultVerifiedAt) };
}

/** Las cartas con rareza de un personaje en las colecciones que el usuario puede ver (las 18+, con el doble filtro). */
async function lineCards(db: DbLike, characterId: string, adultUnlocked: boolean) {
  const rows = await db
    .select({ card: cards, set: sets })
    .from(cards)
    .innerJoin(sets, eq(sets.id, cards.setId))
    .where(and(eq(cards.characterId, characterId), isNotNull(cards.rarity), inArray(sets.status, [...VISIBLE])));
  return rows
    .filter((r) => adultUnlocked || !r.set.isAdult)
    .sort((a, b) => a.set.code.localeCompare(b.set.code) || rank(a.card.rarity) - rank(b.card.rarity) || a.card.number - b.card.number);
}

async function bondXp(db: DbLike, userId: string, characterId: string, lock = false) {
  if (lock) {
    await db.insert(characterBonds).values({ userId, characterId, xp: 0 }).onConflictDoNothing();
    const [row] = await db.select().from(characterBonds).where(and(eq(characterBonds.userId, userId), eq(characterBonds.characterId, characterId))).for("update");
    return row.xp;
  }
  const [row] = await db.select().from(characterBonds).where(and(eq(characterBonds.userId, userId), eq(characterBonds.characterId, characterId)));
  return row?.xp ?? 0;
}

async function lockRewards(db: DbLike, userId: string) {
  await db.insert(userRewards).values({ userId }).onConflictDoNothing();
  const [row] = await db.select().from(userRewards).where(eq(userRewards.userId, userId)).for("update");
  return row;
}

/** Polvo del coleccionista (RF-17); 0 si aún no tiene fila de recompensas. */
export async function dustOf(db: DbLike, userId: string) {
  const [row] = await db.select({ dust: userRewards.dust }).from(userRewards).where(eq(userRewards.userId, userId));
  return row?.dust ?? 0;
}

/** Niveles de vínculo del usuario con varios personajes (los que no tiene, 1). */
export async function bondLevelsOf(db: DbLike, userId: string, characterIds: string[]): Promise<Map<string, number>> {
  const ids = [...new Set(characterIds)];
  if (ids.length === 0) return new Map();
  const rows = await db.select().from(characterBonds).where(and(eq(characterBonds.userId, userId), inArray(characterBonds.characterId, ids)));
  const xp = new Map(rows.map((r) => [r.characterId, r.xp]));
  return new Map(ids.map((id) => [id, bondProgress(xp.get(id) ?? 0).level]));
}

/** Qué reciclar: una versión de una carta (todas sus repetidas o `copies`) o todas las repetidas de un personaje (RF-5). */
export type RecycleTarget = { cardId: string; holo: boolean; copies?: number } | { characterId: string };

interface Resolved {
  characterId: string;
  rows: { cardId: string; holo: boolean; qty: number; rarity: Rarity; take: number }[];
}

async function resolveTarget(db: DbLike, userId: string, adultUnlocked: boolean, target: RecycleTarget, lock: boolean): Promise<Resolved> {
  let characterId: string;
  let cardIds: string[];
  if ("characterId" in target) {
    characterId = target.characterId;
    cardIds = (await lineCards(db, characterId, adultUnlocked)).map((r) => r.card.id);
  } else {
    const [row] = await db.select({ card: cards, set: sets }).from(cards).innerJoin(sets, eq(sets.id, cards.setId)).where(eq(cards.id, target.cardId));
    if (!row || !VISIBLE.includes(row.set.status as (typeof VISIBLE)[number]) || (row.set.isAdult && !adultUnlocked)) throw new AppError("not_found", "Esa carta no existe.", { entity: "card" });
    // Caso límite: una carta sin personaje no se recicla.
    if (!row.card.characterId || !row.card.rarity) throw new AppError("no_character", "Esta carta no tiene personaje: no se puede reciclar.");
    characterId = row.card.characterId;
    cardIds = [row.card.id];
  }
  if (cardIds.length === 0) return { characterId, rows: [] };
  const q = db
    .select({ cardId: userCards.cardId, holo: userCards.holo, qty: userCards.qty, rarity: cards.rarity })
    .from(userCards)
    .innerJoin(cards, eq(cards.id, userCards.cardId))
    .where(and(eq(userCards.userId, userId), inArray(userCards.cardId, cardIds), gt(userCards.qty, 1)))
    .orderBy(asc(userCards.cardId), asc(userCards.holo));
  // RF-6: las filas se bloquean y la cantidad se lee bloqueada: otra petición a la vez espera y ve lo que queda.
  const owned = lock ? await q.for("update", { of: userCards }) : await q;
  const rows = owned
    .filter((o) => ("characterId" in target ? true : o.holo === target.holo))
    .map((o) => {
      const max = recyclableCopies(o.qty);
      const want = "copies" in target && target.copies !== undefined ? Math.max(0, Math.floor(target.copies)) : max;
      return { cardId: o.cardId, holo: o.holo, qty: o.qty, rarity: o.rarity as Rarity, take: Math.min(max, want) };
    })
    .filter((o) => o.take > 0);
  return { characterId, rows };
}

const itemsOf = (r: Resolved): RecycleItem[] => r.rows.map((o) => ({ rarity: o.rarity, holo: o.holo, copies: o.take }));

/** RF-4: lo que daría reciclar (copias, puntos, polvo y nivel en que queda), sin cambiar nada. */
export async function previewRecycle(db: DbLike, userId: string, target: RecycleTarget): Promise<RecyclePlan & { characterId: string }> {
  const u = await activeUser(db, userId);
  const r = await resolveTarget(db, userId, u.adultUnlocked, target, false);
  const plan = planRecycle(itemsOf(r), await bondXp(db, userId, r.characterId), await getBondSettings(db));
  return { ...plan, characterId: r.characterId };
}

/**
 * RF-1 a RF-3, RF-5 a RF-7: recicla las repetidas en una transacción. Cada versión conserva su copia; los puntos van al
 * vínculo del personaje (la misma barra que las expediciones, RF-8) y el polvo al coleccionista.
 */
export async function recycle(db: DbLike, userId: string, target: RecycleTarget): Promise<RecyclePlan & { characterId: string }> {
  return db.transaction(async (tx) => {
    const u = await activeUser(tx, userId);
    // Orden de bloqueo fijo (recompensas → cartas → vínculo) para no cruzarse con otra transacción.
    await lockRewards(tx, userId);
    const r = await resolveTarget(tx, userId, u.adultUnlocked, target, true);
    if (r.rows.length === 0) throw new AppError("nothing_to_recycle", "No hay repetidas que reciclar: cada versión conserva una copia.");
    const xp = await bondXp(tx, userId, r.characterId, true);
    // Caso límite: cada reciclaje usa los ajustes del momento en que se confirma.
    const plan = planRecycle(itemsOf(r), xp, await getBondSettings(tx));
    for (const o of r.rows) {
      await tx
        .update(userCards)
        .set({ qty: sql`${userCards.qty} - ${o.take}` })
        .where(and(eq(userCards.userId, userId), eq(userCards.cardId, o.cardId), eq(userCards.holo, o.holo)));
    }
    if (plan.points > 0) {
      await tx.update(characterBonds).set({ xp: sql`${characterBonds.xp} + ${plan.points}`, updatedAt: sql`now()` }).where(and(eq(characterBonds.userId, userId), eq(characterBonds.characterId, r.characterId)));
    }
    await tx.update(userRewards).set({ dust: sql`${userRewards.dust} + ${plan.dust}`, updatedAt: sql`now()` }).where(eq(userRewards.userId, userId));
    await recordAudit(tx, {
      actorUserId: userId,
      action: "bond_recycle",
      entityType: "character",
      entityId: r.characterId,
      meta: { cards: r.rows.map((o) => ({ cardId: o.cardId, holo: o.holo, copies: o.take })), copies: plan.copies, points: plan.points, dust: plan.dust, levelBefore: plan.levelBefore, levelAfter: plan.levelAfter },
    });
    return { ...plan, characterId: r.characterId };
  });
}

/** RF-18 a RF-21: fabrica con polvo una copia normal de una carta (nunca holo ni EX). */
export async function craftCard(db: DbLike, userId: string, cardId: string) {
  return db.transaction(async (tx) => {
    const u = await activeUser(tx, userId);
    const rewards = await lockRewards(tx, userId);
    const [row] = await tx.select({ card: cards, set: sets }).from(cards).innerJoin(sets, eq(sets.id, cards.setId)).where(eq(cards.id, cardId));
    if (!row || row.set.status === "draft" || (row.set.isAdult && !u.adultUnlocked)) throw new AppError("not_found", "Esa carta no existe.", { entity: "card" });
    const s = await getBondSettings(tx);
    const problem = craftProblem({ rarity: row.card.rarity, setStatus: row.set.status, setIsAdult: row.set.isAdult, adultUnlocked: u.adultUnlocked, dust: rewards.dust }, s);
    if (problem) throw new AppError("cannot_craft", "No se puede fabricar esta carta.", { reason: problem, cost: craftCost(row.card.rarity, s) ?? 0, dust: rewards.dust });
    const cost = craftCost(row.card.rarity, s)!;
    await tx.update(userRewards).set({ dust: sql`${userRewards.dust} - ${cost}`, updatedAt: sql`now()` }).where(eq(userRewards.userId, userId));
    const [inv] = await tx
      .insert(userCards)
      .values({ userId, cardId, holo: false })
      .onConflictDoUpdate({ target: [userCards.userId, userCards.cardId, userCards.holo], set: { qty: sql`${userCards.qty} + 1`, lastObtainedAt: sql`now()` } })
      .returning({ qty: userCards.qty });
    await recordAudit(tx, { actorUserId: userId, action: "bond_craft", entityType: "card", entityId: cardId, meta: { rarity: row.card.rarity, cost, dustBefore: rewards.dust, dustAfter: rewards.dust - cost } });
    return { cardId, cost, dust: rewards.dust - cost, qty: inv.qty };
  });
}

export interface LineCard {
  cardId: string;
  setCode: string;
  number: number;
  name: string;
  rarity: Rarity;
  owned: { normal: number; holo: number };
  recyclable: { normal: number; holo: number };
  craft: { cost: number | null; problem: CraftProblem | null };
}

/** RF-15: la línea de un personaje para el coleccionista: sus cartas, el vínculo, el polvo y lo que se puede hacer. */
export async function characterLine(db: DbLike, userId: string, characterId: string) {
  const u = await activeUser(db, userId);
  const [character] = await db.select({ id: characters.id, name: characters.name }).from(characters).where(eq(characters.id, characterId));
  if (!character) return null;
  const line = await lineCards(db, characterId, u.adultUnlocked);
  if (line.length === 0) return null;
  const [owned, xp, dust, s] = await Promise.all([
    db
      .select()
      .from(userCards)
      .where(and(eq(userCards.userId, userId), inArray(userCards.cardId, line.map((l) => l.card.id)))),
    bondXp(db, userId, characterId),
    dustOf(db, userId),
    getBondSettings(db),
  ]);
  const qty = (cardId: string, holo: boolean) => owned.find((o) => o.cardId === cardId && o.holo === holo)?.qty ?? 0;
  const cardsOut: LineCard[] = line.map(({ card, set }) => ({
    cardId: card.id,
    setCode: set.code,
    number: card.number,
    name: card.name,
    rarity: card.rarity as Rarity,
    owned: { normal: qty(card.id, false), holo: qty(card.id, true) },
    recyclable: { normal: recyclableCopies(qty(card.id, false)), holo: recyclableCopies(qty(card.id, true)) },
    craft: { cost: craftCost(card.rarity, s), problem: craftProblem({ rarity: card.rarity, setStatus: set.status, setIsAdult: set.isAdult, adultUnlocked: u.adultUnlocked, dust }, s) },
  }));
  const progress = bondProgress(xp);
  const tl = titleLevel(progress.level);
  return {
    character,
    bond: { ...progress, titleLevel: tl, customTitle: tl ? (s.titles[`${tl}`] ?? null) : null, next: nextUnlock(progress.level) },
    dust,
    cards: cardsOut,
    recyclableTotal: cardsOut.reduce((a, c) => a + c.recyclable.normal + c.recyclable.holo, 0),
  };
}

/** Los personajes con cartas de una colección (para el simulador del panel). */
export async function simulationOptions(db: DbLike) {
  return db
    .selectDistinct({ setId: sets.id, setCode: sets.code, characterId: characters.id, characterName: characters.name })
    .from(cards)
    .innerJoin(sets, eq(sets.id, cards.setId))
    .innerJoin(characters, eq(characters.id, cards.characterId))
    .where(and(eq(sets.status, "published"), isNotNull(cards.rarity)))
    .orderBy(asc(sets.code), asc(characters.name));
}

/** RF-23: días hasta el nivel 10 del personaje en esa colección, para un coleccionista gratuito y un patron. */
export async function simulateBond(db: DbLike, setId: string, characterId: string) {
  const setCards = await db.select({ rarity: cards.rarity, characterId: cards.characterId }).from(cards).where(and(eq(cards.setId, setId), isNotNull(cards.rarity)));
  const tables = await db.select().from(dropTables).where(eq(dropTables.setId, setId)).orderBy(desc(dropTables.version));
  const silver = tables.find((t) => t.kind === "silver");
  const gold = tables.find((t) => t.kind === "gold");
  if (!silver || setCards.length === 0) return null;
  const s = await getBondSettings(db);
  const input = {
    character: setCards.filter((c) => c.characterId === characterId).map((c) => c.rarity as Rarity),
    setCards: setCards.map((c) => c.rarity as Rarity),
    silver: { slots: silver.slots, holoChance: silver.holoChance },
    gold: gold ? { slots: gold.slots, holoChance: gold.holoChance } : null,
    settings: s,
  };
  return { free: daysToMaxBond({ ...input, pace: PACE.free }), patron: daysToMaxBond({ ...input, pace: PACE.patron }), cards: input.character.length };
}

/** El personaje de cada carta (para enlazar su línea desde la ficha). */
export async function characterOfCards(db: DbLike, cardIds: string[]): Promise<Map<string, string>> {
  if (cardIds.length === 0) return new Map();
  const rows = await db.select({ id: cards.id, characterId: cards.characterId }).from(cards).where(inArray(cards.id, cardIds));
  return new Map(rows.flatMap((r) => (r.characterId ? [[r.id, r.characterId] as const] : [])));
}
