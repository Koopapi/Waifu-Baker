import { describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
import { auditLog, cards, packs } from "@/db/schema";
import { createSet } from "@/server/services/collections";
import { bulkUpdateCards, simulatePack, uploadCardImage } from "@/server/services/cards";
import { inRollback } from "./db";
import { makeAdmin } from "./factories";
import { MIME, testImage } from "./images";
import { tempStore } from "./store";

describe("RF-23 simulación de sobre", () => {
  it("test_rf23_abre un sobre con cartas reales de la colección (también en borrador) sin escribir nada", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const set = await createSet(tx, admin.id, { code: "WB01", name: "Base", isAdult: false, packSize: 5 });
      const store = tempStore();
      for (const hue of [10, 80, 160]) {
        await uploadCardImage(tx, store, admin.id, set.id, { body: await testImage({ hue }), mime: MIME.png, filename: `${hue}.png` });
      }
      const rows = await tx.select().from(cards).where(eq(cards.setId, set.id)).orderBy(asc(cards.number));
      await bulkUpdateCards(tx, store, admin.id, set.id, Object.fromEntries(rows.map((r) => [r.id, r.version])), { rarity: "rare" });
      const auditBefore = (await tx.select().from(auditLog)).length;
      const pack = await simulatePack(tx, set.id);
      expect(pack).toHaveLength(5);
      for (const c of pack) {
        expect(rows.map((r) => r.id)).toContain(c.id);
        expect(c.keyMid).toBeTruthy();
      }
      expect(await tx.select().from(packs)).toHaveLength(0);
      expect(await tx.select().from(auditLog)).toHaveLength(auditBefore);
    });
  });

  it("test_rf23_avisa si la colección aún no tiene cartas", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const set = await createSet(tx, admin.id, { code: "WB09", name: "Vacía", isAdult: false });
      await expect(simulatePack(tx, set.id)).rejects.toMatchObject({ code: "no_cards" });
    });
  });
});
