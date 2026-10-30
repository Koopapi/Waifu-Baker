import { describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
import { cards } from "@/db/schema";
import { createCharacter } from "@/server/services/characters";
import { createSet } from "@/server/services/collections";
import { bulkUpdateCards, deleteCard, getSetOverview, reorderCards, updateCard, uploadCardImage } from "@/server/services/cards";
import { inRollback } from "./db";
import { makeAdmin } from "./factories";
import { MIME, testImage } from "./images";
import { tempStore } from "./store";

type Tx = Parameters<Parameters<typeof inRollback>[0]>[0];

async function setupWithCards(tx: Tx, n = 3) {
  const admin = await makeAdmin(tx);
  const set = await createSet(tx, admin.id, { code: "WB01", name: "Base", isAdult: false });
  const store = tempStore();
  for (let i = 0; i < n; i++) {
    await uploadCardImage(tx, store, admin.id, set.id, { body: await testImage({ hue: i * 40 }), mime: MIME.png, filename: `${i}.png` });
  }
  const list = () => tx.select().from(cards).where(eq(cards.setId, set.id)).orderBy(asc(cards.number));
  return { admin, set, store, list };
}

describe("RF-14 edición en lote", () => {
  it("test_rf14_asigna personaje y rareza a varias cartas a la vez", async () => {
    await inRollback(async (tx) => {
      const { admin, set, store, list } = await setupWithCards(tx);
      const aiko = await createCharacter(tx, admin.id, { name: "Aiko" });
      const [a, b, c] = await list();
      await bulkUpdateCards(tx, store, admin.id, set.id, { [a.id]: a.version, [b.id]: b.version }, { characterId: aiko.id, rarity: "rare" });
      const [a2, b2, c2] = await list();
      expect([a2.characterId, a2.rarity, b2.characterId, b2.rarity]).toEqual([aiko.id, "rare", aiko.id, "rare"]);
      expect([c2.characterId, c2.rarity]).toEqual([c.characterId, c.rarity]);
    });
  });

  it("test_rf14_si alguna carta cambió entre tanto, no aplica nada", async () => {
    await inRollback(async (tx) => {
      const { admin, set, store, list } = await setupWithCards(tx);
      const [a, b] = await list();
      await updateCard(tx, store, admin.id, a.id, a.version, { name: "Cambiada" });
      await expect(
        bulkUpdateCards(tx, store, admin.id, set.id, { [a.id]: a.version, [b.id]: b.version }, { rarity: "epic" }),
      ).rejects.toMatchObject({ code: "stale_version" });
      const [, b2] = await list();
      expect(b2.rarity).toBeNull();
    });
  });

  it("una carta queda lista al tener personaje, nombre, rareza e imagen", async () => {
    await inRollback(async (tx) => {
      const { admin, store, list } = await setupWithCards(tx, 1);
      const aiko = await createCharacter(tx, admin.id, { name: "Aiko" });
      const [a] = await list();
      const u = await updateCard(tx, store, admin.id, a.id, a.version, { name: "Aiko saluda", characterId: aiko.id, rarity: "common" });
      expect(u.status).toBe("ready");
    });
  });
});

describe("RF-15 reordenación", () => {
  it("test_rf15_reordena y mantiene la numeración consecutiva", async () => {
    await inRollback(async (tx) => {
      const { admin, set, store, list } = await setupWithCards(tx);
      const [a, b, c] = await list();
      await reorderCards(tx, store, admin.id, set.id, [c.id, a.id, b.id]);
      expect((await list()).map((r) => [r.id, r.number])).toEqual([[c.id, 1], [a.id, 2], [b.id, 3]]);
    });
  });

  it("test_rf15_borrar una carta renumera las siguientes", async () => {
    await inRollback(async (tx) => {
      const { admin, store, list } = await setupWithCards(tx);
      const [a, b, c] = await list();
      await deleteCard(tx, store, admin.id, a.id);
      expect((await list()).map((r) => [r.id, r.number])).toEqual([[b.id, 1], [c.id, 2]]);
    });
  });

  it("test_rf15_rechaza un orden que no contiene exactamente las cartas de la colección", async () => {
    await inRollback(async (tx) => {
      const { admin, set, store, list } = await setupWithCards(tx);
      const [a, b] = await list();
      await expect(reorderCards(tx, store, admin.id, set.id, [a.id, b.id])).rejects.toMatchObject({ code: "invalid_order" });
    });
  });
});

describe("RF-16 regeneración y concurrencia", () => {
  it("test_rf16_cambiar solo el nombre no regenera: la carta no lleva texto", async () => {
    await inRollback(async (tx) => {
      const { admin, store, list } = await setupWithCards(tx, 1);
      const [a] = await list();
      const u = await updateCard(tx, store, admin.id, a.id, a.version, { name: "Nombre nuevo" });
      expect(u.keyFull).toBe(a.keyFull);
    });
  });

  it("test_rf16_cambiar la rareza regenera la compuesta y borra la anterior", async () => {
    await inRollback(async (tx) => {
      const { admin, store, list } = await setupWithCards(tx, 1);
      const [a] = await list();
      const u = await updateCard(tx, store, admin.id, a.id, a.version, { rarity: "legendary" });
      expect(u.keyFull).not.toBe(a.keyFull);
      expect(await store.get(u.keyFull!)).not.toBeNull();
      expect(await store.get(a.keyFull!)).toBeNull();
    });
  });

  it("test_rf16_cambiar solo el personaje no regenera la imagen", async () => {
    await inRollback(async (tx) => {
      const { admin, store, list } = await setupWithCards(tx, 1);
      const aiko = await createCharacter(tx, admin.id, { name: "Aiko" });
      const [a] = await list();
      const u = await updateCard(tx, store, admin.id, a.id, a.version, { characterId: aiko.id });
      expect(u.keyFull).toBe(a.keyFull);
    });
  });

  it("test_rf16_editar con una versión vieja avisa y no sobrescribe", async () => {
    await inRollback(async (tx) => {
      const { admin, store, list } = await setupWithCards(tx, 1);
      const [a] = await list();
      await updateCard(tx, store, admin.id, a.id, a.version, { name: "Primera" });
      await expect(updateCard(tx, store, admin.id, a.id, a.version, { name: "Segunda" })).rejects.toMatchObject({ code: "stale_version" });
      expect((await list())[0].name).toBe("Primera");
    });
  });
});

describe("RF-17 resumen de la colección", () => {
  it("test_rf17_da recuento por rareza y huecos según las probabilidades", async () => {
    await inRollback(async (tx) => {
      const { admin, set, store, list } = await setupWithCards(tx, 2);
      const [a] = await list();
      await updateCard(tx, store, admin.id, a.id, a.version, { rarity: "common" });
      const o = (await getSetOverview(tx, set.id))!;
      expect(o.counts).toMatchObject({ common: 1, none: 1 });
      expect(o.gaps).toEqual(["rare", "epic", "legendary", "ex"]);
      expect(o.cards).toHaveLength(2);
    });
  });
});

describe("Regenerar colección", () => {
  it("vuelve a componer todas las cartas y borra las imágenes anteriores", async () => {
    await inRollback(async (tx) => {
      const { admin, set, store, list } = await setupWithCards(tx, 2);
      const before = await list();
      const { regenerateSet } = await import("@/server/services/cards");
      expect(await regenerateSet(tx, store, admin.id, set.id)).toBe(2);
      const after = await list();
      for (const [i, c] of after.entries()) {
        expect(await store.get(c.keyFull!)).not.toBeNull();
        if (c.keyFull !== before[i].keyFull) expect(await store.get(before[i].keyFull!)).toBeNull();
      }
    });
  });
});

describe("Regresión: imágenes idénticas tras recomponer", () => {
  it("pasar de «sin rareza» a común (mismo marco) no borra la imagen vigente", async () => {
    await inRollback(async (tx) => {
      const { admin, set, store, list } = await setupWithCards(tx, 2);
      const [a, b] = await list();
      await bulkUpdateCards(tx, store, admin.id, set.id, { [a.id]: a.version, [b.id]: b.version }, { rarity: "common" });
      for (const c of await list()) for (const k of [c.keyFull, c.keyMid, c.keyThumb, c.keyPublic]) expect(await store.get(k!)).not.toBeNull();
      const [a2] = await list();
      await updateCard(tx, store, admin.id, a2.id, a2.version, { rarity: null });
      const [a3] = await list();
      for (const k of [a3.keyFull, a3.keyMid, a3.keyThumb, a3.keyPublic]) expect(await store.get(k!)).not.toBeNull();
    });
  });
});
