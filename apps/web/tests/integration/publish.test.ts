import { describe, expect, it } from "vitest";
import { and, asc, eq } from "drizzle-orm";
import { cards, dropTables, packs, sets } from "@/db/schema";
import { createCharacter } from "@/server/services/characters";
import { archiveSet, createSet, publishSet, saveOdds } from "@/server/services/collections";
import { bulkUpdateCards, uploadCardImage } from "@/server/services/cards";
import { saveCardLayers } from "@/server/services/card-layers";
import { assembleSetCards } from "@/server/services/dev-seed";
import { inRollback } from "./db";
import { makeAdmin } from "./factories";
import { MIME, testImage } from "./images";
import { tempStore } from "./store";

type Tx = Parameters<Parameters<typeof inRollback>[0]>[0];
const W = (o: Partial<Record<string, number>>) => ({ common: 0, rare: 0, epic: 0, legendary: 0, ex: 0, ...o });
/** Spec 022: la tabla de un tipo de sobre de la colección. */
const table = async (tx: Tx, setId: string, kind: "silver" | "gold" = "silver") =>
  (await tx.select().from(dropTables).where(and(eq(dropTables.setId, setId), eq(dropTables.kind, kind))))[0];
const GOLD = { kind: "gold" as const, slots: [W({ rare: 100 }), W({ legendary: 100 })], holoChance: 0.2 };

/** Colección de 2 cartas por sobre con una común, una rara y una legendaria completas y sus tablas plata y gold. */
async function readySet(tx: Tx) {
  const admin = await makeAdmin(tx);
  const set = await createSet(tx, admin.id, { code: "WB01", name: "Base", isAdult: false, packSize: 2 });
  const store = tempStore();
  for (const hue of [10, 200, 300]) {
    await uploadCardImage(tx, store, admin.id, set.id, { body: await testImage({ hue }), mime: MIME.png, filename: `${hue}.png` });
  }
  const ch = await createCharacter(tx, admin.id, { name: "Aiko" });
  const [a, b, c3] = await tx.select().from(cards).where(eq(cards.setId, set.id)).orderBy(asc(cards.number));
  await bulkUpdateCards(tx, store, admin.id, set.id, { [a.id]: a.version }, { characterId: ch.id, rarity: "common" });
  await bulkUpdateCards(tx, store, admin.id, set.id, { [b.id]: b.version }, { characterId: ch.id, rarity: "rare" });
  await bulkUpdateCards(tx, store, admin.id, set.id, { [c3.id]: c3.version }, { characterId: ch.id, rarity: "legendary" });
  for (const c of [a, b, c3]) await tx.update(cards).set({ name: `Carta ${c.number}`, status: "ready" }).where(eq(cards.id, c.id));
  // Spec 017: las dos cartas armadas (la imagen como chica sobre un fondo de la biblioteca).
  await assembleSetCards(tx, store, admin.id, set.id);
  const fresh = async () => (await tx.select().from(sets).where(eq(sets.id, set.id)))[0];
  await saveOdds(tx, admin.id, set.id, (await fresh()).version, { slots: [W({ common: 100 }), W({ rare: 100 })], holoChance: 0.2 });
  await saveOdds(tx, admin.id, set.id, (await fresh()).version, GOLD);
  return { admin, set, store, fresh };
}

describe("RF-20 guardar probabilidades", () => {
  it("test_rf20_guarda pesos válidos y rechaza los que no suman 100", async () => {
    await inRollback(async (tx) => {
      const { admin, set, fresh } = await readySet(tx);
      await expect(
        saveOdds(tx, admin.id, set.id, (await fresh()).version, { slots: [W({ common: 90 }), W({ rare: 100 })], holoChance: 0.2 }),
      ).rejects.toMatchObject({ code: "invalid_odds" });
      const dt = await table(tx, set.id);
      expect(dt.slots[0].common).toBe(100);
    });
  });
});

