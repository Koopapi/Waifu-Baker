// Spec 021: economía. Lo gratis solo da gratis; las colecciones de Patreon llegan con la suscripción; el patron tiene
// insignia y un tercer espacio de expedición.
import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { albums, auditLog, expeditionProfiles, packs, patreonLinks, tierRules, userCards, userRewards } from "@/db/schema";
import { defaultZoneLoot } from "@/domain/expeditions/rules";
import { accountSummary } from "@/server/services/account";
import { activateAlbum, publicAlbum } from "@/server/services/album";
import { createSet, listPublicOdds, listSets, setFreeSet, updateSet } from "@/server/services/collections";
import { saveZone } from "@/server/services/expedition-zones";
import { cancelExpedition, claimExpedition, choosePackSet, expeditionsHome, sendExpedition } from "@/server/services/expeditions";
import { isPatronUser } from "@/server/services/patron";
import { claimDaily, claimFreePack, claimableSets, rewardsSummary } from "@/server/services/rewards";
import { upsertUserFromLogin } from "@/server/services/users";
import { grantWelcomePack, setWelcomeSet } from "@/server/services/welcome";
import type { DbLike } from "@/server/db-types";
import { inRollback } from "./db";
import { createPublishedSet, makeAdmin } from "./factories";

const T0 = new Date("2026-10-25T12:00:00Z");
const min = (n: number) => new Date(T0.getTime() + n * 60_000);

async function world(db: DbLike) {
  const admin = await makeAdmin(db);
  const free = await createPublishedSet(db, admin.id, { code: "ECOF", isFree: true, rarities: ["common"], slots: [{ common: 100 }] });
  const patreon = await createPublishedSet(db, admin.id, { code: "ECOP", rarities: ["common", "rare", "epic"], slots: [{ common: 100 }] });
  const adult = await createPublishedSet(db, admin.id, { code: "ECOA", rarities: ["common"], slots: [{ common: 100 }], isAdult: true });
  const fan = await upsertUserFromLogin(db, { patreonUserId: "fan-eco", displayName: "Fan", role: "user" });
  return { admin, free, patreon, adult, fan };
}

/** Membresía simulada: activa y pagada en el tier `sfw`, que da sobres de la colección de Patreon. */
async function makePatron(db: DbLike, w: Awaited<ReturnType<typeof world>>) {
  await db.insert(tierRules).values({ patreonTierId: "sfw", name: "SFW", setId: w.patreon.set.id, packsPerMonth: 8, active: true }).onConflictDoNothing();
  await db
    .insert(patreonLinks)
    .values({ userId: w.fan.id, memberId: "m-eco", patronStatus: "active_patron", lastChargeDate: T0, lastChargeStatus: "Paid", nextChargeDate: new Date("2026-11-25T12:00:00Z"), entitledTierIds: ["sfw"] })
    .onConflictDoUpdate({ target: patreonLinks.userId, set: { patronStatus: "active_patron", lastChargeStatus: "Paid", entitledTierIds: ["sfw"] } });
}

const unPatron = (db: DbLike, userId: string) => db.update(patreonLinks).set({ patronStatus: "former_patron" }).where(eq(patreonLinks.userId, userId));

