// Spec 020: Expediciones (servicio del coleccionista). El servidor decide con su reloj y su RNG.
import { describe, expect, it } from "vitest";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  auditLog,
  characterBonds,
  cookieLedger,
  expeditionCards,
  expeditionProfiles,
  expeditionZoneUnlocks,
  expeditionZones,
  expeditions,
  libraryItems,
  packs,
  sets,
  userCards,
  userRewards,
  users,
} from "@/db/schema";
import { defaultZoneLoot } from "@/domain/expeditions/rules";
import { updateCharacter } from "@/server/services/characters";
import {
  cancelExpedition,
  choosePackSet,
  claimExpedition,
  expeditionsHome,
  expeditionsReady,
  sendExpedition,
  unlockZone,
} from "@/server/services/expeditions";
import { saveZone } from "@/server/services/expedition-zones";
import { upsertUserFromLogin } from "@/server/services/users";
import { inRollback, testDb } from "./db";
import { createPublishedSet, makeAdmin } from "./factories";
import type { DbLike } from "@/server/db-types";

const T0 = new Date("2026-10-25T10:00:00Z");
const min = (n: number) => new Date(T0.getTime() + n * 60_000);

async function world(db: DbLike, tag = "EXP") {
  const admin = await makeAdmin(db, `admin-${tag}`);
  const sfw = await createPublishedSet(db, admin.id, { code: `${tag}1`, isFree: true, rarities: ["common", "rare", "epic", "legendary"], slots: [{ rare: 100 }] });
  const adult = await createPublishedSet(db, admin.id, { code: `${tag}1A`, rarities: ["rare"], slots: [{ rare: 100 }], isAdult: true });
  const fan = await upsertUserFromLogin(db, { patreonUserId: `fan-${tag}`, displayName: "Fan", role: "user" });
  const [common, rare, epic, legendary] = sfw.cards;
  // El personaje de la colección SFW es de Ciudad y Recolectora.
  await updateCharacter(db, admin.id, common.characterId!, { terrain: "city", role: "gatherer" });
  await db.insert(userCards).values([
    { userId: fan.id, cardId: common.id },
    { userId: fan.id, cardId: rare.id },
    { userId: fan.id, cardId: rare.id, holo: true },
    { userId: fan.id, cardId: epic.id },
    { userId: fan.id, cardId: adult.cards[0].id },
  ]);
  const loot = defaultZoneLoot(30);
  const city = await saveZone(db, admin.id, { name: "Puerto Miel", terrain: "city", difficulty: 30, fragmentsRequired: 0, sortOrder: 1, active: true, loot });
  const forest = await saveZone(db, admin.id, { name: "Bosque", terrain: "forest", difficulty: 30, fragmentsRequired: 0, sortOrder: 2, active: true, loot });
  const ruins = await saveZone(db, admin.id, { name: "Ruinas", terrain: "ruins", difficulty: 80, fragmentsRequired: 5, sortOrder: 3, active: true, loot });
  return { admin, sfw, adult, fan, common, rare, epic, legendary, city, forest, ruins };
}

const send = (tx: DbLike, userId: string, zoneId: string, ids: { cardId: string; holo?: boolean }[], durationMin = 30, now = T0) =>
  sendExpedition(tx, userId, { zoneId, durationMin, cards: ids.map((c) => ({ cardId: c.cardId, holo: Boolean(c.holo) })) }, now);

