// Spec 009: sobres gratis con espera, recompensa diaria, galletas y panel.
import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { cookieLedger, packOpenings, packs, pityCounters, sets, userRewards } from "@/db/schema";
import { deactivateAccount, purgeExpiredAccounts } from "@/server/services/account";
import { archiveSet } from "@/server/services/collections";
import { openPack } from "@/server/services/packs";
import { adjustCookies, claimDaily, claimFreePack, claimableSets, cookieHistory, rewardsForAdmin, rewardsSummary } from "@/server/services/rewards";
import { upsertUserFromLogin } from "@/server/services/users";
import { inRollback } from "./db";
import { createPublishedSet, makeAdmin } from "./factories";

type Tx = Parameters<Parameters<typeof inRollback>[0]>[0];
const T0 = new Date("2026-10-15T15:00:00Z");
const h = (n: number) => new Date(T0.getTime() + n * 3_600_000);
const TZ = "America/Mexico_City";

async function world(tx: Tx) {
  const admin = await makeAdmin(tx);
  const sfw = await createPublishedSet(tx, admin.id, { code: "FREE1", isFree: true, rarities: ["common", "rare"], slots: [{ common: 100 }, { rare: 100 }], pity: 2 });
  const adult = await createPublishedSet(tx, admin.id, { code: "FREE1A", rarities: ["rare"], slots: [{ rare: 100 }], isAdult: true });
  const fan = await upsertUserFromLogin(tx, { patreonUserId: "p-free", displayName: "Fan", role: "user" });
  return { admin, sfw, adult, fan };
}

const sealedOf = (tx: Tx, userId: string, source: "free" | "daily") => tx.select().from(packs).where(and(eq(packs.userId, userId), eq(packs.source, source)));

describe("spec 009 — sobres gratis", () => {
  it("test_s009_rf3_un_usuario_nuevo_empieza_con_1_carga", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      expect((await rewardsSummary(tx, fan.id, { now: T0 })).free).toEqual({ charges: 1, max: 2, nextAt: h(12) });
    });
  });

  it("test_s009_rf4_reclamar_concede_un_sobre_de_la_coleccion_elegida", async () => {
    await inRollback(async (tx) => {
      const { fan, sfw } = await world(tx);
      await rewardsSummary(tx, fan.id, { now: T0 });
      const r = await claimFreePack(tx, fan.id, { setId: sfw.set.id, now: h(1) });
      const [p] = await sealedOf(tx, fan.id, "free");
      expect(p).toMatchObject({ id: r.packId, setId: sfw.set.id, status: "sealed" });
      expect((await rewardsSummary(tx, fan.id, { now: h(1) })).free.charges).toBe(0);
    });
  });

  it("test_s009_rf1_se_recarga_cada_12_horas_hasta_2", async () => {
    await inRollback(async (tx) => {
      const { fan, sfw } = await world(tx);
      await rewardsSummary(tx, fan.id, { now: T0 });
      await claimFreePack(tx, fan.id, { setId: sfw.set.id, now: T0 });
      expect((await rewardsSummary(tx, fan.id, { now: h(11) })).free.charges).toBe(0);
      expect((await rewardsSummary(tx, fan.id, { now: h(12) })).free.charges).toBe(1);
      expect((await rewardsSummary(tx, fan.id, { now: h(500) })).free).toMatchObject({ charges: 2, nextAt: null });
    });
  });

  it("test_s009_rf2_al_maximo_la_siguiente_empieza_al_gastar", async () => {
    await inRollback(async (tx) => {
      const { fan, sfw } = await world(tx);
      await rewardsSummary(tx, fan.id, { now: T0 });
      await claimFreePack(tx, fan.id, { setId: sfw.set.id, now: h(100) });
      expect((await rewardsSummary(tx, fan.id, { now: h(100) })).free).toEqual({ charges: 1, max: 2, nextAt: h(112) });
    });
  });

  it("test_s009_rf5_el_resumen_trae_cargas_y_cuenta_atras", async () => {
    await inRollback(async (tx) => {
      const { fan, sfw } = await world(tx);
      await rewardsSummary(tx, fan.id, { now: T0 });
      await claimFreePack(tx, fan.id, { setId: sfw.set.id, now: h(3) });
      const s = await rewardsSummary(tx, fan.id, { now: h(4) });
      expect(s.free.charges).toBe(0);
      expect(s.free.nextAt?.toISOString()).toBe(h(12).toISOString());
    });
  });

  it("test_s009_rf6_sin_cargas_o_a_la_vez_no_concede_de_mas", async () => {
    await inRollback(async (tx) => {
      const { fan, sfw } = await world(tx);
      await rewardsSummary(tx, fan.id, { now: T0 });
      await claimFreePack(tx, fan.id, { setId: sfw.set.id, now: h(1) });
      await expect(claimFreePack(tx, fan.id, { setId: sfw.set.id, now: h(2) })).rejects.toMatchObject({ code: "no_free_charges" });
      expect(await sealedOf(tx, fan.id, "free")).toHaveLength(1);
    });
  });

  it("test_s009_rf7_solo_colecciones_sfw_publicadas_y_si_no_hay_se_conservan_las_cargas", async () => {
    await inRollback(async (tx) => {
      const { admin, fan, sfw, adult } = await world(tx);
      await expect(claimFreePack(tx, fan.id, { setId: adult.set.id, now: h(1) })).rejects.toMatchObject({ code: "set_not_claimable" });
      expect((await claimableSets(tx)).map((s) => s.code)).toEqual(["FREE1"]);
      const [cur] = await tx.select().from(sets).where(eq(sets.id, sfw.set.id));
      await archiveSet(tx, admin.id, sfw.set.id, cur.version);
      expect(await claimableSets(tx)).toHaveLength(0);
      await expect(claimFreePack(tx, fan.id, { setId: sfw.set.id, now: h(1) })).rejects.toMatchObject({ code: "set_not_claimable" });
      expect((await rewardsSummary(tx, fan.id, { now: h(1) })).free.charges).toBe(1);
    });
  });

  it("test_s009_rf8_un_sobre_gratis_se_abre_con_las_probabilidades_y_la_proteccion_de_su_coleccion", async () => {
    await inRollback(async (tx) => {
      const { fan, sfw } = await world(tx);
      const { packId } = await claimFreePack(tx, fan.id, { setId: sfw.set.id, now: h(1) });
      const r = await openPack(tx, { userId: fan.id, packId });
      expect(r.cards.map((c) => c.rarity)).toEqual(["common", "rare"]);
      const [o] = await tx.select().from(packOpenings).where(eq(packOpenings.packId, packId));
      expect(o.dropTableId).toBeTruthy();
      const [pc] = await tx.select().from(pityCounters).where(and(eq(pityCounters.userId, fan.id), eq(pityCounters.setId, sfw.set.id)));
      expect(pc.packsSinceEpic).toBe(1);
    });
  });
});

