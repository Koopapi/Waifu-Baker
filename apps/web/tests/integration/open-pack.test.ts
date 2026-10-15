import { describe, expect, it } from "vitest";
import { and, eq, inArray, sql } from "drizzle-orm";
import { characters, dropTables, packOpenings, packs, pityCounters, sets, userCards, users } from "@/db/schema";
import { drawPackWithPity } from "@/domain/catalog/draw";
import { hmacRng } from "@/domain/random";
import { getOpeningResult, openAllPacks, openPack } from "@/server/services/packs";
import { upsertUserFromLogin } from "@/server/services/users";
import { giftPacks } from "@/server/services/users-admin";
import { inRollback, testDb } from "./db";
import { createPublishedSet, makeAdmin } from "./factories";

type Tx = Parameters<Parameters<typeof inRollback>[0]>[0];

async function world(tx: Tx, opts: Partial<Parameters<typeof createPublishedSet>[2]> = {}) {
  const admin = await makeAdmin(tx);
  const fan = await upsertUserFromLogin(tx, { patreonUserId: "fan-1", displayName: "Fan", role: "user" });
  const pub = await createPublishedSet(tx, admin.id, {
    code: "WB01",
    rarities: ["common", "common", "rare", "epic"],
    slots: [{ common: 100 }, { rare: 90, epic: 10 }],
    ...opts,
  });
  const gift = async (n: number, userId = fan.id) => {
    await giftPacks(tx, admin.id, { userId, setId: pub.set.id, count: n, reason: "Pruebas" });
    return tx.select().from(packs).where(and(eq(packs.userId, userId), eq(packs.status, "sealed")));
  };
  return { admin, fan, ...pub, gift };
}

describe("RF-5, RF-9 apertura en el servidor", () => {
  it("test_s004_rf5_decide el contenido con las probabilidades publicadas y lo guarda", async () => {
    await inRollback(async (tx) => {
      const { fan, set, cards: setCards, gift } = await world(tx);
      const [p] = await gift(1);
      const r = await openPack(tx, { userId: fan.id, packId: p.id });
      expect(r.cards).toHaveLength(2);
      expect(r.cards[0].rarity).toBe("common");
      for (const c of r.cards) expect(setCards.map((x) => x.id)).toContain(c.cardId);
      const [o] = await tx.select().from(packOpenings).where(eq(packOpenings.packId, p.id));
      const [dt] = await tx.select().from(dropTables).where(eq(dropTables.setId, set.id));
      expect(o.dropTableId).toBe(dt.id);
      expect(o.serverSeed).toMatch(/^[0-9a-f]{64}$/);
      expect(o.rngVersion).toBe("hmac-sha256-v1");
      expect((await tx.select().from(packs).where(eq(packs.id, p.id)))[0].status).toBe("opened");
    });
  });

  it("test_s004_rf9_la semilla guardada reproduce exactamente las cartas", async () => {
    await inRollback(async (tx) => {
      const { fan, cards: setCards, set, gift } = await world(tx, { holoChance: 0.5 });
      const [p] = await gift(1);
      const r = await openPack(tx, { userId: fan.id, packId: p.id });
      const [o] = await tx.select().from(packOpenings).where(eq(packOpenings.packId, p.id));
      const [dt] = await tx.select().from(dropTables).where(eq(dropTables.setId, set.id));
      const rolls = o.rolls as { pityActive: boolean };
      const again = drawPackWithPity({ cards: setCards, slots: dt.slots, holoChance: dt.holoChance }, hmacRng(Buffer.from(o.serverSeed, "hex")), rolls.pityActive);
      expect(again.draws.map((d) => [d.cardId, d.holo])).toEqual(r.cards.map((c) => [c.cardId, c.holo]));
    });
  });
});

