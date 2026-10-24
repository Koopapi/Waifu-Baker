import { describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
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
const W = (o: Partial<Record<string, number>>) => ({ common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0, secret: 0, ...o });

/** Colección de 2 cartas por sobre con una común y una rara completas. */
async function readySet(tx: Tx) {
  const admin = await makeAdmin(tx);
  const set = await createSet(tx, admin.id, { code: "WB01", name: "Base", isAdult: false, packSize: 2 });
  const store = tempStore();
  for (const hue of [10, 200]) {
    await uploadCardImage(tx, store, admin.id, set.id, { body: await testImage({ hue }), mime: MIME.png, filename: `${hue}.png` });
  }
  const ch = await createCharacter(tx, admin.id, { name: "Aiko" });
  const [a, b] = await tx.select().from(cards).where(eq(cards.setId, set.id)).orderBy(asc(cards.number));
  await bulkUpdateCards(tx, store, admin.id, set.id, { [a.id]: a.version }, { characterId: ch.id, rarity: "common" });
  await bulkUpdateCards(tx, store, admin.id, set.id, { [b.id]: b.version }, { characterId: ch.id, rarity: "rare" });
  for (const c of [a, b]) await tx.update(cards).set({ name: `Carta ${c.number}`, status: "ready" }).where(eq(cards.id, c.id));
  // Spec 017: las dos cartas armadas (la imagen como chica sobre un fondo de la biblioteca).
  await assembleSetCards(tx, store, admin.id, set.id);
  const fresh = async () => (await tx.select().from(sets).where(eq(sets.id, set.id)))[0];
  await saveOdds(tx, admin.id, set.id, (await fresh()).version, { slots: [W({ common: 100 }), W({ rare: 100 })], holoChance: 0.2 });
  return { admin, set, store, fresh };
}

describe("RF-20 guardar probabilidades", () => {
  it("test_rf20_guarda pesos válidos y rechaza los que no suman 100", async () => {
    await inRollback(async (tx) => {
      const { admin, set, fresh } = await readySet(tx);
      await expect(
        saveOdds(tx, admin.id, set.id, (await fresh()).version, { slots: [W({ common: 90 }), W({ rare: 100 })], holoChance: 0.2 }),
      ).rejects.toMatchObject({ code: "invalid_odds" });
      const [dt] = await tx.select().from(dropTables).where(eq(dropTables.setId, set.id));
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
      const [dt] = await tx.select().from(dropTables).where(eq(dropTables.setId, set.id));
      expect(dt.isPublic).toBe(true);
      expect(dt.publishedAt).toBeInstanceOf(Date);
    });
  });

  it("test_rf7_si hay problemas no publica y los devuelve todos", async () => {
    await inRollback(async (tx) => {
      const { admin, set, fresh } = await readySet(tx);
      await tx.update(cards).set({ name: "" }).where(eq(cards.setId, set.id));
      const r = await publishSet(tx, admin.id, set.id, (await fresh()).version);
      expect(r.problems.map((p) => p.code)).toEqual(["card_incomplete", "card_incomplete"]);
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
      expect(r.problems.map((p) => p.code)).toEqual(["card_incomplete", "card_incomplete"]);
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
      expect((await tx.select().from(dropTables).where(eq(dropTables.setId, set.id)))[0].pityThreshold).toBe(15);
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
