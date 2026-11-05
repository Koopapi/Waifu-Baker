// Spec 029: reciclar repetidas (con concurrencia), el vínculo como barra única, el polvo, fabricar, la línea de
// personaje, los ajustes con auditoría y el simulador.
import { describe, expect, it } from "vitest";
import { and, eq, inArray, sql } from "drizzle-orm";
import { auditLog, characterBonds, characters, expeditionProfiles, libraryItems, packs, sets, userCards, userRewards, users } from "@/db/schema";
import { FACTORY_BOND_SETTINGS } from "@/domain/bonds/settings";
import { BOND_THRESHOLDS } from "@/domain/expeditions/rules";
import { characterLine, craftCard, previewRecycle, recycle, simulateBond } from "@/server/services/bonds";
import { getBondSettings, setBondSettings } from "@/server/services/settings";
import { purgeAccount } from "@/server/services/account";
import { upsertUserFromLogin } from "@/server/services/users";
import { inRollback, testDb } from "./db";
import { createPublishedSet, makeAdmin } from "./factories";

type Tx = Parameters<Parameters<typeof inRollback>[0]>[0];
type Db = Tx | ReturnType<typeof testDb>["db"];

async function world(db: Db, code = "BND1", fanId = "fan-bond") {
  const admin = await makeAdmin(db, `admin-${code}`);
  const fan = await upsertUserFromLogin(db, { patreonUserId: fanId, displayName: "Fan", role: "user" });
  const pub = await createPublishedSet(db, admin.id, { code, rarities: ["common", "rare", "epic"], slots: [{ common: 100 }, { rare: 100 }] });
  const [c, r, e] = pub.cards;
  const characterId = c.characterId!;
  const give = async (cardId: string, qty: number, holo = false) =>
    db.insert(userCards).values({ userId: fan.id, cardId, holo, qty }).onConflictDoUpdate({ target: [userCards.userId, userCards.cardId, userCards.holo], set: { qty } });
  const qty = async (cardId: string, holo = false) => (await db.select().from(userCards).where(and(eq(userCards.userId, fan.id), eq(userCards.cardId, cardId), eq(userCards.holo, holo))))[0]?.qty ?? 0;
  const xp = async () => (await db.select().from(characterBonds).where(and(eq(characterBonds.userId, fan.id), eq(characterBonds.characterId, characterId))))[0]?.xp ?? 0;
  const dust = async () => (await db.select().from(userRewards).where(eq(userRewards.userId, fan.id)))[0]?.dust ?? 0;
  return { admin, fan, ...pub, c, r, e, characterId, give, qty, xp, dust };
}

describe("spec 029 — reciclar", () => {
  it("test_s029_rf1_rf2_recicla_las_repetidas_y_cada_version_conserva_una_copia", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      await w.give(w.r.id, 4);
      await w.give(w.r.id, 2, true);
      const normal = await recycle(tx, w.fan.id, { cardId: w.r.id, holo: false });
      expect(normal).toMatchObject({ copies: 3, points: 75, dust: 22, levelBefore: 1, levelAfter: 2 });
      const holo = await recycle(tx, w.fan.id, { cardId: w.r.id, holo: true });
      expect(holo).toMatchObject({ copies: 1, points: 37, dust: 11 });
      expect([await w.qty(w.r.id), await w.qty(w.r.id, true)]).toEqual([1, 1]);
      expect(await w.xp()).toBe(112);
      expect(await w.dust()).toBe(33);
      await expect(recycle(tx, w.fan.id, { cardId: w.r.id, holo: false })).rejects.toMatchObject({ code: "nothing_to_recycle" });
    });
  });

  it("test_s029_rf3_con_el_vinculo_al_maximo_da_el_polvo_completo_y_ningun_punto", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      await tx.insert(characterBonds).values({ userId: w.fan.id, characterId: w.characterId, xp: BOND_THRESHOLDS.at(-1)! });
      await w.give(w.e.id, 3);
      expect(await recycle(tx, w.fan.id, { cardId: w.e.id, holo: false })).toMatchObject({ copies: 2, points: 0, dust: 80, levelAfter: 10 });
      expect(await w.xp()).toBe(2500);
    });
  });

  it("test_s029_rf4_la_vista_previa_dice_lo_mismo_que_el_reciclaje_sin_cambiar_nada", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      await w.give(w.c.id, 6);
      await w.give(w.e.id, 2);
      const preview = await previewRecycle(tx, w.fan.id, { characterId: w.characterId });
      expect(preview).toMatchObject({ copies: 6, points: 110, levelAfter: 2, characterId: w.characterId });
      expect([await w.qty(w.c.id), await w.xp(), await w.dust()]).toEqual([6, 0, 0]);
      expect(await recycle(tx, w.fan.id, { characterId: w.characterId })).toMatchObject({ copies: preview.copies, points: preview.points, dust: preview.dust });
    });
  });

  it("test_s029_rf5_rf7_recicla_todas_las_repetidas_del_personaje_en_un_paso_con_auditoria", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      await w.give(w.c.id, 3);
      await w.give(w.r.id, 2);
      await w.give(w.e.id, 1);
      const r = await recycle(tx, w.fan.id, { characterId: w.characterId });
      expect(r).toMatchObject({ copies: 3, points: 45 });
      expect([await w.qty(w.c.id), await w.qty(w.r.id), await w.qty(w.e.id)]).toEqual([1, 1, 1]);
      const [log] = await tx.select().from(auditLog).where(and(eq(auditLog.action, "bond_recycle"), eq(auditLog.actorUserId, w.fan.id)));
      expect(log).toMatchObject({ entityType: "character", entityId: w.characterId });
      expect(log.meta).toMatchObject({ copies: 3, points: 45, dust: r.dust, levelBefore: 1, levelAfter: 1 });
      expect((log.meta as { cards: unknown[] }).cards).toHaveLength(2);
    });
  });

  it("test_s029_rf1_una_carta_sin_personaje_no_se_recicla", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      await w.give(w.c.id, 3);
      await tx.execute(sql`update cards set character_id = null where id = ${w.c.id}`);
      await expect(recycle(tx, w.fan.id, { cardId: w.c.id, holo: false })).rejects.toMatchObject({ code: "no_character" });
    });
  });

  it("test_s029_rf8_reciclaje_y_expediciones_suman_en_la_misma_barra", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      // El vínculo de las expediciones (spec 020) es la misma fila que sube el reciclaje.
      await tx.insert(characterBonds).values({ userId: w.fan.id, characterId: w.characterId, xp: 30 });
      await w.give(w.c.id, 3);
      const r = await recycle(tx, w.fan.id, { cardId: w.c.id, holo: false });
      expect(r).toMatchObject({ xpBefore: 30, xpAfter: 50, levelAfter: 2 });
      expect(await w.xp()).toBe(50);
    });
  });
});

