import { describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
import { cards, sets } from "@/db/schema";
import { createCharacter } from "@/server/services/characters";
import { createSet, updateSet } from "@/server/services/collections";
import { replaceCardArt, reviewCard, updateCard, uploadCardImage } from "@/server/services/cards";
import { inRollback } from "./db";
import { makeAdmin } from "./factories";
import { MIME, testImage } from "./images";
import { tempStore } from "./store";

type Tx = Parameters<Parameters<typeof inRollback>[0]>[0];

async function adultSet(tx: Tx, n = 1) {
  const admin = await makeAdmin(tx);
  const set = await createSet(tx, admin.id, { code: "WB01A", name: "Adultas", isAdult: true });
  const store = tempStore();
  for (let i = 0; i < n; i++) {
    await uploadCardImage(tx, store, admin.id, set.id, { body: await testImage({ hue: 10 + i * 50 }), mime: MIME.png, filename: `${i}.png` });
  }
  const list = () => tx.select().from(cards).where(eq(cards.setId, set.id)).orderBy(asc(cards.number));
  return { admin, set, store, list };
}

describe("RF-18 y RF-19 revisión 18+", () => {
  it("test_rf18_marca la carta como revisada guardando quién y cuándo", async () => {
    await inRollback(async (tx) => {
      const { admin, store, list } = await adultSet(tx);
      const [c] = await list();
      const r = await reviewCard(tx, store, admin.id, c.id, c.version, true);
      expect(r.adultReviewedBy).toBe(admin.id);
      expect(r.adultReviewedAt).toBeInstanceOf(Date);
    });
  });

  it("test_rf18_no se revisa una carta de una colección SFW", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const set = await createSet(tx, admin.id, { code: "WB01", name: "Base", isAdult: false });
      const store = tempStore();
      const c = await uploadCardImage(tx, store, admin.id, set.id, { body: await testImage(), mime: MIME.png, filename: "a.png" });
      await expect(reviewCard(tx, store, admin.id, c.id, c.version, true)).rejects.toMatchObject({ code: "not_adult" });
    });
  });

  it("test_rf19_cambiar la imagen en borrador anula la revisión", async () => {
    await inRollback(async (tx) => {
      const { admin, store, list } = await adultSet(tx);
      const [c] = await list();
      const reviewed = await reviewCard(tx, store, admin.id, c.id, c.version, true);
      const after = await replaceCardArt(tx, store, admin.id, c.id, reviewed.version, { body: await testImage({ hue: 300 }), mime: MIME.png, filename: "n.png" });
      expect(after.adultReviewedAt).toBeNull();
      expect(after.originalKey).not.toBe(c.originalKey);
      expect(after.keyFull).not.toBe(c.keyFull);
    });
  });

  it("test_rf19_en una 18+ publicada el arte nuevo queda pendiente y se sigue viendo el anterior hasta revisarlo", async () => {
    await inRollback(async (tx) => {
      const { admin, set, store, list } = await adultSet(tx);
      const [c] = await list();
      const reviewed = await reviewCard(tx, store, admin.id, c.id, c.version, true);
      await tx.update(sets).set({ status: "published" }).where(eq(sets.id, set.id));
      const pending = await replaceCardArt(tx, store, admin.id, c.id, reviewed.version, { body: await testImage({ hue: 200 }), mime: MIME.png, filename: "n.png" });
      expect(pending.pendingOriginalKey).toBeTruthy();
      expect(pending.keyFull).toBe(reviewed.keyFull);
      expect(pending.adultReviewedAt).toEqual(reviewed.adultReviewedAt);
      const approved = await reviewCard(tx, store, admin.id, c.id, pending.version, true);
      expect(approved.pendingOriginalKey).toBeNull();
      expect(approved.originalKey).toBe(pending.pendingOriginalKey);
      expect(approved.keyFull).not.toBe(reviewed.keyFull);
    });
  });

  it("caso límite: pasar una colección a 18+ deja todas sus cartas sin revisar; volver a SFW también", async () => {
    await inRollback(async (tx) => {
      const { admin, set, store, list } = await adultSet(tx, 2);
      const [a] = await list();
      await reviewCard(tx, store, admin.id, a.id, a.version, true);
      const s1 = await updateSet(tx, admin.id, set.id, set.version, { isAdult: false });
      await updateSet(tx, admin.id, set.id, s1.version, { isAdult: true });
      for (const c of await list()) expect(c.adultReviewedAt).toBeNull();
    });
  });

  it("cambiar textos de una carta 18+ revisada no anula la revisión", async () => {
    await inRollback(async (tx) => {
      const { admin, store, list } = await adultSet(tx);
      const ch = await createCharacter(tx, admin.id, { name: "Aiko" });
      const [c] = await list();
      const r = await reviewCard(tx, store, admin.id, c.id, c.version, true);
      const u = await updateCard(tx, store, admin.id, c.id, r.version, { name: "Aiko de noche", characterId: ch.id });
      expect(u.adultReviewedAt).not.toBeNull();
    });
  });
});