describe("spec 020 — mapa y zonas", () => {
  it("test_s020_rf3_rf4_al_entrar_las_zonas_iniciales_estan_abiertas_y_las_demas_con_niebla", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      const home = await expeditionsHome(tx, w.fan.id, T0);
      expect(home.zones.map((z) => [z.name, z.open, z.fragmentsRequired])).toEqual([
        ["Puerto Miel", true, 0],
        ["Bosque", true, 0],
        ["Ruinas", false, 5],
      ]);
      expect(home.profile).toEqual({ fragments: 0, completed: 0 });
    });
  });

  it("test_s020_rf3_las_zonas_inactivas_no_salen_en_el_mapa", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      await saveZone(tx, w.admin.id, { id: w.forest.id, name: "Bosque", terrain: "forest", difficulty: 30, fragmentsRequired: 0, sortOrder: 2, active: false, loot: w.forest.loot });
      expect((await expeditionsHome(tx, w.fan.id, T0)).zones.map((z) => z.name)).toEqual(["Puerto Miel", "Ruinas"]);
    });
  });

  it("test_s020_rf5_con_los_fragmentos_se_abre_la_zona_y_se_descuentan", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      await tx.insert(expeditionProfiles).values({ userId: w.fan.id, fragments: 7 });
      await unlockZone(tx, w.fan.id, w.ruins.id);
      const home = await expeditionsHome(tx, w.fan.id, T0);
      expect(home.zones.find((z) => z.id === w.ruins.id)!.open).toBe(true);
      expect(home.profile.fragments).toBe(2);
      // Abrirla otra vez no descuenta nada.
      await unlockZone(tx, w.fan.id, w.ruins.id);
      expect((await expeditionsHome(tx, w.fan.id, T0)).profile.fragments).toBe(2);
    });
  });

  it("test_s020_rf6_sin_fragmentos_suficientes_no_se_abre_ni_descuenta", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      await tx.insert(expeditionProfiles).values({ userId: w.fan.id, fragments: 4 });
      await expect(unlockZone(tx, w.fan.id, w.ruins.id)).rejects.toMatchObject({ code: "not_enough_fragments", params: { have: 4, need: 5 } });
      const home = await expeditionsHome(tx, w.fan.id, T0);
      expect(home.zones.find((z) => z.id === w.ruins.id)!.open).toBe(false);
      expect(home.profile.fragments).toBe(4);
    });
  });
});

