// Spec 028, RF-1 a RF-3, RF-8 a RF-10 y RF-12 a RF-18: los valores por defecto en los servicios (crear y re-estilar
// cartas, colecciones nuevas, garantía de EX al abrir sobres gold).
import { describe, expect, it } from "vitest";
import { and, asc, eq } from "drizzle-orm";
import { cards, dropTables, packs, pityCounters, sets } from "@/db/schema";
import type { TextSeal } from "@/domain/cards/layers";
import { FACTORY_ODDS_TABLES, defaultSlots } from "@/domain/catalog/default-odds";
import { createSet, updateSet } from "@/server/services/collections";
import { updateCard, uploadCardImage } from "@/server/services/cards";
import { openPack } from "@/server/services/packs";
import { setCardDefaults, setOddsDefaults, setPityDefaults } from "@/server/services/settings";
import { upsertUserFromLogin } from "@/server/services/users";
import { giftPacks } from "@/server/services/users-admin";
import { inRollback } from "./db";
import { createPublishedSet, makeAdmin } from "./factories";
import { MIME, testImage } from "./images";
import { tempStore } from "./store";

type Tx = Parameters<Parameters<typeof inRollback>[0]>[0];

async function cardWorld(tx: Tx) {
  const admin = await makeAdmin(tx);
  const set = await createSet(tx, admin.id, { code: "DEF1", name: "Defectos", isAdult: false });
  const store = tempStore();
  const up = async (hue: number) => uploadCardImage(tx, store, admin.id, set.id, { body: await testImage({ hue, cutout: true }), mime: MIME.png, filename: `c-${hue}.png` });
  const load = async (id: string) => (await tx.select().from(cards).where(eq(cards.id, id)))[0];
  return { admin, set, store, up, load };
}

describe("spec 028 — cartas nuevas y re-estiladas", () => {
  it("test_s028_rf1_la_carta_creada_al_subir_la_chica_sale_con_sello_15_y_borde_3", async () => {
    await inRollback(async (tx) => {
      const { up, load } = await cardWorld(tx);
      const c = await load((await up(10)).id);
      expect(c.layers).toMatchObject({ borde: 3, sello: { texto: "C", tamano: 15 }, estiloAuto: true });
    });
  });

  it("test_s028_rf3_al_cambiar_la_rareza_con_estilo_automatico_se_conservan_15_y_3", async () => {
    await inRollback(async (tx) => {
      const { admin, store, up, load } = await cardWorld(tx);
      let c = await load((await up(20)).id);
      for (const rarity of ["legendary", "ex", "rare"] as const) {
        await updateCard(tx, store, admin.id, c.id, c.version, { rarity });
        c = await load(c.id);
        expect(c.layers, rarity).toMatchObject({ borde: 3, estiloAuto: true });
        expect((c.layers!.sello as TextSeal).tamano, rarity).toBe(15);
      }
    });
  });

  it("test_s028_rf18_los_ajustes_valen_para_lo_que_se_crea_o_re_estila_despues_y_no_cambian_lo_guardado", async () => {
    await inRollback(async (tx) => {
      const { admin, store, up, load } = await cardWorld(tx);
      const before = await load((await up(30)).id);
      await setCardDefaults(tx, admin.id, { sealSize: 20, border: 4.5 });
      // RF-6: la carta guardada no cambia.
      expect((await load(before.id)).layers).toEqual(before.layers);
      // RF-15: la nueva sale con los valores del panel.
      const after = await load((await up(40)).id);
      expect(after.layers).toMatchObject({ borde: 4.5, sello: { tamano: 20 } });
      // Al re-estilarse (cambio de rareza con estilo automático), la antigua toma los vigentes.
      await updateCard(tx, store, admin.id, before.id, before.version, { rarity: "epic" });
      expect((await load(before.id)).layers).toMatchObject({ borde: 4.5, sello: { texto: "E", tamano: 20 } });
    });
  });
});

