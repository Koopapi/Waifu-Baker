import { describe, expect, it } from "vitest";
import { and, eq, inArray, sql } from "drizzle-orm";
import { auditLog, characters, dropTables, libraryItems, packOpenings, packs, pityCounters, sets, userCards, users } from "@/db/schema";
import { drawPackWithPity } from "@/domain/catalog/draw";
import { hmacRng } from "@/domain/random";
import { getOpeningResult, listMyPacks, openAllPacks, openPack } from "@/server/services/packs";
import { grantWelcomePack, setWelcomeSet } from "@/server/services/welcome";
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
      const [dt] = await tx.select().from(dropTables).where(and(eq(dropTables.setId, set.id), eq(dropTables.kind, "silver")));
      expect(o.dropTableId).toBe(dt.id);
      expect(o.serverSeed).toMatch(/^[0-9a-f]{64}$/);
      expect(o.rngVersion).toBe("hmac-sha256-v2");
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
      // Spec 017: el fondo de prueba va a la biblioteca general, que no se borra con la colección.
      await db.delete(libraryItems);
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
      const adult = await createPublishedSet(tx, admin.id, { code: "WB01A", rarities: ["rare"], slots: [{ rare: 100 }], isAdult: true });
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
      const one = await createPublishedSet(tx, admin.id, { code: "ONE2", rarities: ["rare"], slots: [{ rare: 100 }, { rare: 100 }] });
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
      const s = await createPublishedSet(tx, admin.id, { code: "PIT1", rarities: ["rare", "epic"], slots: [{ rare: 99.99, epic: 0.01 }], pity: 3 });
      await giftPacks(tx, admin.id, { userId: fan.id, setId: s.set.id, count: 4, reason: "pity" });
      const ps = await tx.select().from(packs).where(eq(packs.setId, s.set.id));
      const results = [];
      for (const p of ps) results.push(await openPack(tx, { userId: fan.id, packId: p.id, seed: Buffer.alloc(32, results.length + 1) }));
      expect(results.map((r) => r.cards[0].rarity)).toEqual(["rare", "rare", "epic", "rare"]);
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
      const s = await createPublishedSet(tx, admin.id, { code: "PIT2", rarities: ["rare", "epic"], slots: [{ rare: 99.999, epic: 0.001 }], pity: 2 });
      await giftPacks(tx, admin.id, { userId: fan.id, setId: s.set.id, count: 4, reason: "pity en lote" });
      const rs = await openAllPacks(tx, { userId: fan.id, setId: s.set.id });
      expect(rs.map((r) => r.pityApplied)).toEqual([false, true, false, true]);
      expect(rs.map((r) => r.cards[0].rarity)).toEqual(["rare", "epic", "rare", "epic"]);
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

describe("apertura reproducible", () => {
  // Con la misma semilla salen las mismas cartas aunque Postgres devuelva las filas en otro orden
  // (al editar una carta, su fila se reescribe al final de la tabla).
  const openWithSeed = (touchFirst: boolean) =>
    inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const { set, cards: list } = await createPublishedSet(tx, admin.id, {
        code: "SEED",
        rarities: ["common", "common", "common", "common", "common", "rare"],
        slots: [{ common: 100 }, { common: 100 }, { common: 100 }, { rare: 100 }],
      });
      // Reescribir las filas al revés: una lectura sin orden las devolvería invertidas.
      if (touchFirst) for (const c of [...list].reverse()) await tx.execute(sql`update cards set name = name || ' ' where id = ${c.id}`);
      const fan = await upsertUserFromLogin(tx, { patreonUserId: "dev:seed-fan", displayName: "Seed fan", role: "user" });
      await giftPacks(tx, admin.id, { userId: fan.id, setId: set.id, count: 1, reason: "Seed test" });
      const [p] = await tx.select().from(packs).where(eq(packs.userId, fan.id));
      // Como en el CI: lectura directa de la tabla, sin el índice que aquí devuelve las filas ordenadas por casualidad.
      await tx.execute(sql`set local enable_indexscan = off`);
      await tx.execute(sql`set local enable_bitmapscan = off`);
      await tx.execute(sql`set local enable_indexonlyscan = off`);
      const r = await openPack(tx, { userId: fan.id, packId: p.id, seed: Buffer.alloc(32, 7) });
      return r.cards.map((c) => c.number);
    });

  it("test_s004_rf6_la_misma_semilla_da_las_mismas_cartas_aunque_cambie_el_orden_de_las_filas", async () => {
    expect(await openWithSeed(true)).toEqual(await openWithSeed(false));
  });
});