describe("spec 029 — concurrencia", () => {
  it("test_s029_rf6_dos_reciclajes_a_la_vez_solo_reciclan_lo_que_existe", async () => {
    // Datos confirmados para usar dos conexiones de verdad.
    const a = testDb();
    const b = testDb();
    const w = await world(a.db, "BNDC", "fan-bond-conc");
    try {
      await w.give(w.r.id, 4);
      const results = await Promise.allSettled([recycle(a.db, w.fan.id, { cardId: w.r.id, holo: false }), recycle(b.db, w.fan.id, { cardId: w.r.id, holo: false })]);
      const ok = results.filter((x) => x.status === "fulfilled");
      const failed = results.filter((x): x is PromiseRejectedResult => x.status === "rejected");
      expect(ok).toHaveLength(1);
      expect(failed.map((f) => (f.reason as { code: string }).code)).toEqual(["nothing_to_recycle"]);
      expect(await w.qty(w.r.id)).toBe(1);
      expect(await w.xp()).toBe(75);
      expect(await w.dust()).toBe(22);
      // Dos fabricaciones a la vez con polvo para una sola: una sale bien y el saldo nunca baja de cero.
      await a.db.update(userRewards).set({ dust: 100 }).where(eq(userRewards.userId, w.fan.id));
      const crafts = await Promise.allSettled([craftCard(a.db, w.fan.id, w.c.id), craftCard(b.db, w.fan.id, w.c.id)]);
      expect(crafts.filter((x) => x.status === "fulfilled")).toHaveLength(1);
      expect(await w.dust()).toBe(0);
    } finally {
      await a.db.delete(userCards).where(eq(userCards.userId, w.fan.id));
      await a.db.delete(characterBonds).where(eq(characterBonds.userId, w.fan.id));
      await a.db.delete(userRewards).where(eq(userRewards.userId, w.fan.id));
      await a.db.delete(expeditionProfiles).where(eq(expeditionProfiles.userId, w.fan.id));
      await a.db.delete(packs).where(eq(packs.setId, w.set.id));
      await a.db.execute(sql`delete from audit_log`);
      await a.db.delete(sets).where(eq(sets.id, w.set.id));
      await a.db.delete(libraryItems);
      await a.db.delete(characters).where(eq(characters.id, w.characterId));
      await a.db.delete(users).where(inArray(users.id, [w.fan.id, w.admin.id]));
      await a.sql.end();
      await b.sql.end();
    }
  });
});