describe("spec 021 — colecciones gratuitas y de Patreon", () => {
  it("test_s021_rf1_rf3_el_administrador_marca_una_coleccion_gratuita_y_queda_en_el_historial", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      const rows = () => listSets(tx).then((l) => Object.fromEntries(l.map((s) => [s.code, s.isFree])));
      expect(await rows()).toMatchObject({ ECOF: true, ECOP: false, ECOA: false });
      await setFreeSet(tx, w.admin.id, w.patreon.set.id, true);
      expect((await rows()).ECOP).toBe(true);
      await setFreeSet(tx, w.admin.id, w.patreon.set.id, false);
      expect((await rows()).ECOP).toBe(false);
      const audit = await tx.select().from(auditLog).where(and(eq(auditLog.action, "set.free"), eq(auditLog.entityId, w.patreon.set.id)));
      expect(audit).toHaveLength(2);
    });
  });

  it("test_s021_rf2_una_coleccion_18_no_puede_ser_gratuita", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      await expect(setFreeSet(tx, w.admin.id, w.adult.set.id, true)).rejects.toMatchObject({ code: "free_adult" });
      // Pasar a 18+ una colección gratuita (en borrador) le quita la marca.
      const draft = await createSet(tx, w.admin.id, { code: "ECOD", name: "Borrador", isAdult: false });
      await setFreeSet(tx, w.admin.id, draft.id, true);
      const updated = await updateSet(tx, w.admin.id, draft.id, draft.version, { isAdult: true });
      expect(updated).toMatchObject({ isAdult: true, isFree: false });
    });
  });

  it("test_s021_rf4_el_sobre_cada_12_h_solo_ofrece_colecciones_gratuitas", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      expect((await claimableSets(tx)).map((s) => s.code)).toEqual(["ECOF"]);
      await rewardsSummary(tx, w.fan.id, { now: T0 });
      await expect(claimFreePack(tx, w.fan.id, { setId: w.patreon.set.id, now: T0 })).rejects.toMatchObject({ code: "set_not_claimable" });
      expect((await rewardsSummary(tx, w.fan.id, { now: T0 })).free.charges).toBe(1);
      const r = await claimFreePack(tx, w.fan.id, { setId: w.free.set.id, now: T0 });
      expect(r.setId).toBe(w.free.set.id);
    });
  });

  it("test_s021_rf5_el_sobre_del_dia_7_solo_es_de_una_coleccion_gratuita", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      await tx.insert(userRewards).values({ userId: w.fan.id, streakDay: 6, lastDailyDay: "2026-10-24", lastDailyAt: new Date("2026-10-24T12:00:00Z"), lastTimeZone: "UTC" });
      await expect(claimDaily(tx, w.fan.id, { now: T0, timeZone: "UTC", setId: w.patreon.set.id })).rejects.toMatchObject({ code: "set_not_claimable" });
      const r = await claimDaily(tx, w.fan.id, { now: T0, timeZone: "UTC", setId: w.free.set.id });
      expect(r.day).toBe(7);
      expect(r.packId).not.toBeNull();
    });
  });

  it("test_s021_rf6_rf7_el_sobre_de_expedicion_solo_es_gratuito_y_sin_gratuitas_queda_pendiente", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      // Sin colecciones gratuitas publicadas: el sobre ganado espera.
      await setFreeSet(tx, w.admin.id, w.free.set.id, false);
      await tx.insert(userCards).values({ userId: w.fan.id, cardId: w.patreon.cards[0].id });
      const loot = { ...defaultZoneLoot(30), "30": { cookies: 5, fragments: 1, packChance: 1 } };
      const zone = await saveZone(tx, w.admin.id, { name: "Z", terrain: "city", difficulty: 10, fragmentsRequired: 0, sortOrder: 1, active: true, loot });
      const e = await sendExpedition(tx, w.fan.id, { zoneId: zone.id, durationMin: 30, cards: [{ cardId: w.patreon.cards[0].id, holo: false }] }, T0);
      const r = await claimExpedition(tx, w.fan.id, e.id, min(30));
      expect(r.result).toMatchObject({ packWon: true, packId: null });
      expect((await expeditionsHome(tx, w.fan.id, min(30))).pendingPacks.map((p) => p.id)).toEqual([e.id]);
      await expect(choosePackSet(tx, w.fan.id, e.id, w.patreon.set.id)).rejects.toMatchObject({ code: "set_not_claimable" });
      // En cuanto hay una gratuita, se elige y llega.
      await setFreeSet(tx, w.admin.id, w.free.set.id, true);
      const packId = await choosePackSet(tx, w.fan.id, e.id, w.free.set.id);
      const [p] = await tx.select().from(packs).where(eq(packs.id, packId));
      expect(p.setId).toBe(w.free.set.id);
    });
  });

  it("test_s021_rf8_la_bienvenida_puede_ser_una_coleccion_de_patreon", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      await setWelcomeSet(tx, w.admin.id, w.patreon.set.id);
      await grantWelcomePack(tx, w.fan);
      const [p] = await tx.select().from(packs).where(and(eq(packs.userId, w.fan.id), eq(packs.source, "promo")));
      expect(p.setId).toBe(w.patreon.set.id);
    });
  });

  it("test_s021_rf10_las_probabilidades_publicas_saben_si_cada_coleccion_es_gratuita", async () => {
    await inRollback(async (tx) => {
      await world(tx);
      const rows = await listPublicOdds(tx);
      expect(Object.fromEntries(rows.map((r) => [r.set.code, r.set.isFree]))).toMatchObject({ ECOF: true, ECOP: false });
    });
  });
});

