// Spec 020: Expediciones del coleccionista. El servidor decide con su reloj y su RNG (constitución, principio 3): la
// vuelta, la calificación, el botín y el sobre al azar se guardan antes de responder; la web solo los enseña.
import { randomBytes } from "node:crypto";
import { and, asc, count, eq, inArray, lte, sql } from "drizzle-orm";
import {
  cards,
  characterBonds,
  characters,
  cookieLedger,
  expeditionCards,
  expeditionProfiles,
  expeditionZoneUnlocks,
  expeditionZones,
  expeditions,
  packs,
  sets,
  userCards,
  userRewards,
  users,
  type ExpeditionMember,
  type ExpeditionResult,
} from "@/db/schema";
import type { Rarity } from "@/domain/catalog/card-rules";
import { hmacRng } from "@/domain/random";
import { phraseCount, pickPhrases, rollPack } from "@/domain/expeditions/report";
import { BOND_XP, TEAM_MAX, bondLevel, isDuration, lootFor, rateTeam, slotsFor, teamPower, type Role, type TeamMember, type Terrain } from "@/domain/expeditions/rules";
import type { DbLike } from "@/server/db-types";
import { AppError, isUniqueViolation } from "@/server/errors";
import { isPatronUser } from "./patron";
import { claimableSet, claimableSets } from "./rewards";

export interface CardChoice {
  cardId: string;
  holo: boolean;
}

export type Expedition = typeof expeditions.$inferSelect;

async function activeUser(db: DbLike, userId: string) {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u || u.deletedAt) throw new AppError("not_found", "El usuario no existe.", { entity: "user" });
  return u;
}

const adultUnlocked = (u: { isAdultDeclared: boolean; adultVerifiedAt: Date | null }) => Boolean(u.isAdultDeclared && u.adultVerifiedAt);

/** Perfil del coleccionista bloqueado para la transacción (se crea al primer uso). */
async function lockProfile(db: DbLike, userId: string) {
  await db.insert(expeditionProfiles).values({ userId }).onConflictDoNothing();
  const [row] = await db.select().from(expeditionProfiles).where(eq(expeditionProfiles.userId, userId)).for("update");
  return row;
}

async function bondLevels(db: DbLike, userId: string, characterIds: string[]): Promise<Map<string, number>> {
  if (characterIds.length === 0) return new Map();
  const rows = await db
    .select()
    .from(characterBonds)
    .where(and(eq(characterBonds.userId, userId), inArray(characterBonds.characterId, characterIds)));
  return new Map(rows.map((r) => [r.characterId, r.xp]));
}

/** Cartas del coleccionista que puede mandar, con sus rasgos (RF-9: las 18+ solo con el contenido 18+ desbloqueado). */
async function ownedCards(db: DbLike, userId: string, adult: boolean) {
  return db
    .select({
      cardId: cards.id,
      holo: userCards.holo,
      qty: userCards.qty,
      name: cards.name,
      number: cards.number,
      rarity: cards.rarity,
      setId: sets.id,
      setCode: sets.code,
      isAdult: sets.isAdult,
      characterId: cards.characterId,
      characterName: characters.name,
      terrain: characters.terrain,
      role: characters.role,
    })
    .from(userCards)
    .innerJoin(cards, eq(cards.id, userCards.cardId))
    .innerJoin(sets, eq(sets.id, cards.setId))
    .leftJoin(characters, eq(characters.id, cards.characterId))
    .where(and(eq(userCards.userId, userId), sql`${userCards.qty} > 0`, adult ? sql`true` : eq(sets.isAdult, false)))
    .orderBy(asc(sets.code), asc(cards.number), asc(userCards.holo));
}

const openZoneIds = async (db: DbLike, userId: string) =>
  new Set((await db.select({ zoneId: expeditionZoneUnlocks.zoneId }).from(expeditionZoneUnlocks).where(eq(expeditionZoneUnlocks.userId, userId))).map((r) => r.zoneId));