describe("spec 029 — fabricar", () => {
  it("test_s029_rf18_rf20_rf21_fabrica_una_copia_normal_con_el_polvo_de_su_rareza", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      await tx.insert(userRewards).values({ userId: w.fan.id, dust: 350 });
      const r = await craftCard(tx, w.fan.id, w.r.id);
      expect(r).toMatchObject({ cost: 300, dust: 50, qty: 1 });
      expect([await w.qty(w.r.id), await w.qty(w.r.id, true)]).toEqual([1, 0]);
      const [log] = await tx.select().from(auditLog).where(eq(auditLog.action, "bond_craft"));
      expect(log).toMatchObject({ actorUserId: w.fan.id, entityId: w.r.id, meta: { cost: 300, dustBefore: 350, dustAfter: 50 } });
    });
  });

  it("test_s029_rf19_no_fabrica_sin_polvo_ni_ex_ni_de_coleccion_archivada_o_18_sin_filtro", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      await tx.insert(userRewards).values({ userId: w.fan.id, dust: 99 });
      await expect(craftCard(tx, w.fan.id, w.c.id)).rejects.toMatchObject({ code: "cannot_craft", params: { reason: "dust", cost: 100, dust: 99 } });
      await tx.update(userRewards).set({ dust: 5000 }).where(eq(userRewards.userId, w.fan.id));
      await tx.execute(sql`update cards set rarity = 'ex' where id = ${w.e.id}`);
      await expect(craftCard(tx, w.fan.id, w.e.id)).rejects.toMatchObject({ params: { reason: "ex" } });
      await tx.update(sets).set({ status: "archived" }).where(eq(sets.id, w.set.id));
      await expect(craftCard(tx, w.fan.id, w.c.id)).rejects.toMatchObject({ params: { reason: "unpublished" } });
      // Caso límite: en una archivada sí se recicla.
      await w.give(w.c.id, 2);
      expect((await recycle(tx, w.fan.id, { cardId: w.c.id, holo: false })).copies).toBe(1);
      await tx.update(sets).set({ status: "published", isAdult: true }).where(eq(sets.id, w.set.id));
      await expect(craftCard(tx, w.fan.id, w.c.id)).rejects.toMatchObject({ code: "not_found" });
      expect(await w.dust()).toBe(5002);
    });
  });
});

describe("spec 029 — línea de personaje", () => {
  it("test_s029_rf15_rf16_la_linea_muestra_las_que_tiene_las_que_faltan_el_vinculo_y_lo_siguiente", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      await w.give(w.c.id, 3);
      await tx.insert(characterBonds).values({ userId: w.fan.id, characterId: w.characterId, xp: 160 });
      const line = await characterLine(tx, w.fan.id, w.characterId);
      expect(line!.cards.map((c) => [c.rarity, c.owned.normal, c.recyclable.normal])).toEqual([
        ["common", 3, 2],
        ["rare", 0, 0],
        ["epic", 0, 0],
        // La legendaria que la fábrica de pruebas añade para el sobre gold.
        ["legendary", 0, 0],
      ]);
      expect(line!.bond).toMatchObject({ level: 3, xp: 160, from: 150, to: 300, titleLevel: 3, customTitle: null, next: { level: 5, unlock: "holo" } });
      expect(line!.recyclableTotal).toBe(2);
      expect(line!.cards[1].craft).toEqual({ cost: 300, problem: "dust" });
      // RF-16: tenerlas todas no da nada (ni polvo ni puntos).
      for (const c of line!.cards) await w.give(c.cardId, 1);
      const full = await characterLine(tx, w.fan.id, w.characterId);
      expect([full!.dust, full!.bond.xp]).toEqual([0, 160]);
    });
  });
});

describe("spec 029 — panel", () => {
  it("test_s029_rf22_el_administrador_cambia_puntos_polvo_costes_y_titulos_con_registro", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      const next = { ...FACTORY_BOND_SETTINGS, points: { ...FACTORY_BOND_SETTINGS.points, common: 50 }, titles: { "3": "Compañera" } };
      await setBondSettings(tx, w.admin.id, next);
      expect(await getBondSettings(tx)).toMatchObject({ points: { common: 50 }, titles: { "3": "Compañera" } });
      await expect(setBondSettings(tx, w.admin.id, { ...next, holoFactor: 9 })).rejects.toMatchObject({ code: "invalid_bond_settings" });
      const [log] = await tx.select().from(auditLog).where(eq(auditLog.action, "settings.bond_settings"));
      expect(log).toMatchObject({ actorUserId: w.admin.id, before: FACTORY_BOND_SETTINGS });
      // Cada reciclaje usa los valores del momento.
      await w.give(w.c.id, 2);
      expect((await recycle(tx, w.fan.id, { cardId: w.c.id, holo: false })).points).toBe(50);
      await tx.insert(characterBonds).values({ userId: w.fan.id, characterId: w.characterId, xp: 150 }).onConflictDoUpdate({ target: [characterBonds.userId, characterBonds.characterId], set: { xp: 150 } });
      expect((await characterLine(tx, w.fan.id, w.characterId))!.bond.customTitle).toBe("Compañera");
    });
  });

  it("test_s029_rf23_el_simulador_da_los_dias_al_nivel_10_del_gratuito_y_del_patron", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      const sim = await simulateBond(tx, w.set.id, w.characterId);
      expect(sim!.cards).toBe(4);
      expect(sim!.free).toBeGreaterThan(0);
      expect(sim!.patron!).toBeLessThanOrEqual(sim!.free!);
    });
  });
});

describe("spec 029 — baja de cuenta", () => {
  it("test_s029_el_vinculo_y_el_polvo_se_borran_con_la_cuenta", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      await w.give(w.c.id, 3);
      await recycle(tx, w.fan.id, { cardId: w.c.id, holo: false });
      await purgeAccount(tx, w.fan.id);
      expect(await w.xp()).toBe(0);
      expect(await w.dust()).toBe(0);
    });
  });
});