describe("RF-6, RF-7 y RF-21 publicar", () => {
  it("test_rf21_publica, congela las probabilidades y las hace públicas", async () => {
    await inRollback(async (tx) => {
      const { admin, set, fresh } = await readySet(tx);
      const r = await publishSet(tx, admin.id, set.id, (await fresh()).version);
      expect(r.problems).toEqual([]);
      const s = await fresh();
      expect(s.status).toBe("published");
      expect(s.publishedAt).toBeInstanceOf(Date);
      // Spec 022: se publican las dos tablas.
      for (const dt of [await table(tx, set.id), await table(tx, set.id, "gold")]) {
        expect(dt.isPublic).toBe(true);
        expect(dt.publishedAt).toBeInstanceOf(Date);
      }
    });
  });

  it("test_rf7_si hay problemas no publica y los devuelve todos", async () => {
    await inRollback(async (tx) => {
      const { admin, set, fresh } = await readySet(tx);
      await tx.update(cards).set({ name: "" }).where(eq(cards.setId, set.id));
      const r = await publishSet(tx, admin.id, set.id, (await fresh()).version);
      expect(r.problems.map((p) => p.code)).toEqual(["card_incomplete", "card_incomplete", "card_incomplete"]);
      expect((await fresh()).status).toBe("draft");
    });
  });

  it("test_rf8_tras publicar no se pueden cambiar las probabilidades", async () => {
    await inRollback(async (tx) => {
      const { admin, set, fresh } = await readySet(tx);
      await publishSet(tx, admin.id, set.id, (await fresh()).version);
      await expect(
        saveOdds(tx, admin.id, set.id, (await fresh()).version, { slots: [W({ common: 100 }), W({ rare: 100 })], holoChance: 0.5 }),
      ).rejects.toMatchObject({ code: "locked" });
    });
  });
});

describe("spec 017 — publicar solo con cartas armadas", () => {
  it("test_s017_rf15_una_carta_sin_fondo_impide_publicar_y_dice_cual", async () => {
    await inRollback(async (tx) => {
      const { admin, set, store, fresh } = await readySet(tx);
      const [first] = await tx.select().from(cards).where(eq(cards.setId, set.id)).orderBy(asc(cards.number));
      const sinFondo = { ...first.layers!, capas: first.layers!.capas.filter((l) => !("rol" in l && l.rol === "fondo")) };
      await saveCardLayers(tx, store, admin.id, first.id, { config: sinFondo, expectedVersion: first.version });
      const r = await publishSet(tx, admin.id, set.id, (await fresh()).version);
      expect(r.problems).toEqual([expect.objectContaining({ code: "card_not_assembled", target: { kind: "card", id: first.id, number: 1 }, params: { number: 1, missing: "fondo" } })]);
      expect((await fresh()).status).toBe("draft");
    });
  });

  it("test_s017_rf16_con_las_cartas_armadas_siguen_las_demas_comprobaciones", async () => {
    await inRollback(async (tx) => {
      const { admin, set, fresh } = await readySet(tx);
      await tx.update(cards).set({ characterId: null }).where(eq(cards.setId, set.id));
      const r = await publishSet(tx, admin.id, set.id, (await fresh()).version);
      expect(r.problems.map((p) => p.code)).toEqual(["card_incomplete", "card_incomplete", "card_incomplete"]);
    });
  });
});

describe("RF-9 archivar", () => {
  it("test_rf9_archiva una publicada y conserva los sobres sin abrir", async () => {
    await inRollback(async (tx) => {
      const { admin, set, fresh } = await readySet(tx);
      await publishSet(tx, admin.id, set.id, (await fresh()).version);
      await tx.insert(packs).values({ userId: admin.id, setId: set.id, source: "manual", grantKey: "k1" });
      await archiveSet(tx, admin.id, set.id, (await fresh()).version);
      expect((await fresh()).status).toBe("archived");
      const [p] = await tx.select().from(packs).where(eq(packs.grantKey, "k1"));
      expect(p.status).toBe("sealed");
    });
  });

  it("test_rf9_no se archiva un borrador", async () => {
    await inRollback(async (tx) => {
      const { admin, set, fresh } = await readySet(tx);
      await expect(archiveSet(tx, admin.id, set.id, (await fresh()).version)).rejects.toMatchObject({ code: "invalid_transition" });
    });
  });
});