/** RF-3, RF-4 y RF-10: lo que ve el coleccionista en Expediciones. */
export async function expeditionsHome(db: DbLike, userId: string, now: Date) {
  const user = await activeUser(db, userId);
  // Spec 021, RF-13: el patron tiene un espacio más.
  const patron = await isPatronUser(db, userId);
  const [zones, unlocked, [profile], mine, owned, busy] = await Promise.all([
    db.select().from(expeditionZones).where(eq(expeditionZones.active, true)).orderBy(asc(expeditionZones.sortOrder), asc(expeditionZones.name)),
    openZoneIds(db, userId),
    db.select().from(expeditionProfiles).where(eq(expeditionProfiles.userId, userId)),
    db
      .select()
      .from(expeditions)
      .where(and(eq(expeditions.userId, userId), inArray(expeditions.status, ["active", "claimed"])))
      .orderBy(asc(expeditions.startedAt)),
    ownedCards(db, userId, adultUnlocked(user)),
    db
      .select({ cardId: expeditionCards.cardId, holo: expeditionCards.holo, endsAt: expeditions.endsAt })
      .from(expeditionCards)
      .innerJoin(expeditions, eq(expeditions.id, expeditionCards.expeditionId))
      .where(and(eq(expeditionCards.userId, userId), eq(expeditionCards.active, true))),
  ]);
  const xp = await bondLevels(db, userId, [...new Set(owned.map((c) => c.characterId).filter((x): x is string => Boolean(x)))]);
  const active = mine.filter((e) => e.status === "active");
  const busyOf = (cardId: string, holo: boolean) => busy.find((b) => b.cardId === cardId && b.holo === holo)?.endsAt.toISOString() ?? null;
  return {
    profile: { fragments: profile?.fragments ?? 0, completed: profile?.completed ?? 0 },
    zones: zones.map((z) => ({
      id: z.id,
      name: z.name,
      terrain: z.terrain,
      difficulty: z.difficulty,
      fragmentsRequired: z.fragmentsRequired,
      sortOrder: z.sortOrder,
      hasImage: Boolean(z.imageKey),
      imageVersion: z.imageKey ? z.imageKey.slice(-16, -5) : null,
      loot: z.loot,
      open: z.fragmentsRequired === 0 || unlocked.has(z.id),
    })),
    slots: slotsFor(patron),
    patron,
    expeditions: active.map((e) => ({ ...e, ready: e.endsAt.getTime() <= now.getTime() })),
    /** RF-22: reclamadas con sobre ganado y sin colección elegida. */
    pendingPacks: mine.filter((e) => e.status === "claimed" && e.result?.packWon && !e.result.packId),
    cards: owned.map((c) => ({
      cardId: c.cardId,
      holo: c.holo,
      name: c.name,
      number: c.number,
      rarity: (c.rarity ?? "common") as Rarity,
      setCode: c.setCode,
      characterId: c.characterId,
      characterName: c.characterName,
      terrain: c.terrain,
      role: c.role,
      bondLevel: bondLevel(c.characterId ? (xp.get(c.characterId) ?? 0) : 0),
      busyUntil: busyOf(c.cardId, c.holo),
    })),
  };
}