describe("spec 020 — armar y enviar", () => {
  it("test_s020_rf7_rf15_envia_de_1_a_3_cartas_y_guarda_la_vuelta_con_la_hora_del_servidor", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      const e = await send(tx, w.fan.id, w.city.id, [{ cardId: w.common.id }, { cardId: w.rare.id }, { cardId: w.epic.id }], 120);
      expect(e.endsAt.toISOString()).toBe(min(120).toISOString());
      expect(e.team.map((m) => m.cardId)).toEqual([w.common.id, w.rare.id, w.epic.id]);
      // Todas de Ciudad en una zona de Ciudad: (10 + 12 + 14) × 1.5 (poderes de la spec 022).
      expect(e.power).toBeCloseTo(54, 6);
      expect(e.rating).toBe("excellent");
      await expect(send(tx, w.fan.id, w.forest.id, [])).rejects.toMatchObject({ code: "invalid_team" });
      await expect(send(tx, w.fan.id, w.forest.id, [{ cardId: w.common.id }, { cardId: w.rare.id }, { cardId: w.epic.id }, { cardId: w.rare.id, holo: true }])).rejects.toMatchObject({ code: "invalid_team" });
    });
  });

  it("test_s020_rf7_no_se_envian_cartas_ajenas_ni_a_zonas_cerradas_ni_duraciones_raras", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      await expect(send(tx, w.fan.id, w.city.id, [{ cardId: w.legendary.id }])).rejects.toMatchObject({ code: "card_not_owned" });
      await expect(send(tx, w.fan.id, w.city.id, [{ cardId: w.common.id, holo: true }])).rejects.toMatchObject({ code: "card_not_owned" });
      await expect(send(tx, w.fan.id, w.ruins.id, [{ cardId: w.common.id }])).rejects.toMatchObject({ code: "zone_locked" });
      await expect(send(tx, w.fan.id, w.city.id, [{ cardId: w.common.id }], 45)).rejects.toMatchObject({ code: "invalid_duration" });
    });
  });

  it("test_s020_rf8_una_carta_fuera_no_va_a_otra_expedicion_pero_su_holo_si", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      await send(tx, w.fan.id, w.city.id, [{ cardId: w.rare.id }]);
      await expect(send(tx, w.fan.id, w.forest.id, [{ cardId: w.rare.id }])).rejects.toMatchObject({ code: "card_busy" });
      await send(tx, w.fan.id, w.forest.id, [{ cardId: w.rare.id, holo: true }]);
      const home = await expeditionsHome(tx, w.fan.id, T0);
      expect(home.cards.find((c) => c.cardId === w.rare.id && !c.holo)!.busyUntil).toBe(min(30).toISOString());
    });
  });

  it("test_s020_rf8_dos_envios_a_la_vez_con_la_misma_carta_dejan_uno_solo", async () => {
    const { db, sql: conn } = testDb();
    const other = testDb();
    const w = await world(db, "EXPC");
    try {
      const results = await Promise.allSettled([send(db, w.fan.id, w.city.id, [{ cardId: w.rare.id }]), send(other.db, w.fan.id, w.forest.id, [{ cardId: w.rare.id }])]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
      expect(rejected.reason).toMatchObject({ code: "card_busy" });
      expect(await db.select().from(expeditions).where(eq(expeditions.userId, w.fan.id))).toHaveLength(1);
    } finally {
      await cleanup(db, w);
      await other.sql.end();
      await conn.end();
    }
  });

  it("test_s020_rf9_sin_18_desbloqueado_no_se_ven_ni_se_aceptan_cartas_18", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      const adultCard = w.adult.cards[0].id;
      expect((await expeditionsHome(tx, w.fan.id, T0)).cards.some((c) => c.cardId === adultCard)).toBe(false);
      await expect(send(tx, w.fan.id, w.city.id, [{ cardId: adultCard }])).rejects.toMatchObject({ code: "card_not_owned" });
      await tx.update(users).set({ isAdultDeclared: true, adultVerifiedAt: T0 }).where(eq(users.id, w.fan.id));
      expect((await expeditionsHome(tx, w.fan.id, T0)).cards.some((c) => c.cardId === adultCard)).toBe(true);
      await send(tx, w.fan.id, w.city.id, [{ cardId: adultCard }]);
    });
  });

  it("test_s020_rf10_las_cartas_del_selector_traen_terreno_rol_rareza_y_vinculo", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      const c = (await expeditionsHome(tx, w.fan.id, T0)).cards.find((x) => x.cardId === w.common.id)!;
      expect(c).toMatchObject({ rarity: "common", terrain: "city", role: "gatherer", bondLevel: 1, holo: false, busyUntil: null });
    });
  });

  it("test_s020_rf16_sin_espacio_libre_no_se_envia", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      await send(tx, w.fan.id, w.city.id, [{ cardId: w.common.id }]);
      await send(tx, w.fan.id, w.forest.id, [{ cardId: w.rare.id }]);
      await expect(send(tx, w.fan.id, w.forest.id, [{ cardId: w.epic.id }])).rejects.toMatchObject({ code: "no_free_slot", params: { slots: 2 } });
    });
  });

  it("test_s020_rf17_los_cambios_despues_de_enviar_no_tocan_la_expedicion", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      const e = await send(tx, w.fan.id, w.city.id, [{ cardId: w.common.id }], 30);
      await updateCharacter(tx, w.admin.id, w.common.characterId!, { terrain: "forest", role: null });
      await saveZone(tx, w.admin.id, { id: w.city.id, name: "Otra", terrain: "city", difficulty: 999, fragmentsRequired: 0, sortOrder: 1, active: false, loot: defaultZoneLoot(999) });
      const r = await claimExpedition(tx, w.fan.id, e.id, min(30));
      expect(r.expedition.rating).toBe(e.rating);
      expect(r.result.loot).toEqual(e.loot);
      expect(r.expedition.zoneName).toBe("Puerto Miel");
    });
  });
});

