// Spec 028, RF-6, RF-15 a RF-17, RF-19 y RF-20 a RF-23: ajustes del panel (valores de cartas nuevas, probabilidades,
// garantías y cartas de portada) con su auditoría, y el relleno del borde de la migración 0021.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { auditLog, cardVersions, cards, sets } from "@/db/schema";
import { FACTORY_CARD_DEFAULTS } from "@/domain/cards/card-defaults";
import { FACTORY_ODDS_TABLES, FACTORY_PITY } from "@/domain/catalog/default-odds";
import {
  coverCardImageKey,
  getCardDefaults,
  getCoverCards,
  getOddsDefaults,
  getPityDefaults,
  listCoverCandidates,
  publicCoverCards,
  setCardDefaults,
  setCoverCards,
  setOddsDefaults,
  setPityDefaults,
} from "@/server/services/settings";
import { archiveSet } from "@/server/services/collections";
import { inRollback } from "./db";
import { createPublishedSet, makeAdmin } from "./factories";

type Tx = Parameters<Parameters<typeof inRollback>[0]>[0];
const audits = (tx: Tx, action: string) => tx.select().from(auditLog).where(eq(auditLog.action, action));

describe("spec 028 — ajustes de valores por defecto", () => {
  it("test_s028_rf15_rf19_el_sello_y_el_borde_por_defecto_se_cambian_con_registro", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      expect(await getCardDefaults(tx)).toEqual(FACTORY_CARD_DEFAULTS);
      await setCardDefaults(tx, admin.id, { sealSize: 18, border: 2.4 });
      expect(await getCardDefaults(tx)).toEqual({ sealSize: 18, border: 2.4 });
      await expect(setCardDefaults(tx, admin.id, { sealSize: 41, border: 3 })).rejects.toMatchObject({ code: "invalid_card_defaults" });
      await expect(setCardDefaults(tx, admin.id, { sealSize: 15, border: 8.1 })).rejects.toMatchObject({ code: "invalid_card_defaults" });
      const log = await audits(tx, "settings.card_defaults");
      expect(log).toHaveLength(1);
      expect(log[0]).toMatchObject({ actorUserId: admin.id, before: FACTORY_CARD_DEFAULTS, after: { sealSize: 18, border: 2.4 } });
    });
  });

  it("test_s028_rf16_rf19_las_probabilidades_iniciales_se_cambian_y_si_una_ranura_no_suma_100_no_se_guardan", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      expect(await getOddsDefaults(tx)).toEqual(FACTORY_ODDS_TABLES);
      const next = structuredClone(FACTORY_ODDS_TABLES);
      next.silver.base = { common: 70, rare: 24, epic: 5, legendary: 1, ex: 0 };
      await setOddsDefaults(tx, admin.id, next);
      expect(await getOddsDefaults(tx)).toEqual(next);
      const bad = structuredClone(next);
      bad.gold.guaranteed.epic = 50;
      await expect(setOddsDefaults(tx, admin.id, bad)).rejects.toMatchObject({ code: "invalid_odds_defaults", params: { reason: "slot_sum", kind: "gold", row: "guaranteed", sum: 78 } });
      // No se guardó nada.
      expect(await getOddsDefaults(tx)).toEqual(next);
      const log = await audits(tx, "settings.odds_defaults");
      expect(log).toHaveLength(1);
      expect(log[0]).toMatchObject({ before: FACTORY_ODDS_TABLES, after: next });
    });
  });

  it("test_s028_rf17_rf19_las_garantias_de_epica_y_ex_se_cambian_con_registro", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      expect(await getPityDefaults(tx)).toEqual(FACTORY_PITY);
      await setPityDefaults(tx, admin.id, { epic: 12, ex: 25 });
      expect(await getPityDefaults(tx)).toEqual({ epic: 12, ex: 25 });
      await expect(setPityDefaults(tx, admin.id, { epic: -1, ex: 25 })).rejects.toMatchObject({ code: "invalid_pity_defaults" });
      await expect(setPityDefaults(tx, admin.id, { epic: 10, ex: 2.5 })).rejects.toMatchObject({ code: "invalid_pity_defaults" });
      const log = await audits(tx, "settings.pity_defaults");
      expect(log).toHaveLength(1);
      expect(log[0]).toMatchObject({ before: FACTORY_PITY, after: { epic: 12, ex: 25 } });
    });
  });
});