describe("spec 009 — recompensa diaria y galletas", () => {
  it("test_s009_rf9_dias_1_a_6_suman_galletas_y_el_7_da_un_sobre_elegido", async () => {
    await inRollback(async (tx) => {
      const { fan, sfw } = await world(tx);
      const got: unknown[] = [];
      for (let d = 0; d < 6; d++) got.push((await claimDaily(tx, fan.id, { now: h(24 * d), timeZone: TZ })).reward);
      expect(got).toEqual([10, 10, 15, 15, 20, 20].map((amount) => ({ kind: "cookies", amount })));
      await expect(claimDaily(tx, fan.id, { now: h(24 * 6), timeZone: TZ })).rejects.toMatchObject({ code: "choose_set" });
      const r = await claimDaily(tx, fan.id, { now: h(24 * 6), timeZone: TZ, setId: sfw.set.id });
      expect(r).toMatchObject({ day: 7, reward: { kind: "pack" }, cookies: 90 });
      expect(await sealedOf(tx, fan.id, "daily")).toHaveLength(1);
    });
  });

  it("test_s009_rf10_una_sola_recompensa_por_dia_local", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      // 15:00 UTC = 09:00 en Ciudad de México; 05:00 UTC del día siguiente aún es el mismo día allí.
      await claimDaily(tx, fan.id, { now: T0, timeZone: TZ });
      await expect(claimDaily(tx, fan.id, { now: h(14), timeZone: TZ })).rejects.toMatchObject({ code: "already_claimed_today" });
      expect((await claimDaily(tx, fan.id, { now: h(16), timeZone: TZ })).day).toBe(2);
    });
  });

  it("test_s009_rf11_cambiar_de_zona_no_da_dos_premios_en_menos_de_20_horas", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      await claimDaily(tx, fan.id, { now: T0, timeZone: TZ });
      await expect(claimDaily(tx, fan.id, { now: h(10), timeZone: "Asia/Tokyo" })).rejects.toMatchObject({ code: "tz_change_too_soon" });
      expect((await claimDaily(tx, fan.id, { now: h(21), timeZone: "Asia/Tokyo" })).day).toBe(2);
    });
  });

  it("test_s009_rf12_con_un_dia_de_hueco_la_racha_sigue", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      await claimDaily(tx, fan.id, { now: T0, timeZone: TZ });
      expect((await claimDaily(tx, fan.id, { now: h(48), timeZone: TZ })).day).toBe(2);
    });
  });

  it("test_s009_rf13_dos_dias_sin_reclamar_reinician_y_se_conservan_las_galletas", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      await claimDaily(tx, fan.id, { now: T0, timeZone: TZ });
      await claimDaily(tx, fan.id, { now: h(24), timeZone: TZ });
      const r = await claimDaily(tx, fan.id, { now: h(24 * 4), timeZone: TZ });
      expect(r).toMatchObject({ day: 1, cookies: 30 });
    });
  });

  it("test_s009_rf14_tras_el_dia_7_vuelve_al_1", async () => {
    await inRollback(async (tx) => {
      const { fan, sfw } = await world(tx);
      for (let d = 0; d < 7; d++) await claimDaily(tx, fan.id, { now: h(24 * d), timeZone: TZ, setId: sfw.set.id });
      expect((await claimDaily(tx, fan.id, { now: h(24 * 7), timeZone: TZ })).day).toBe(1);
    });
  });

  it("test_s009_rf15_el_resumen_trae_la_racha_y_si_ya_se_reclamo_hoy", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      expect((await rewardsSummary(tx, fan.id, { now: T0, timeZone: TZ })).daily).toMatchObject({ claimedToday: false, day: 1 });
      await claimDaily(tx, fan.id, { now: T0, timeZone: TZ });
      const s = await rewardsSummary(tx, fan.id, { now: h(1), timeZone: TZ });
      expect(s.daily).toMatchObject({ claimedToday: true, day: 1 });
      expect(s.daily.schedule).toHaveLength(7);
    });
  });

  it("test_s009_rf16_saldo_e_historial_de_galletas", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      await claimDaily(tx, fan.id, { now: T0, timeZone: TZ });
      await claimDaily(tx, fan.id, { now: h(24), timeZone: TZ });
      expect((await rewardsSummary(tx, fan.id, { now: h(25) })).cookies).toBe(20);
      expect((await cookieHistory(tx, fan.id)).map((m) => [m.amount, m.reason])).toEqual([
        [10, "daily:2"],
        [10, "daily:1"],
      ]);
    });
  });

  it("test_s009_rf17_no_hay_forma_de_comprar_ni_transferir_galletas", async () => {
    const mod = await import("@/server/services/rewards");
    // Las únicas formas de cambiar el saldo son la recompensa diaria y el ajuste del administrador.
    expect(Object.keys(mod).filter((k) => /transfer|buy|purchase|sell|send/i.test(k))).toEqual([]);
  });

  it("test_s009_rf18_cada_movimiento_queda_registrado", async () => {
    await inRollback(async (tx) => {
      const { admin, fan } = await world(tx);
      await claimDaily(tx, fan.id, { now: T0, timeZone: TZ });
      await adjustCookies(tx, admin.id, { userId: fan.id, amount: 50, reason: "premio del concurso", now: h(1) });
      const rows = await tx.select().from(cookieLedger).where(eq(cookieLedger.userId, fan.id));
      expect(rows.map((r) => r.amount).sort()).toEqual([10, 50]);
      expect(rows.find((r) => r.amount === 50)).toMatchObject({ actorUserId: admin.id, reason: "admin: premio del concurso" });
    });
  });

  it("test_s009_rf19_el_saldo_nunca_baja_de_cero", async () => {
    await inRollback(async (tx) => {
      const { admin, fan } = await world(tx);
      await claimDaily(tx, fan.id, { now: T0, timeZone: TZ });
      await expect(adjustCookies(tx, admin.id, { userId: fan.id, amount: -11, reason: "corrección", now: h(1) })).rejects.toMatchObject({ code: "insufficient_cookies" });
      expect(await adjustCookies(tx, admin.id, { userId: fan.id, amount: -10, reason: "corrección", now: h(1) })).toBe(0);
    });
  });
});