describe("spec 020 — cancelar y reclamar", () => {
  it("test_s020_rf18_cancelar_devuelve_las_cartas_sin_botin", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      const e = await send(tx, w.fan.id, w.city.id, [{ cardId: w.common.id }], 120);
      await cancelExpedition(tx, w.fan.id, e.id, min(10));
      const home = await expeditionsHome(tx, w.fan.id, min(10));
      expect(home.expeditions).toHaveLength(0);
      expect(home.cards.find((c) => c.cardId === w.common.id)!.busyUntil).toBeNull();
      expect(await tx.select().from(cookieLedger).where(eq(cookieLedger.userId, w.fan.id))).toHaveLength(0);
      expect(await tx.select().from(characterBonds).where(eq(characterBonds.userId, w.fan.id))).toHaveLength(0);
      await expect(claimExpedition(tx, w.fan.id, e.id, min(200))).rejects.toMatchObject({ code: "expedition_not_active" });
    });
  });

  it("test_s020_rf18_no_se_cancela_una_expedicion_que_ya_volvio", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      const e = await send(tx, w.fan.id, w.city.id, [{ cardId: w.common.id }], 30);
      await expect(cancelExpedition(tx, w.fan.id, e.id, min(30))).rejects.toMatchObject({ code: "expedition_returned" });
    });
  });

  it("test_s020_rf19_antes_de_la_vuelta_no_se_entrega_nada", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      const e = await send(tx, w.fan.id, w.city.id, [{ cardId: w.common.id }], 120);
      await expect(claimExpedition(tx, w.fan.id, e.id, min(119))).rejects.toMatchObject({ code: "not_returned" });
      expect(await tx.select().from(cookieLedger).where(eq(cookieLedger.userId, w.fan.id))).toHaveLength(0);
    });
  });

  it("test_s020_rf20_al_reclamar_entrega_el_botin_fijo_y_el_vinculo_en_una_operacion", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      const e = await send(tx, w.fan.id, w.city.id, [{ cardId: w.common.id }, { cardId: w.rare.id }], 120);
      const r = await claimExpedition(tx, w.fan.id, e.id, min(120), { seed: Buffer.alloc(32, 1) });
      expect(r.result.loot).toEqual(e.loot);
      const [rw] = await tx.select().from(userRewards).where(eq(userRewards.userId, w.fan.id));
      expect(rw.cookies).toBe(e.loot.cookies);
      const [ledger] = await tx.select().from(cookieLedger).where(eq(cookieLedger.userId, w.fan.id));
      expect(ledger).toMatchObject({ amount: e.loot.cookies, reason: `expedition:${e.id}` });
      const home = await expeditionsHome(tx, w.fan.id, min(120));
      expect(home.profile).toEqual({ fragments: e.loot.fragments, completed: 1 });
      // Las dos cartas son de la misma personaje: el vínculo suma una vez (12 por 2 h).
      const bonds = await tx.select().from(characterBonds).where(eq(characterBonds.userId, w.fan.id));
      expect(bonds).toEqual([expect.objectContaining({ characterId: w.common.characterId, xp: 12 })]);
      expect(r.result.bonds).toEqual([{ characterId: w.common.characterId, xp: 12, level: 1, before: 1 }]);
      expect(home.cards.find((c) => c.cardId === w.rare.id && !c.holo)!.busyUntil).toBeNull();
    });
  });

  it("test_s020_rf21_rf22_con_una_sola_coleccion_sfw_el_sobre_ganado_llega_al_momento", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      const loot = { ...defaultZoneLoot(30), "30": { cookies: 5, fragments: 1, packChance: 1 } };
      await saveZone(tx, w.admin.id, { id: w.city.id, name: "Puerto Miel", terrain: "city", difficulty: 30, fragmentsRequired: 0, sortOrder: 1, active: true, loot });
      const e = await send(tx, w.fan.id, w.city.id, [{ cardId: w.common.id }], 30);
      const r = await claimExpedition(tx, w.fan.id, e.id, min(30));
      expect(r.result.packWon).toBe(true);
      const [p] = await tx.select().from(packs).where(and(eq(packs.userId, w.fan.id), eq(packs.source, "expedition")));
      expect(p).toMatchObject({ id: r.result.packId, setId: w.sfw.set.id, status: "sealed", grantKey: `expedition:${e.id}` });
    });
  });

  it("test_s020_rf21_con_probabilidad_0_nunca_sale_sobre", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      const loot = { ...defaultZoneLoot(30), "30": { cookies: 5, fragments: 1, packChance: 0 } };
      await saveZone(tx, w.admin.id, { id: w.city.id, name: "Puerto Miel", terrain: "city", difficulty: 30, fragmentsRequired: 0, sortOrder: 1, active: true, loot });
      for (let i = 0; i < 3; i++) {
        const e = await send(tx, w.fan.id, w.city.id, [{ cardId: w.common.id }], 30, min(i * 60));
        expect((await claimExpedition(tx, w.fan.id, e.id, min(i * 60 + 30))).result.packWon).toBe(false);
      }
      expect(await tx.select().from(packs).where(eq(packs.userId, w.fan.id))).toHaveLength(0);
    });
  });

  it("test_s020_rf22_con_varias_colecciones_sfw_el_coleccionista_elige_la_del_sobre", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      const other = await createPublishedSet(tx, w.admin.id, { code: "EXP2", isFree: true, rarities: ["rare"], slots: [{ rare: 100 }] });
      const loot = { ...defaultZoneLoot(30), "30": { cookies: 5, fragments: 1, packChance: 1 } };
      await saveZone(tx, w.admin.id, { id: w.city.id, name: "Puerto Miel", terrain: "city", difficulty: 30, fragmentsRequired: 0, sortOrder: 1, active: true, loot });
      const e = await send(tx, w.fan.id, w.city.id, [{ cardId: w.common.id }], 30);
      const r = await claimExpedition(tx, w.fan.id, e.id, min(30));
      expect(r.result).toMatchObject({ packWon: true, packId: null });
      expect((await expeditionsHome(tx, w.fan.id, min(30))).pendingPacks.map((p) => p.id)).toEqual([e.id]);
      await expect(choosePackSet(tx, w.fan.id, e.id, w.adult.set.id)).rejects.toMatchObject({ code: "set_not_claimable" });
      const packId = await choosePackSet(tx, w.fan.id, e.id, other.set.id);
      const [p] = await tx.select().from(packs).where(eq(packs.id, packId));
      expect(p).toMatchObject({ setId: other.set.id, source: "expedition", grantKey: `expedition:${e.id}` });
      await expect(choosePackSet(tx, w.fan.id, e.id, w.sfw.set.id)).rejects.toMatchObject({ code: "pack_not_pending" });
      expect((await expeditionsHome(tx, w.fan.id, min(30))).pendingPacks).toHaveLength(0);
    });
  });

  it("test_s020_rf23_reclamar_dos_veces_entrega_una_sola_vez_y_el_mismo_reporte", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      const e = await send(tx, w.fan.id, w.city.id, [{ cardId: w.common.id }], 480);
      const a = await claimExpedition(tx, w.fan.id, e.id, min(480));
      const b = await claimExpedition(tx, w.fan.id, e.id, min(500));
      expect(b.result).toEqual(a.result);
      expect(b.alreadyClaimed).toBe(true);
      expect(await tx.select().from(cookieLedger).where(eq(cookieLedger.userId, w.fan.id))).toHaveLength(1);
      expect((await expeditionsHome(tx, w.fan.id, min(500))).profile.completed).toBe(1);
    });
  });

  it("test_s020_rf23_dos_reclamos_a_la_vez_entregan_una_sola_vez", async () => {
    const { db, sql: conn } = testDb();
    const other = testDb();
    const w = await world(db, "EXPD");
    try {
      const e = await send(db, w.fan.id, w.city.id, [{ cardId: w.common.id }], 30);
      const [a, b] = await Promise.all([claimExpedition(db, w.fan.id, e.id, min(30)), claimExpedition(other.db, w.fan.id, e.id, min(30))]);
      expect(b.result).toEqual(a.result);
      expect(await db.select().from(cookieLedger).where(eq(cookieLedger.userId, w.fan.id))).toHaveLength(1);
      const [rw] = await db.select().from(userRewards).where(eq(userRewards.userId, w.fan.id));
      expect(rw.cookies).toBe(e.loot.cookies);
    } finally {
      await cleanup(db, w);
      await other.sql.end();
      await conn.end();
    }
  });

  it("test_s020_rf24_el_reporte_trae_frases_segun_la_duracion_con_las_personajes_del_equipo", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      const e = await send(tx, w.fan.id, w.city.id, [{ cardId: w.common.id }, { cardId: w.rare.id }], 480);
      const r = await claimExpedition(tx, w.fan.id, e.id, min(480), { seed: Buffer.alloc(32, 3) });
      expect(r.result.phrases).toHaveLength(3);
      for (const p of r.result.phrases) expect([...p.order].sort()).toEqual([0, 1]);
      // La misma semilla da el mismo reporte (útil para soporte).
      const e2 = await send(tx, w.fan.id, w.city.id, [{ cardId: w.common.id }, { cardId: w.rare.id }], 480, min(600));
      const again = (await claimExpedition(tx, w.fan.id, e2.id, min(1080), { seed: Buffer.alloc(32, 3) })).result.phrases;
      expect(again).toEqual(r.result.phrases);
    });
  });
});