describe("spec 028 — cartas de portada", () => {
  async function setup(tx: Tx) {
    const admin = await makeAdmin(tx);
    const sfw = await createPublishedSet(tx, admin.id, { code: "POR1", rarities: ["common", "rare", "epic", "legendary"], slots: [{ common: 100 }, { rare: 100 }] });
    const adult = await createPublishedSet(tx, admin.id, { code: "POR2", rarities: ["common", "rare"], slots: [{ common: 100 }, { rare: 100 }], isAdult: true });
    return { admin, sfw, adult, ids: sfw.cards.map((c) => c.id) };
  }

  it("test_s028_rf20_rf19_se_eligen_de_3_a_5_cartas_publicadas_no_18_en_orden", async () => {
    await inRollback(async (tx) => {
      const { admin, adult, ids } = await setup(tx);
      const candidates = await listCoverCandidates(tx);
      expect(candidates.map((c) => c.setCode)).not.toContain("POR2");
      expect(candidates.filter((c) => c.setCode === "POR1").map((c) => c.id)).toEqual(expect.arrayContaining(ids));
      await expect(setCoverCards(tx, admin.id, ids.slice(0, 2))).rejects.toMatchObject({ code: "invalid_cover_cards", params: { reason: "count" } });
      await expect(setCoverCards(tx, admin.id, [ids[0], ids[0], ids[1]])).rejects.toMatchObject({ params: { reason: "duplicate" } });
      await expect(setCoverCards(tx, admin.id, [ids[0], ids[1], adult.cards[0].id])).rejects.toMatchObject({ params: { reason: "invalid" } });
      const order = [ids[2], ids[0], ids[1]];
      await setCoverCards(tx, admin.id, order);
      expect(await getCoverCards(tx)).toEqual(order);
      expect((await publicCoverCards(tx)).map((c) => c.id)).toEqual(order);
      const log = await audits(tx, "settings.cover_cards");
      expect(log).toHaveLength(1);
      expect(log[0]).toMatchObject({ before: [], after: order });
    });
  });

  it("test_s028_rf21_la_portada_solo_ve_id_nombre_y_la_imagen_publica_con_marca_de_agua", async () => {
    await inRollback(async (tx) => {
      const { admin, ids, adult } = await setup(tx);
      await setCoverCards(tx, admin.id, ids.slice(0, 3));
      const shown = await publicCoverCards(tx);
      for (const c of shown) expect(Object.keys(c).sort()).toEqual(["id", "name"]);
      const [card] = await tx.select().from(cards).where(eq(cards.id, ids[0]));
      expect(await coverCardImageKey(tx, ids[0])).toBe(card.keyPublic);
      expect(card.keyPublic).toMatch(/public/);
      // Una carta que no está en la portada no se sirve, aunque sea pública.
      expect(await coverCardImageKey(tx, ids[3])).toBeNull();
      expect(await coverCardImageKey(tx, adult.cards[0].id)).toBeNull();
    });
  });

  it("test_s028_rf22_una_carta_que_deja_de_valer_desaparece_sin_romper_la_portada", async () => {
    await inRollback(async (tx) => {
      const { admin, sfw, ids } = await setup(tx);
      await setCoverCards(tx, admin.id, ids.slice(0, 4));
      // La carta se borra (aquí, sin pasar por el servicio, que no deja borrar en una publicada).
      await tx.delete(cards).where(eq(cards.id, ids[1]));
      expect((await publicCoverCards(tx)).map((c) => c.id)).toEqual([ids[0], ids[2], ids[3]]);
      // La colección pasa a 18+.
      await tx.update(sets).set({ isAdult: true }).where(eq(sets.id, sfw.set.id));
      expect(await publicCoverCards(tx)).toEqual([]);
      expect(await coverCardImageKey(tx, ids[0])).toBeNull();
      await tx.update(sets).set({ isAdult: false }).where(eq(sets.id, sfw.set.id));
      // La colección se archiva.
      const [s] = await tx.select().from(sets).where(eq(sets.id, sfw.set.id));
      await archiveSet(tx, admin.id, s.id, s.version);
      expect(await publicCoverCards(tx)).toEqual([]);
    });
  });

  it("test_s028_rf23_sin_cartas_de_portada_no_hay_abanico", async () => {
    await inRollback(async (tx) => {
      const { admin, ids } = await setup(tx);
      expect(await publicCoverCards(tx)).toEqual([]);
      await setCoverCards(tx, admin.id, ids.slice(0, 3));
      await setCoverCards(tx, admin.id, []);
      expect(await publicCoverCards(tx)).toEqual([]);
    });
  });
});

describe("spec 028 — cartas ya guardadas", () => {
  it("test_s028_rf6_la_migracion_da_a_las_cartas_sin_borde_el_grosor_con_el_que_se_veian", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const { cards: list } = await createPublishedSet(tx, admin.id, { code: "MIG1", rarities: ["common", "rare", "epic"], slots: [{ common: 100 }, { rare: 100 }] });
      const strip = (l: Record<string, unknown>, marco: string) => {
        const rest: Record<string, unknown> = { ...l, marco };
        delete rest.borde;
        return rest;
      };
      const frames = ["ssr", "personalizado", "ninguno"];
      for (const [i, c] of list.entries()) {
        await tx.update(cards).set({ layers: strip(c.layers as Record<string, unknown>, frames[i]) as never }).where(eq(cards.id, c.id));
      }
      // Una con borde guardado no cambia.
      await tx.update(cards).set({ layers: { ...(list[0].layers as object), marco: "r", borde: 1.1 } as never, layersPending: strip(list[0].layers as Record<string, unknown>, "ur") as never }).where(eq(cards.id, list[0].id));
      await tx.update(cardVersions).set({ layers: strip(list[1].layers as Record<string, unknown>, "sr") as never }).where(eq(cardVersions.cardId, list[1].id));
      const migration = readFileSync(path.resolve(__dirname, "../../drizzle/0021_valores_por_defecto.sql"), "utf8");
      const updates = migration.split("--> statement-breakpoint").filter((s) => s.includes("UPDATE"));
      expect(updates).toHaveLength(3);
      // Dos veces: es idempotente.
      for (let i = 0; i < 2; i++) for (const u of updates) await tx.execute(sql.raw(u));
      const rows = new Map((await tx.select().from(cards).where(eq(cards.setId, list[0].setId))).map((r) => [r.id, r]));
      expect(rows.get(list[0].id)!.layers).toMatchObject({ marco: "r", borde: 1.1 });
      expect(rows.get(list[0].id)!.layersPending).toMatchObject({ marco: "ur", borde: 4.8 });
      expect(rows.get(list[1].id)!.layers).toMatchObject({ marco: "personalizado", borde: 2.2 });
      expect(rows.get(list[2].id)!.layers!.borde).toBeUndefined();
      const [v] = await tx.select().from(cardVersions).where(and(eq(cardVersions.cardId, list[1].id), eq(cardVersions.number, 1)));
      expect(v.layers).toMatchObject({ marco: "sr", borde: 3.3 });
    });
  });
});
