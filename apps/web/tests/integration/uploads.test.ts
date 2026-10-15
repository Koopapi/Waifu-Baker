import { describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
import { cards, sets } from "@/db/schema";
import { createSet } from "@/server/services/collections";
import { uploadCardImage } from "@/server/services/cards";
import { inRollback } from "./db";
import { makeAdmin } from "./factories";
import { MIME, testImage } from "./images";
import { tempStore } from "./store";

async function setup(tx: Parameters<Parameters<typeof inRollback>[0]>[0]) {
  const admin = await makeAdmin(tx);
  const set = await createSet(tx, admin.id, { code: "WB01", name: "Base", isAdult: false });
  return { admin, set, store: tempStore() };
}

describe("RF-11 a RF-13 subida de imágenes", () => {
  it("test_rf11_crea una carta en borrador por imagen, numerada y con original y compuestas guardadas", async () => {
    await inRollback(async (tx) => {
      const { admin, set, store } = await setup(tx);
      for (const hue of [10, 120, 240]) {
        await uploadCardImage(tx, store, admin.id, set.id, { body: await testImage({ hue }), mime: MIME.png, filename: `a${hue}.png` });
      }
      const rows = await tx.select().from(cards).where(eq(cards.setId, set.id)).orderBy(asc(cards.number));
      expect(rows.map((r) => r.number)).toEqual([1, 2, 3]);
      for (const r of rows) {
        expect(r.status).toBe("draft");
        expect(r.width).toBe(832);
        expect(r.blurhash).toBeTruthy();
        for (const k of [r.originalKey, r.keyFull, r.keyMid, r.keyThumb, r.keyPublic]) expect(await store.get(k!)).not.toBeNull();
      }
    });
  });

  it("test_rf12_rechaza tipo, tamaño mínimo y archivos dañados con su motivo", async () => {
    await inRollback(async (tx) => {
      const { admin, set, store } = await setup(tx);
      const up = (body: Buffer, mime: string) => uploadCardImage(tx, store, admin.id, set.id, { body, mime, filename: "x" });
      await expect(up(await testImage({ format: "gif" }), MIME.gif)).rejects.toMatchObject({ code: "unsupported_type" });
      await expect(up(await testImage({ width: 500, height: 700 }), MIME.png)).rejects.toMatchObject({ code: "too_narrow" });
      await expect(up(Buffer.from("no soy una imagen"), MIME.png)).rejects.toMatchObject({ code: "unreadable" });
      expect(await tx.select().from(cards)).toHaveLength(0);
    });
  });

  it("test_rf13_avisa del duplicado y no crea la carta", async () => {
    await inRollback(async (tx) => {
      const { admin, set, store } = await setup(tx);
      const img = await testImage({ hue: 33 });
      await uploadCardImage(tx, store, admin.id, set.id, { body: img, mime: MIME.png, filename: "a.png" });
      await expect(uploadCardImage(tx, store, admin.id, set.id, { body: img, mime: MIME.png, filename: "b.png" })).rejects.toMatchObject({
        code: "duplicate_image",
      });
      expect(await tx.select().from(cards)).toHaveLength(1);
    });
  });

  it("test_rf8_no se añaden cartas a una colección publicada", async () => {
    await inRollback(async (tx) => {
      const { admin, set, store } = await setup(tx);
      await tx.update(sets).set({ status: "published" }).where(eq(sets.id, set.id));
      await expect(
        uploadCardImage(tx, store, admin.id, set.id, { body: await testImage(), mime: MIME.png, filename: "a.png" }),
      ).rejects.toMatchObject({ code: "locked" });
    });
  });
});