describe("spec 020 — contador", () => {
  it("test_s020_rf2_cuenta_las_expediciones_que_ya_volvieron_sin_reclamar", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      const a = await send(tx, w.fan.id, w.city.id, [{ cardId: w.common.id }], 30);
      await send(tx, w.fan.id, w.forest.id, [{ cardId: w.rare.id }], 120);
      expect(await expeditionsReady(tx, w.fan.id, min(29))).toBe(0);
      expect(await expeditionsReady(tx, w.fan.id, min(30))).toBe(1);
      expect(await expeditionsReady(tx, w.fan.id, min(120))).toBe(2);
      await claimExpedition(tx, w.fan.id, a.id, min(120));
      expect(await expeditionsReady(tx, w.fan.id, min(120))).toBe(1);
    });
  });
});

/** Borra lo que dejan los tests con datos confirmados (concurrencia). */
async function cleanup(db: DbLike, w: Awaited<ReturnType<typeof world>>) {
  const userIds = [w.fan.id, w.admin.id];
  const exps = await db.select({ id: expeditions.id }).from(expeditions).where(eq(expeditions.userId, w.fan.id));
  if (exps.length) await db.delete(expeditionCards).where(inArray(expeditionCards.expeditionId, exps.map((e) => e.id)));
  await db.delete(expeditions).where(eq(expeditions.userId, w.fan.id));
  await db.delete(expeditionZoneUnlocks).where(eq(expeditionZoneUnlocks.userId, w.fan.id));
  await db.delete(expeditionProfiles).where(eq(expeditionProfiles.userId, w.fan.id));
  await db.delete(characterBonds).where(eq(characterBonds.userId, w.fan.id));
  await db.delete(expeditionZones).where(inArray(expeditionZones.id, [w.city.id, w.forest.id, w.ruins.id]));
  await db.delete(cookieLedger).where(eq(cookieLedger.userId, w.fan.id));
  await db.delete(userRewards).where(eq(userRewards.userId, w.fan.id));
  await db.delete(userCards).where(eq(userCards.userId, w.fan.id));
  await db.delete(packs).where(eq(packs.userId, w.fan.id));
  await db.delete(auditLog);
  await db.delete(sets).where(inArray(sets.id, [w.sfw.set.id, w.adult.set.id]));
  await db.delete(libraryItems);
  await db.execute(sql`delete from characters where slug like 'personaje-exp%'`);
  await db.delete(users).where(inArray(users.id, userIds));
}