describe("spec 028 — colecciones nuevas", () => {
  const tables = (tx: Tx, setId: string) => tx.select().from(dropTables).where(eq(dropTables.setId, setId)).orderBy(asc(dropTables.kind));

  it("test_s028_rf8_rf9_rf17_la_coleccion_nueva_propone_las_tablas_y_garantias_de_fabrica", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const set = await createSet(tx, admin.id, { code: "NEW1", name: "Nueva", isAdult: false });
      const [silver, gold] = await tables(tx, set.id);
      expect([silver.kind, gold.kind]).toEqual(["silver", "gold"]);
      expect(silver.slots).toEqual(defaultSlots(5, "silver"));
      expect(gold.slots).toEqual(defaultSlots(5, "gold"));
      expect([silver.pityThreshold, silver.exPityThreshold]).toEqual([10, 0]);
      expect([gold.pityThreshold, gold.exPityThreshold]).toEqual([0, 20]);
    });
  });

  it("test_s028_rf16_rf17_rf18_la_coleccion_nueva_usa_los_ajustes_y_la_ya_creada_no_cambia", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const old = await createSet(tx, admin.id, { code: "OLD1", name: "Vieja", isAdult: false });
      const oldTables = await tables(tx, old.id);
      const next = structuredClone(FACTORY_ODDS_TABLES);
      next.gold.base = { common: 30, rare: 40, epic: 22, legendary: 7, ex: 1 };
      await setOddsDefaults(tx, admin.id, next);
      await setPityDefaults(tx, admin.id, { epic: 7, ex: 15 });
      const set = await createSet(tx, admin.id, { code: "NEW2", name: "Nueva", isAdult: false, packSize: 3 });
      const [silver, gold] = await tables(tx, set.id);
      expect(gold.slots).toEqual(defaultSlots(3, "gold", next));
      expect(gold.slots[0]).toEqual({ common: 30, rare: 40, epic: 22, legendary: 7, ex: 1 });
      expect([silver.pityThreshold, gold.exPityThreshold]).toEqual([7, 15]);
      expect(await tables(tx, old.id)).toEqual(oldTables);
      // Cambiar las cartas por sobre de una colección en borrador también propone las tablas vigentes.
      const [s] = await tx.select().from(sets).where(eq(sets.id, old.id));
      await updateSet(tx, admin.id, old.id, s.version, { packSize: 4 });
      const [, oldGold] = await tables(tx, old.id);
      expect(oldGold.slots).toEqual(defaultSlots(4, "gold", next));
    });
  });

  it("test_s028_rf10_las_probabilidades_de_las_colecciones_publicadas_no_cambian", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const { set } = await createPublishedSet(tx, admin.id, { code: "PUB1", rarities: ["common", "rare"], slots: [{ common: 100 }, { rare: 100 }] });
      const published = await tables(tx, set.id);
      const next = structuredClone(FACTORY_ODDS_TABLES);
      next.silver.base = { common: 50, rare: 40, epic: 8, legendary: 2, ex: 0 };
      await setOddsDefaults(tx, admin.id, next);
      await setPityDefaults(tx, admin.id, { epic: 3, ex: 4 });
      expect(await tables(tx, set.id)).toEqual(published);
    });
  });
});

describe("spec 028 — garantía de EX en los sobres gold", () => {
  async function goldWorld(tx: Tx, exPity = 20) {
    const admin = await makeAdmin(tx);
    await setPityDefaults(tx, admin.id, { epic: 10, ex: exPity });
    const fan = await upsertUserFromLogin(tx, { patreonUserId: "fan-ex", displayName: "Fan EX", role: "user" });
    // La EX casi nunca sale sola en el gold (0,01 % en la última ranura): solo la garantía la trae.
    const pub = await createPublishedSet(tx, admin.id, {
      code: "EXG1",
      rarities: ["common", "rare", "epic", "legendary", "ex"],
      slots: [{ common: 100 }, { rare: 100 }],
      gold: [{ common: 100 }, { epic: 99.99, ex: 0.01 }],
    });
    const counter = async () => (await tx.select().from(pityCounters).where(and(eq(pityCounters.userId, fan.id), eq(pityCounters.setId, pub.set.id))))[0];
    const openGold = async (i: number) => {
      await giftPacks(tx, admin.id, { userId: fan.id, setId: pub.set.id, count: 1, reason: "Gold EX", kind: "gold" });
      const [p] = await tx.select().from(packs).where(and(eq(packs.userId, fan.id), eq(packs.status, "sealed"), eq(packs.kind, "gold")));
      return openPack(tx, { userId: fan.id, packId: p.id, seed: Buffer.alloc(32, i + 1) });
    };
    const openSilver = async (i: number) => {
      await giftPacks(tx, admin.id, { userId: fan.id, setId: pub.set.id, count: 1, reason: "Plata", kind: "silver" });
      const [p] = await tx.select().from(packs).where(and(eq(packs.userId, fan.id), eq(packs.status, "sealed"), eq(packs.kind, "silver")));
      return openPack(tx, { userId: fan.id, packId: p.id, seed: Buffer.alloc(32, 100 + i) });
    };
    return { counter, openGold, openSilver };
  }

  it("test_s028_rf12_tras_19_gold_sin_ex_el_20_trae_una_ex", async () => {
    await inRollback(async (tx) => {
      const { counter, openGold } = await goldWorld(tx);
      for (let i = 0; i < 19; i++) {
        const r = await openGold(i);
        expect(r.cards.some((c) => c.rarity === "ex"), `sobre ${i + 1}`).toBe(false);
        expect(r.pityApplied).toBe(false);
      }
      expect((await counter()).packsSinceEx).toBe(19);
      const twentieth = await openGold(19);
      expect(twentieth.pityApplied).toBe(true);
      expect(twentieth.cards.at(-1)).toMatchObject({ rarity: "ex", pity: true });
    });
  });

  it("test_s028_rf13_una_ex_pone_el_contador_a_cero_y_cada_tipo_cuenta_solo_lo_suyo", async () => {
    await inRollback(async (tx) => {
      const { counter, openGold, openSilver } = await goldWorld(tx, 3);
      await openGold(0);
      await openGold(1);
      expect((await counter()).packsSinceEx).toBe(2);
      // Los plata no tocan el contador de EX; los gold no tocan el de épica.
      await openSilver(0);
      expect(await counter()).toMatchObject({ packsSinceEx: 2, packsSinceEpic: 1 });
      const third = await openGold(2);
      expect(third.cards.some((c) => c.rarity === "ex")).toBe(true);
      expect(await counter()).toMatchObject({ packsSinceEx: 0, packsSinceEpic: 1 });
    });
  });
});