describe("spec 021 — patron", () => {
  it("test_s021_rf11_rf12_la_insignia_sigue_a_la_membresia_en_la_cuenta_y_el_album_publico", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      expect(await isPatronUser(tx, w.fan.id)).toBe(false);
      expect((await accountSummary(tx, w.fan.id))!.patron).toBe(false);
      await makePatron(tx, w);
      expect(await isPatronUser(tx, w.fan.id)).toBe(true);
      expect((await accountSummary(tx, w.fan.id))!.patron).toBe(true);
      await activateAlbum(tx, w.fan.id, "eco-fan");
      const [album] = await tx.select().from(albums).where(eq(albums.userId, w.fan.id));
      expect((await publicAlbum(tx, album.slug))!.patron).toBe(true);
      // Se va la membresía: se va la insignia.
      await unPatron(tx, w.fan.id);
      expect(await isPatronUser(tx, w.fan.id)).toBe(false);
      expect((await publicAlbum(tx, album.slug))!.patron).toBe(false);
      // Un tier sin reglas no hace patron.
      await tx.update(patreonLinks).set({ patronStatus: "active_patron", entitledTierIds: ["free"] }).where(eq(patreonLinks.userId, w.fan.id));
      expect(await isPatronUser(tx, w.fan.id)).toBe(false);
    });
  });

  it("test_s021_rf13_rf14_el_patron_tiene_3_espacios_y_al_dejar_de_serlo_terminan_los_tres", async () => {
    await inRollback(async (tx) => {
      const w = await world(tx);
      const [a, b, c] = w.patreon.cards;
      await tx.insert(userCards).values([a, b, c].map((card) => ({ userId: w.fan.id, cardId: card.id })));
      const zone = await saveZone(tx, w.admin.id, { name: "Z", terrain: "city", difficulty: 10, fragmentsRequired: 0, sortOrder: 1, active: true, loot: defaultZoneLoot(10) });
      const send = (card: { id: string }, now: Date) => sendExpedition(tx, w.fan.id, { zoneId: zone.id, durationMin: 120, cards: [{ cardId: card.id, holo: false }] }, now);
      expect((await expeditionsHome(tx, w.fan.id, T0)).slots).toBe(2);
      await send(a, T0);
      await send(b, T0);
      await expect(send(c, T0)).rejects.toMatchObject({ code: "no_free_slot", params: { slots: 2 } });
      await makePatron(tx, w);
      expect((await expeditionsHome(tx, w.fan.id, T0))).toMatchObject({ slots: 3, patron: true });
      const third = await send(c, T0);
      expect((await expeditionsHome(tx, w.fan.id, T0)).expeditions).toHaveLength(3);
      // Deja de ser patron: las tres siguen; no puede enviar otra hasta bajar de 2.
      await unPatron(tx, w.fan.id);
      const home = await expeditionsHome(tx, w.fan.id, min(10));
      expect(home).toMatchObject({ slots: 2, patron: false });
      expect(home.expeditions).toHaveLength(3);
      await cancelExpedition(tx, w.fan.id, third.id, min(10));
      await expect(send(c, min(10))).rejects.toMatchObject({ code: "no_free_slot", params: { slots: 2 } });
      const [{ fragments }] = await tx.select().from(expeditionProfiles).where(eq(expeditionProfiles.userId, w.fan.id));
      expect(fragments).toBe(0);
    });
  });
});