describe("spec 009 — panel y ciclo de vida", () => {
  it("test_s009_rf20_el_panel_ve_cargas_racha_saldo_y_movimientos", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      await claimDaily(tx, fan.id, { now: T0, timeZone: TZ });
      const r = await rewardsForAdmin(tx, fan.id, h(1));
      expect(r).toMatchObject({ cookies: 10, free: { charges: 1 }, daily: { day: 1 } });
      expect(r.history).toHaveLength(1);
    });
  });

  it("test_s009_rf21_dar_o_quitar_galletas_exige_motivo", async () => {
    await inRollback(async (tx) => {
      const { admin, fan } = await world(tx);
      await expect(adjustCookies(tx, admin.id, { userId: fan.id, amount: 5, reason: " ", now: T0 })).rejects.toMatchObject({ code: "invalid_reason" });
      await expect(adjustCookies(tx, admin.id, { userId: fan.id, amount: 0, reason: "nada", now: T0 })).rejects.toMatchObject({ code: "invalid_cookie_amount" });
      expect(await adjustCookies(tx, admin.id, { userId: fan.id, amount: 25, reason: "bienvenida beta", now: T0 })).toBe(25);
    });
  });

  it("test_s009_borrar_la_cuenta_borra_cargas_racha_y_galletas", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      await claimDaily(tx, fan.id, { now: T0, timeZone: TZ });
      await deactivateAccount(tx, fan.id);
      await expect(claimDaily(tx, fan.id, { now: h(24), timeZone: TZ })).rejects.toMatchObject({ code: "not_found" });
      await purgeExpiredAccounts(tx, new Date(Date.now() + 31 * 86_400_000));
      expect(await tx.select().from(userRewards).where(eq(userRewards.userId, fan.id))).toHaveLength(0);
      expect(await tx.select().from(cookieLedger).where(eq(cookieLedger.userId, fan.id))).toHaveLength(0);
    });
  });
});