describe("RF-6 una sola vez", () => {
  it("test_s004_rf6_abrir otra vez devuelve el mismo resultado sin sumar cartas", async () => {
    await inRollback(async (tx) => {
      const { fan, gift } = await world(tx);
      const [p] = await gift(1);
      const a = await openPack(tx, { userId: fan.id, packId: p.id });
      const b = await openPack(tx, { userId: fan.id, packId: p.id });
      expect(b).toEqual(a);
      const [{ total }] = await tx.select({ total: sql<number>`sum(${userCards.qty})::int` }).from(userCards).where(eq(userCards.userId, fan.id));
      expect(total).toBe(2);
      expect(await getOpeningResult(tx, fan.id, p.id)).toEqual(a);
    });
  });

  it("test_s004_rf6_dos aperturas simultáneas del mismo sobre dejan una sola apertura", async () => {
    // Datos confirmados (no en una transacción revertida) para usar dos conexiones de verdad.
    const { db, sql: conn } = testDb();
    const admin = await makeAdmin(db, "admin-conc");
    const fan = await upsertUserFromLogin(db, { patreonUserId: "fan-conc", displayName: "Fan", role: "user" });
    const { set } = await createPublishedSet(db, admin.id, { code: "CONC1", rarities: ["common", "rare"], slots: [{ common: 100 }, { rare: 100 }] });
    await giftPacks(db, admin.id, { userId: fan.id, setId: set.id, count: 1, reason: "Concurrencia" });
    const [p] = await db.select().from(packs).where(eq(packs.userId, fan.id));
    const other = testDb();
    try {
      const [r1, r2] = await Promise.all([openPack(db, { userId: fan.id, packId: p.id }), openPack(other.db, { userId: fan.id, packId: p.id })]);
      expect(r2.openingId).toBe(r1.openingId);
      expect(await db.select().from(packOpenings).where(eq(packOpenings.packId, p.id))).toHaveLength(1);
      const [{ total }] = await db.select({ total: sql<number>`sum(${userCards.qty})::int` }).from(userCards).where(eq(userCards.userId, fan.id));
      expect(total).toBe(2);
    } finally {
      await db.delete(packOpenings).where(eq(packOpenings.userId, fan.id));
      await db.delete(userCards).where(eq(userCards.userId, fan.id));
      await db.delete(pityCounters).where(eq(pityCounters.userId, fan.id));
      await db.delete(packs).where(eq(packs.setId, set.id));
      await db.execute(sql`delete from audit_log`);
      await db.delete(sets).where(eq(sets.id, set.id));
      await db.delete(characters).where(eq(characters.slug, "personaje-conc1"));
      await db.delete(users).where(inArray(users.id, [fan.id, admin.id]));
      await other.sql.end();
      await conn.end();
    }
  });
});

describe("RF-3, RF-4, RF-7, RF-8 accesos", () => {
  it("test_s004_rf7_un sobre ajeno o anulado responde que no existe", async () => {
    await inRollback(async (tx) => {
      const { fan, gift } = await world(tx);
      const other = await upsertUserFromLogin(tx, { patreonUserId: "otro", displayName: "Otro", role: "user" });
      const [p] = await gift(1);
      await expect(openPack(tx, { userId: other.id, packId: p.id })).rejects.toMatchObject({ code: "not_found" });
      await tx.update(packs).set({ status: "void" }).where(eq(packs.id, p.id));
      await expect(openPack(tx, { userId: fan.id, packId: p.id })).rejects.toMatchObject({ code: "not_found" });
    });
  });

  it("test_s004_rf8_desde Bélgica no abre y conserva el sobre", async () => {
    await inRollback(async (tx) => {
      const { fan, gift } = await world(tx);
      const [p] = await gift(1);
      await expect(openPack(tx, { userId: fan.id, packId: p.id, country: "BE" })).rejects.toMatchObject({ code: "geo_blocked" });
      expect((await tx.select().from(packs).where(eq(packs.id, p.id)))[0].status).toBe("sealed");
    });
  });

  it("test_s004_rf3_un sobre 18+ no se abre sin la verificación de edad", async () => {
    await inRollback(async (tx) => {
      const { admin, fan } = await world(tx);
      const adult = await createPublishedSet(tx, admin.id, { code: "WB01A", rarities: ["common"], slots: [{ common: 100 }], isAdult: true });
      await tx.update(users).set({ isAdultDeclared: true, adultVerifiedAt: new Date() }).where(eq(users.id, fan.id));
      await giftPacks(tx, admin.id, { userId: fan.id, setId: adult.set.id, count: 1, reason: "18+" });
      await tx.update(users).set({ adultVerifiedAt: null }).where(eq(users.id, fan.id));
      const [p] = await tx.select().from(packs).where(eq(packs.setId, adult.set.id));
      await expect(openPack(tx, { userId: fan.id, packId: p.id })).rejects.toMatchObject({ code: "age_not_verified" });
      await tx.update(users).set({ adultVerifiedAt: new Date() }).where(eq(users.id, fan.id));
      expect((await openPack(tx, { userId: fan.id, packId: p.id })).cards).toHaveLength(1);
    });
  });

  it("test_s004_rf4_un sobre de una colección archivada se puede abrir", async () => {
    await inRollback(async (tx) => {
      const { fan, set, gift } = await world(tx);
      const [p] = await gift(1);
      await tx.update(sets).set({ status: "archived" }).where(eq(sets.id, set.id));
      expect((await openPack(tx, { userId: fan.id, packId: p.id })).cards).toHaveLength(2);
    });
  });
});