describe("spec 022 — sobres plata y gold", () => {
  const sealed = (tx: Tx, userId: string, kind: "silver" | "gold") =>
    tx.select().from(packs).where(and(eq(packs.userId, userId), eq(packs.kind, kind), eq(packs.status, "sealed")));

  it("test_s022_rf11_rf22_el_regalo_crea_sobres_del_tipo_elegido_y_queda_en_el_historial", async () => {
    await inRollback(async (tx) => {
      const { admin, fan, set } = await world(tx);
      await giftPacks(tx, admin.id, { userId: fan.id, setId: set.id, count: 2, reason: "Sobres gold", kind: "gold" });
      await giftPacks(tx, admin.id, { userId: fan.id, setId: set.id, count: 1, reason: "Sobre plata" });
      expect(await sealed(tx, fan.id, "gold")).toHaveLength(2);
      expect(await sealed(tx, fan.id, "silver")).toHaveLength(1);
      const gifts = await tx.select().from(auditLog).where(eq(auditLog.action, "packs_gift")).orderBy(auditLog.id);
      expect(gifts.map((g) => (g.after as { kind: string }).kind)).toEqual(["gold", "silver"]);
    });
  });

  it("test_s022_rf12_cada_sobre_se_abre_con_la_tabla_de_su_tipo", async () => {
    await inRollback(async (tx) => {
      // La gold de la colección de prueba es toda legendaria (la carta que el ayudante añade); la plata no la tiene.
      const { admin, fan, set, goldCard } = await world(tx);
      await giftPacks(tx, admin.id, { userId: fan.id, setId: set.id, count: 1, reason: "gold", kind: "gold" });
      await giftPacks(tx, admin.id, { userId: fan.id, setId: set.id, count: 1, reason: "plata" });
      const [g] = await sealed(tx, fan.id, "gold");
      const [p] = await sealed(tx, fan.id, "silver");
      const gold = await openPack(tx, { userId: fan.id, packId: g.id });
      const silver = await openPack(tx, { userId: fan.id, packId: p.id });
      expect(gold.kind).toBe("gold");
      expect(gold.cards.map((c) => c.cardId)).toEqual([goldCard!.id, goldCard!.id]);
      expect(silver.kind).toBe("silver");
      expect(silver.cards.map((c) => c.cardId)).not.toContain(goldCard!.id);
      const tables = await tx.select().from(dropTables).where(eq(dropTables.setId, set.id));
      const [og] = await tx.select().from(packOpenings).where(eq(packOpenings.packId, g.id));
      expect(og.dropTableId).toBe(tables.find((t) => t.kind === "gold")!.id);
      // Volver a ver la apertura también dice el tipo.
      expect((await getOpeningResult(tx, fan.id, g.id))?.kind).toBe("gold");
    });
  });

  it("test_s022_rf18_la_mala_suerte_solo_cuenta_y_actua_en_los_sobres_plata", async () => {
    await inRollback(async (tx) => {
      const { admin, fan } = await world(tx);
      const s = await createPublishedSet(tx, admin.id, { code: "PITG", rarities: ["rare", "epic"], slots: [{ rare: 99.999, epic: 0.001 }], pity: 2 });
      const open = async (kind: "silver" | "gold", i: number) => {
        await giftPacks(tx, admin.id, { userId: fan.id, setId: s.set.id, count: 1, reason: "pity", kind });
        const [p] = await sealed(tx, fan.id, kind);
        return openPack(tx, { userId: fan.id, packId: p.id, seed: Buffer.alloc(32, i) });
      };
      const counter = async () => (await tx.select().from(pityCounters).where(and(eq(pityCounters.userId, fan.id), eq(pityCounters.setId, s.set.id))))[0]?.packsSinceEpic ?? 0;
      const first = await open("silver", 1);
      expect([first.cards[0].rarity, first.pityApplied, await counter()]).toEqual(["rare", false, 1]);
      // El gold (con su legendaria) no reinicia el contador de la plata ni aplica la protección.
      const gold = await open("gold", 2);
      expect([gold.pityApplied, await counter()]).toEqual([false, 1]);
      const second = await open("silver", 3);
      expect([second.pityApplied, second.cards[0].rarity]).toEqual([true, "epic"]);
    });
  });

  it("test_s022_rf19_mis_sobres_agrupa_por_coleccion_y_tipo", async () => {
    await inRollback(async (tx) => {
      const { admin, fan, set, gift } = await world(tx);
      await gift(2);
      await giftPacks(tx, admin.id, { userId: fan.id, setId: set.id, count: 1, reason: "gold", kind: "gold" });
      const groups = await listMyPacks(tx, fan.id);
      expect(groups.map((g) => [g.code, g.kind, g.sealed])).toEqual([
        ["WB01", "silver", 2],
        ["WB01", "gold", 1],
      ]);
    });
  });

  it("test_s022_rf19_abrir_todos_abre_solo_los_del_tipo_pedido_cada_uno_con_su_tabla", async () => {
    await inRollback(async (tx) => {
      const { admin, fan, set, gift } = await world(tx);
      await gift(2);
      await giftPacks(tx, admin.id, { userId: fan.id, setId: set.id, count: 3, reason: "gold", kind: "gold" });
      const golds = await openAllPacks(tx, { userId: fan.id, setId: set.id, kind: "gold" });
      expect(golds.map((r) => r.kind)).toEqual(["gold", "gold", "gold"]);
      expect(await sealed(tx, fan.id, "silver")).toHaveLength(2);
      // Sin tipo, «Abrir todos» es de los plata.
      const silvers = await openAllPacks(tx, { userId: fan.id, setId: set.id });
      expect(silvers.map((r) => r.kind)).toEqual(["silver", "silver"]);
    });
  });

  it("test_s022_rf23_la_bienvenida_y_las_demas_fuentes_dan_sobres_plata", async () => {
    await inRollback(async (tx) => {
      const { admin, set } = await world(tx);
      await setWelcomeSet(tx, admin.id, set.id);
      const newcomer = await upsertUserFromLogin(tx, { patreonUserId: "fan-new", displayName: "Nueva", role: "user" });
      await grantWelcomePack(tx, newcomer);
      expect((await tx.select().from(packs).where(eq(packs.userId, newcomer.id))).map((p) => p.kind)).toEqual(["silver"]);
      // Suscripción, sobre gratis, día 7 y expediciones crean sus sobres sin tipo: el de por defecto es plata.
      const [raw] = await tx.insert(packs).values({ userId: newcomer.id, setId: set.id, source: "tier_grant", grantKey: "s022-default" }).returning();
      expect(raw.kind).toBe("silver");
    });
  });
});