/** RF-7 a RF-9 y RF-14 a RF-16: manda un equipo; poder, calificación y botín quedan congelados (RF-17). */
export async function sendExpedition(db: DbLike, userId: string, input: { zoneId: string; durationMin: number; cards: CardChoice[] }, now: Date): Promise<Expedition> {
  if (!isDuration(input.durationMin)) throw new AppError("invalid_duration", "La duración debe ser 30 min, 2 h u 8 h.");
  const duration = input.durationMin;
  const keys = new Set(input.cards.map((c) => `${c.cardId}:${c.holo}`));
  if (input.cards.length < 1 || input.cards.length > TEAM_MAX || keys.size !== input.cards.length) {
    throw new AppError("invalid_team", "El equipo lleva de 1 a 3 cartas distintas.", { max: TEAM_MAX });
  }
  try {
    return await db.transaction(async (tx) => {
      const user = await activeUser(tx, userId);
      await lockProfile(tx, userId);
      const [zone] = await tx.select().from(expeditionZones).where(eq(expeditionZones.id, input.zoneId));
      if (!zone || !zone.active) throw new AppError("not_found", "La zona no existe.", { entity: "zone" });
      if (zone.fragmentsRequired > 0 && !(await openZoneIds(tx, userId)).has(zone.id)) throw new AppError("zone_locked", "Esa zona sigue con niebla: ábrela con fragmentos de mapa.");
      // Spec 021, RF-13 y RF-14: 3 espacios para el patron; al dejar de serlo, con 2 o más en curso no se envía otra.
      const slots = slotsFor(await isPatronUser(tx, userId));
      const [{ n }] = await tx.select({ n: count() }).from(expeditions).where(and(eq(expeditions.userId, userId), eq(expeditions.status, "active")));
      if (n >= slots) throw new AppError("no_free_slot", `Tus ${slots} espacios están ocupados: reclama o cancela una expedición.`, { slots });

      const owned = await ownedCards(tx, userId, adultUnlocked(user));
      const picked = input.cards.map((c) => {
        const o = owned.find((x) => x.cardId === c.cardId && x.holo === c.holo);
        if (!o) throw new AppError("card_not_owned", "Esa carta no está en tu colección.");
        return o;
      });
      const busy = await tx
        .select({ cardId: expeditionCards.cardId, holo: expeditionCards.holo })
        .from(expeditionCards)
        .where(and(eq(expeditionCards.userId, userId), eq(expeditionCards.active, true), inArray(expeditionCards.cardId, picked.map((p) => p.cardId))));
      if (picked.some((p) => busy.some((b) => b.cardId === p.cardId && b.holo === p.holo))) throw new AppError("card_busy", "Esa carta ya está en otra expedición.");

      const xp = await bondLevels(tx, userId, [...new Set(picked.map((p) => p.characterId).filter((x): x is string => Boolean(x)))]);
      const team: ExpeditionMember[] = picked.map((p) => ({
        cardId: p.cardId,
        holo: p.holo,
        characterId: p.characterId,
        name: p.characterName ?? p.name,
        rarity: p.rarity ?? "common",
        terrain: p.terrain,
        role: p.role,
        bondLevel: bondLevel(p.characterId ? (xp.get(p.characterId) ?? 0) : 0),
      }));
      const members: TeamMember[] = team.map((m) => ({ rarity: m.rarity as Rarity, holo: m.holo, terrain: m.terrain as Terrain | null, role: m.role as Role | null, bondLevel: m.bondLevel }));
      const power = teamPower(members, zone.terrain);
      const rating = rateTeam(power, zone.difficulty);
      const loot = lootFor(zone.loot[`${duration}`], rating, members.map((m) => m.role));
      const [e] = await tx
        .insert(expeditions)
        .values({
          userId,
          zoneId: zone.id,
          zoneName: zone.name,
          zoneTerrain: zone.terrain,
          durationMin: duration,
          startedAt: now,
          endsAt: new Date(now.getTime() + duration * 60_000),
          power,
          difficulty: zone.difficulty,
          rating,
          loot,
          team,
        })
        .returning();
      await tx.insert(expeditionCards).values(picked.map((p) => ({ expeditionId: e.id, userId, cardId: p.cardId, holo: p.holo })));
      return e;
    });
  } catch (e) {
    // RF-8 ante dos envíos a la vez: el índice único de cartas en curso decide.
    if (isUniqueViolation(e)) throw new AppError("card_busy", "Esa carta ya está en otra expedición.");
    throw e;
  }
}

async function lockExpedition(db: DbLike, userId: string, id: string) {
  const [e] = await db
    .select()
    .from(expeditions)
    .where(and(eq(expeditions.id, id), eq(expeditions.userId, userId)))
    .for("update");
  if (!e) throw new AppError("not_found", "La expedición no existe.", { entity: "expedition" });
  return e;
}

const releaseCards = (db: DbLike, expeditionId: string) => db.update(expeditionCards).set({ active: false }).where(eq(expeditionCards.expeditionId, expeditionId));

/** RF-18: cancela una expedición en curso; vuelven las cartas sin botín ni vínculo. */
export async function cancelExpedition(db: DbLike, userId: string, id: string, now: Date) {
  return db.transaction(async (tx) => {
    const e = await lockExpedition(tx, userId, id);
    if (e.status !== "active") throw new AppError("expedition_not_active", "Esa expedición ya terminó.");
    if (e.endsAt.getTime() <= now.getTime()) throw new AppError("expedition_returned", "El equipo ya volvió: reclama su botín.");
    await tx.update(expeditions).set({ status: "cancelled", cancelledAt: now }).where(eq(expeditions.id, id));
    await releaseCards(tx, id);
  });
}