describe("RF-10 y RF-11 colección del usuario", () => {
  it("test_s004_rf10_las repetidas suman y la holo cuenta aparte", async () => {
    await inRollback(async (tx) => {
      const { admin, fan } = await world(tx);
      const one = await createPublishedSet(tx, admin.id, { code: "ONE1", rarities: ["rare"], slots: [{ rare: 100 }], holoChance: 0 });
      await giftPacks(tx, admin.id, { userId: fan.id, setId: one.set.id, count: 3, reason: "Tres sobres" });
      for (const p of await tx.select().from(packs).where(eq(packs.setId, one.set.id))) await openPack(tx, { userId: fan.id, packId: p.id });
      const rows = await tx.select().from(userCards).where(eq(userCards.cardId, one.cards[0].id));
      expect(rows).toEqual([expect.objectContaining({ holo: false, qty: 3 })]);
      const holoSet = await createPublishedSet(tx, admin.id, { code: "HOL1", rarities: ["rare"], slots: [{ rare: 100 }], holoChance: 1 });
      await giftPacks(tx, admin.id, { userId: fan.id, setId: holoSet.set.id, count: 1, reason: "holo" });
      const [hp] = await tx.select().from(packs).where(eq(packs.setId, holoSet.set.id));
      const r = await openPack(tx, { userId: fan.id, packId: hp.id });
      expect(r.cards[0].holo).toBe(true);
      expect(await tx.select().from(userCards).where(eq(userCards.cardId, holoSet.cards[0].id))).toEqual([expect.objectContaining({ holo: true, qty: 1 })]);
    });
  });

  it("test_s004_rf11_indica si cada carta es nueva y cuántas tiene tras abrir", async () => {
    await inRollback(async (tx) => {
      const { admin, fan } = await world(tx);
      const one = await createPublishedSet(tx, admin.id, { code: "ONE2", rarities: ["common"], slots: [{ common: 100 }, { common: 100 }] });
      await giftPacks(tx, admin.id, { userId: fan.id, setId: one.set.id, count: 1, reason: "nuevas" });
      const [p] = await tx.select().from(packs).where(eq(packs.setId, one.set.id));
      const r = await openPack(tx, { userId: fan.id, packId: p.id });
      expect(r.cards.map((c) => [c.isNew, c.qtyAfter])).toEqual([[true, 1], [false, 2]]);
    });
  });
});

describe("RF-13 y RF-14 protección en la apertura", () => {
  it("test_s004_rf13_con N=3, el tercer sobre seguido sin épica la garantiza y luego se reinicia (RF-14)", async () => {
    await inRollback(async (tx) => {
      const { admin, fan } = await world(tx);
      const s = await createPublishedSet(tx, admin.id, { code: "PIT1", rarities: ["common", "epic"], slots: [{ common: 99.99, epic: 0.01 }], pity: 3 });
      await giftPacks(tx, admin.id, { userId: fan.id, setId: s.set.id, count: 4, reason: "pity" });
      const ps = await tx.select().from(packs).where(eq(packs.setId, s.set.id));
      const results = [];
      for (const p of ps) results.push(await openPack(tx, { userId: fan.id, packId: p.id, seed: Buffer.alloc(32, results.length + 1) }));
      expect(results.map((r) => r.cards[0].rarity)).toEqual(["common", "common", "epic", "common"]);
      expect(results.map((r) => r.pityApplied)).toEqual([false, false, true, false]);
      const [counter] = await tx.select().from(pityCounters).where(eq(pityCounters.userId, fan.id));
      expect(counter.packsSinceEpic).toBe(1);
    });
  });
});

describe("RF-18 y RF-19 abrir todos", () => {
  it("test_s004_rf18_abre todos los sellados de una colección con las mismas reglas (RF-19)", async () => {
    await inRollback(async (tx) => {
      const { fan, set, gift } = await world(tx);
      await gift(4);
      const rs = await openAllPacks(tx, { userId: fan.id, setId: set.id });
      expect(rs).toHaveLength(4);
      expect(rs.flatMap((r) => r.cards)).toHaveLength(8);
      expect(await tx.select().from(packs).where(and(eq(packs.userId, fan.id), eq(packs.status, "sealed")))).toHaveLength(0);
    });
  });

  it("test_s004_rf19_cada sobre de «Abrir todos» sigue las mismas reglas, incluida la protección", async () => {
    await inRollback(async (tx) => {
      const { admin, fan } = await world(tx);
      const s = await createPublishedSet(tx, admin.id, { code: "PIT2", rarities: ["common", "epic"], slots: [{ common: 99.999, epic: 0.001 }], pity: 2 });
      await giftPacks(tx, admin.id, { userId: fan.id, setId: s.set.id, count: 4, reason: "pity en lote" });
      const rs = await openAllPacks(tx, { userId: fan.id, setId: s.set.id });
      expect(rs.map((r) => r.pityApplied)).toEqual([false, true, false, true]);
      expect(rs.map((r) => r.cards[0].rarity)).toEqual(["common", "epic", "common", "epic"]);
      expect(await tx.select().from(packOpenings).where(eq(packOpenings.userId, fan.id))).toHaveLength(4);
    });
  });

  it("test_s004_rf18_respeta el máximo por petición", async () => {
    await inRollback(async (tx) => {
      const { fan, set, gift } = await world(tx);
      await gift(3);
      expect(await openAllPacks(tx, { userId: fan.id, setId: set.id, limit: 2 })).toHaveLength(2);
      expect(await tx.select().from(packs).where(and(eq(packs.userId, fan.id), eq(packs.status, "sealed")))).toHaveLength(1);
    });
  });
});