describe("RF-12 y RF-15 (spec 004) protección de mala suerte en el panel", () => {
  it("test_s004_rf12_se guarda en borrador, se valida 0–100 y se congela al publicar", async () => {
    await inRollback(async (tx) => {
      const { admin, set, fresh } = await readySet(tx);
      const odds = { slots: [W({ common: 100 }), W({ rare: 100 })], holoChance: 0.2 };
      await saveOdds(tx, admin.id, set.id, (await fresh()).version, { ...odds, pityThreshold: 15 });
      expect((await table(tx, set.id)).pityThreshold).toBe(15);
      await expect(saveOdds(tx, admin.id, set.id, (await fresh()).version, { ...odds, pityThreshold: 101 })).rejects.toMatchObject({ code: "invalid_odds" });
      await expect(saveOdds(tx, admin.id, set.id, (await fresh()).version, { ...odds, pityThreshold: 2.5 })).rejects.toMatchObject({ code: "invalid_odds" });
      await publishSet(tx, admin.id, set.id, (await fresh()).version);
      await expect(saveOdds(tx, admin.id, set.id, (await fresh()).version, { ...odds, pityThreshold: 5 })).rejects.toMatchObject({ code: "locked" });
    });
  });

  it("test_s004_rf15_la página pública recibe la protección de cada colección", async () => {
    await inRollback(async (tx) => {
      const { admin, set, fresh } = await readySet(tx);
      await saveOdds(tx, admin.id, set.id, (await fresh()).version, { slots: [W({ common: 100 }), W({ rare: 100 })], holoChance: 0.2, pityThreshold: 12 });
      await publishSet(tx, admin.id, set.id, (await fresh()).version);
      const { listPublicOdds } = await import("@/server/services/collections");
      const rows = await listPublicOdds(tx);
      expect(rows.find((r) => r.set.id === set.id)?.odds.pityThreshold).toBe(12);
    });
  });
});

describe("spec 022 — dos tablas por colección", () => {
  it("test_s022_rf12_al_crear_la_coleccion_tiene_tabla_plata_y_tabla_gold", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const set = await createSet(tx, admin.id, { code: "TWO", name: "Dos", isAdult: false, packSize: 5 });
      const silver = await table(tx, set.id);
      const gold = await table(tx, set.id, "gold");
      expect([silver.slots.length, gold.slots.length]).toEqual([5, 5]);
      expect(gold.slots[4]).toMatchObject({ common: 0, rare: 0 });
      expect(gold.pityThreshold).toBe(0);
    });
  });

  it("test_s022_rf21_el_administrador_guarda_la_tabla_gold_sin_proteccion_y_queda_en_el_historial", async () => {
    await inRollback(async (tx) => {
      const { admin, set, fresh } = await readySet(tx);
      await saveOdds(tx, admin.id, set.id, (await fresh()).version, { ...GOLD, holoChance: 0.4, pityThreshold: 9 });
      const gold = await table(tx, set.id, "gold");
      expect([gold.holoChance, gold.pityThreshold]).toEqual([0.4, 0]);
      // La plata no cambia.
      expect((await table(tx, set.id)).holoChance).toBe(0.2);
      // RF-15: la gold no admite una última ranura por debajo de épica.
      await expect(saveOdds(tx, admin.id, set.id, (await fresh()).version, { ...GOLD, slots: [W({ rare: 100 }), W({ rare: 100 })] })).rejects.toMatchObject({ code: "invalid_odds" });
    });
  });

  it("test_s022_rf13_sin_una_de_las_dos_tablas_no_se_publica_e_indica_cual_falta", async () => {
    await inRollback(async (tx) => {
      const { admin, set, fresh } = await readySet(tx);
      await tx.delete(dropTables).where(and(eq(dropTables.setId, set.id), eq(dropTables.kind, "gold")));
      const r = await publishSet(tx, admin.id, set.id, (await fresh()).version);
      expect(r.problems.map((p) => [p.code, p.params])).toEqual([["missing_table", { kind: "gold" }]]);
      expect((await fresh()).status).toBe("draft");
    });
  });

  it("test_s022_rf16_si_la_gold_no_mejora_a_la_plata_no_se_publica", async () => {
    await inRollback(async (tx) => {
      const { admin, set, fresh } = await readySet(tx);
      await saveOdds(tx, admin.id, set.id, (await fresh()).version, { slots: [W({ common: 100 }), W({ legendary: 100 })], holoChance: 0.2 });
      const r = await publishSet(tx, admin.id, set.id, (await fresh()).version);
      expect(r.problems.map((p) => p.code)).toEqual(["gold_not_better"]);
      expect((await table(tx, set.id)).publishedAt).toBeNull();
      expect((await table(tx, set.id, "gold")).publishedAt).toBeNull();
    });
  });

  it("test_s022_rf20_la_pagina_publica_recibe_las_dos_tablas", async () => {
    await inRollback(async (tx) => {
      const { admin, set, fresh } = await readySet(tx);
      await publishSet(tx, admin.id, set.id, (await fresh()).version);
      const { listPublicOdds } = await import("@/server/services/collections");
      const row = (await listPublicOdds(tx)).find((r) => r.set.id === set.id)!;
      expect(row.odds.kind).toBe("silver");
      expect(row.gold?.kind).toBe("gold");
      expect(row.gold?.slots[1]).toMatchObject({ legendary: 100 });
    });
  });
});