/** Concede el sobre ganado de la colección elegida (una sola vez por expedición). */
async function grantPack(db: DbLike, userId: string, expeditionId: string, setId: string, now: Date) {
  await db
    .insert(packs)
    .values({ userId, setId, source: "expedition", grantKey: `expedition:${expeditionId}`, reason: "expedition", grantedAt: now, celebratedAt: now })
    .onConflictDoNothing();
  const [p] = await db.select({ id: packs.id }).from(packs).where(eq(packs.grantKey, `expedition:${expeditionId}`));
  return p.id;
}

/**
 * RF-19 a RF-24: reclama una expedición que volvió. Galletas, fragmentos, vínculo y el sobre al azar en una sola
 * transacción; reclamar otra vez devuelve lo guardado sin entregar nada.
 */
export async function claimExpedition(db: DbLike, userId: string, id: string, now: Date, opts: { seed?: Buffer } = {}) {
  return db.transaction(async (tx) => {
    await activeUser(tx, userId);
    const e = await lockExpedition(tx, userId, id);
    if (e.status === "claimed" && e.result) return { expedition: e, result: e.result, alreadyClaimed: true };
    if (e.status !== "active") throw new AppError("expedition_not_active", "Esa expedición ya terminó.");
    if (now.getTime() < e.endsAt.getTime()) throw new AppError("not_returned", "El equipo todavía no ha vuelto.", { endsAt: e.endsAt.toISOString() });

    const seed = opts.seed ?? randomBytes(32);
    const rng = hmacRng(seed);
    const packWon = rollPack(rng, e.loot.packChance);
    const duration = e.durationMin as 30 | 120 | 480;
    const phrases = pickPhrases(rng, { count: phraseCount(duration), teamSize: e.team.length, terrain: e.zoneTerrain });

    if (e.loot.cookies > 0) {
      await tx.insert(userRewards).values({ userId, freeAnchor: now }).onConflictDoNothing();
      await tx
        .update(userRewards)
        .set({ cookies: sql`${userRewards.cookies} + ${e.loot.cookies}`, updatedAt: sql`now()` })
        .where(eq(userRewards.userId, userId));
      await tx.insert(cookieLedger).values({ userId, amount: e.loot.cookies, reason: `expedition:${e.id}` });
    }
    await lockProfile(tx, userId);
    await tx
      .update(expeditionProfiles)
      .set({ fragments: sql`${expeditionProfiles.fragments} + ${e.loot.fragments}`, completed: sql`${expeditionProfiles.completed} + 1`, updatedAt: sql`now()` })
      .where(eq(expeditionProfiles.userId, userId));

    // El vínculo es por personaje: dos cartas de la misma personaje suman una vez.
    const bonds: ExpeditionResult["bonds"] = [];
    const gain = BOND_XP[duration];
    for (const characterId of [...new Set(e.team.map((m) => m.characterId).filter((x): x is string => Boolean(x)))]) {
      const [cur] = await tx
        .select()
        .from(characterBonds)
        .where(and(eq(characterBonds.userId, userId), eq(characterBonds.characterId, characterId)));
      const before = cur?.xp ?? 0;
      await tx
        .insert(characterBonds)
        .values({ userId, characterId, xp: gain })
        .onConflictDoUpdate({ target: [characterBonds.userId, characterBonds.characterId], set: { xp: sql`${characterBonds.xp} + ${gain}`, updatedAt: sql`now()` } });
      bonds.push({ characterId, xp: before + gain, level: bondLevel(before + gain), before: bondLevel(before) });
    }

    // RF-22: con una sola colección SFW publicada el sobre llega al momento; con varias, se elige en el reporte.
    let packId: string | null = null;
    if (packWon) {
      const options = await claimableSets(tx);
      if (options.length === 1) packId = await grantPack(tx, userId, e.id, options[0].id, now);
    }
    const result: ExpeditionResult = { loot: e.loot, packWon, packId, phrases, bonds };
    const [done] = await tx
      .update(expeditions)
      .set({ status: "claimed", claimedAt: now, seed: seed.toString("hex"), result })
      .where(eq(expeditions.id, id))
      .returning();
    await releaseCards(tx, id);
    return { expedition: done, result, alreadyClaimed: false };
  });
}

