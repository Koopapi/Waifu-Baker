import { and, asc, count, eq, inArray } from "drizzle-orm";
import { cards, packs, sets, userCards, userRewards, users } from "@/db/schema";
import { RARITIES } from "@/domain/catalog/card-rules";
import { dailyStatus, localDay, safeTimeZone } from "@/domain/rewards/daily";
import { currentFree } from "@/domain/rewards/free-packs";
import type { DbLike } from "@/server/db-types";

const visibleStatus = ["published", "archived"] as const;

/**
 * Spec 010, RF-1 y RF-2: lo que necesita la estructura en cada página. Las colecciones del usuario
 * (con cartas o con sobres sin abrir) con su mejor carta de portada, los sobres sin abrir, las
 * galletas y cuántas recompensas puede reclamar ya. Solo lee: no crea la fila de recompensas.
 */
export async function shellSummary(db: DbLike, userId: string, opts: { now: Date; timeZone?: string | null }) {
  const [[user], owned, sealedRows, [rw]] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)),
    db
      .select({ setId: cards.setId, cardId: cards.id, rarity: cards.rarity, number: cards.number })
      .from(userCards)
      .innerJoin(cards, eq(cards.id, userCards.cardId))
      .where(eq(userCards.userId, userId)),
    db
      .select({ setId: packs.setId, n: count(packs.id) })
      .from(packs)
      .where(and(eq(packs.userId, userId), eq(packs.status, "sealed")))
      .groupBy(packs.setId),
    db.select().from(userRewards).where(eq(userRewards.userId, userId)),
  ]);
  const verified = Boolean(user?.isAdultDeclared && user.adultVerifiedAt);
  const setIds = [...new Set([...owned.map((o) => o.setId), ...sealedRows.map((s) => s.setId)])];
  const [setRows, totals] = setIds.length
    ? await Promise.all([
        db.select().from(sets).where(and(inArray(sets.id, setIds), inArray(sets.status, [...visibleStatus]))).orderBy(asc(sets.code)),
        db.select({ setId: cards.setId, n: count(cards.id) }).from(cards).where(inArray(cards.setId, setIds)).groupBy(cards.setId),
      ])
    : [[], []];

  const rank = (r: string | null) => (r ? RARITIES.indexOf(r as (typeof RARITIES)[number]) : -1);
  const collections = setRows.map((s) => {
    const mine = owned.filter((o) => o.setId === s.id);
    const locked = s.isAdult && !verified;
    const best = [...mine].sort((x, y) => rank(y.rarity) - rank(x.rarity) || x.number - y.number)[0];
    return {
      setId: s.id,
      code: s.code,
      name: s.name,
      locked,
      coverCardId: locked ? null : (best?.cardId ?? null),
      sealed: sealedRows.find((r) => r.setId === s.id)?.n ?? 0,
      progress: { owned: new Set(mine.map((m) => m.cardId)).size, total: totals.find((t) => t.setId === s.id)?.n ?? 0 },
    };
  });

  // Sin fila todavía: el usuario tiene la carga inicial y la diaria sin reclamar (spec 009, RF-3).
  const free = rw ? currentFree({ charges: rw.freeCharges, anchor: rw.freeAnchor }, opts.now).charges : 1;
  const tz = safeTimeZone(opts.timeZone ?? rw?.lastTimeZone ?? null);
  const daily = dailyStatus(
    { streakDay: rw?.streakDay ?? 0, lastDay: rw?.lastDailyDay ?? null, lastAt: rw?.lastDailyAt ?? null, lastTimeZone: rw?.lastTimeZone ?? null },
    localDay(opts.now, tz),
  );
  return {
    collections,
    sealed: sealedRows.reduce((a, r) => a + r.n, 0),
    cookies: rw?.cookies ?? 0,
    rewardsReady: (free > 0 ? 1 : 0) + (daily.claimedToday ? 0 : 1),
  };
}