/** RF-22: el coleccionista elige la colección SFW del sobre que ganó. */
export async function choosePackSet(db: DbLike, userId: string, expeditionId: string, setId: string, now = new Date()) {
  return db.transaction(async (tx) => {
    const e = await lockExpedition(tx, userId, expeditionId);
    if (e.status !== "claimed" || !e.result?.packWon || e.result.packId) throw new AppError("pack_not_pending", "Esa expedición no tiene un sobre por elegir.");
    const set = await claimableSet(tx, setId);
    const packId = await grantPack(tx, userId, e.id, set.id, now);
    await tx
      .update(expeditions)
      .set({ result: { ...e.result, packId } })
      .where(eq(expeditions.id, e.id));
    return packId;
  });
}

/** RF-5 y RF-6: abre una zona con niebla gastando fragmentos; si ya estaba abierta no gasta nada. */
export async function unlockZone(db: DbLike, userId: string, zoneId: string, now = new Date()) {
  return db.transaction(async (tx) => {
    await activeUser(tx, userId);
    const profile = await lockProfile(tx, userId);
    const [zone] = await tx.select().from(expeditionZones).where(eq(expeditionZones.id, zoneId));
    if (!zone || !zone.active) throw new AppError("not_found", "La zona no existe.", { entity: "zone" });
    if (zone.fragmentsRequired === 0 || (await openZoneIds(tx, userId)).has(zone.id)) return { fragments: profile.fragments };
    if (profile.fragments < zone.fragmentsRequired) {
      throw new AppError("not_enough_fragments", `Te faltan fragmentos de mapa: tienes ${profile.fragments} de ${zone.fragmentsRequired}.`, { have: profile.fragments, need: zone.fragmentsRequired });
    }
    const fragments = profile.fragments - zone.fragmentsRequired;
    await tx.update(expeditionProfiles).set({ fragments, updatedAt: sql`now()` }).where(eq(expeditionProfiles.userId, userId));
    await tx.insert(expeditionZoneUnlocks).values({ userId, zoneId, unlockedAt: now });
    return { fragments };
  });
}

/** RF-2: expediciones que ya volvieron y esperan a que se reclamen. */
export async function expeditionsReady(db: DbLike, userId: string, now: Date) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(expeditions)
    .where(and(eq(expeditions.userId, userId), eq(expeditions.status, "active"), lte(expeditions.endsAt, now)));
  return n;
}

/** RF-25: nivel de vínculo de las personajes y hora de vuelta de las cartas fuera, para la ficha de carta. */
export async function expeditionInfoForCards(db: DbLike, userId: string, cardIds: string[]) {
  if (cardIds.length === 0) return { bonds: new Map<string, number>(), away: new Map<string, string>() };
  const [rows, out] = await Promise.all([
    db.select({ cardId: cards.id, characterId: cards.characterId }).from(cards).where(inArray(cards.id, cardIds)),
    db
      .select({ cardId: expeditionCards.cardId, holo: expeditionCards.holo, endsAt: expeditions.endsAt })
      .from(expeditionCards)
      .innerJoin(expeditions, eq(expeditions.id, expeditionCards.expeditionId))
      .where(and(eq(expeditionCards.userId, userId), eq(expeditionCards.active, true), inArray(expeditionCards.cardId, cardIds))),
  ]);
  const xp = await bondLevels(db, userId, [...new Set(rows.map((r) => r.characterId).filter((x): x is string => Boolean(x)))]);
  return {
    /** Nivel de vínculo por carta (de su personaje). */
    bonds: new Map(rows.map((r) => [r.cardId, bondLevel(r.characterId ? (xp.get(r.characterId) ?? 0) : 0)])),
    /** Hora de vuelta por carta y versión (`<id>:holo` o `<id>:normal`). */
    away: new Map(out.map((o) => [`${o.cardId}:${o.holo ? "holo" : "normal"}`, o.endsAt.toISOString()])),
  };
}
