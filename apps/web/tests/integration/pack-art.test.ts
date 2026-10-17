// Spec 014, RF-5 a RF-8: portada del sobre y sobre diseñado a mano.
import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import sharp from "sharp";
import { auditLog, users } from "@/db/schema";
import { packArt, packArtFile, removePackImage, setCoverCard, uploadPackImage } from "@/server/services/pack-art";
import { upsertUserFromLogin } from "@/server/services/users";
import { inRollback } from "./db";
import { createPublishedSet, makeAdmin } from "./factories";
import { MIME, testImage } from "./images";
import { tempStore } from "./store";

const ODDS = [{ common: 100 }, { legendary: 100 }];

describe("spec 014 — arte del sobre", () => {
  it("test_s014_rf6_el_administrador_elige_la_portada_y_sin_eleccion_va_la_de_mayor_rareza", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const { set, cards } = await createPublishedSet(tx, admin.id, { code: "PA1", rarities: ["common", "legendary"], slots: ODDS });
      expect((await packArt(tx, set.id))!.coverCardId).toBe(cards[1].id);
      await setCoverCard(tx, admin.id, set.id, cards[0].id);
      expect((await packArt(tx, set.id))!.coverCardId).toBe(cards[0].id);
      await setCoverCard(tx, admin.id, set.id, null);
      expect((await packArt(tx, set.id))!.coverCardId).toBe(cards[1].id);
      const audits = await tx.select().from(auditLog).where(and(eq(auditLog.entityId, set.id), eq(auditLog.action, "set.cover")));
      expect(audits).toHaveLength(2);
    });
  });

  it("test_s014_rf6_la_portada_debe_ser_de_la_misma_coleccion", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const a = await createPublishedSet(tx, admin.id, { code: "PA2", rarities: ["common", "legendary"], slots: ODDS });
      const b = await createPublishedSet(tx, admin.id, { code: "PA3", rarities: ["common", "legendary"], slots: ODDS });
      await expect(setCoverCard(tx, admin.id, a.set.id, b.cards[0].id)).rejects.toMatchObject({ code: "card_not_in_set" });
    });
  });

  it("test_s014_rf7_subir_reemplazar_y_quitar_el_sobre_hecho_a_mano", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const store = tempStore();
      const { set } = await createPublishedSet(tx, admin.id, { code: "PA4", rarities: ["common", "legendary"], slots: ODDS });
      // Proporción distinta (cuadrada): se recorta al formato del sobre sin deformarla.
      await uploadPackImage(tx, store, admin.id, set.id, { body: await testImage({ width: 1200, height: 1200, hue: 30 }), mime: MIME.png, filename: "sobre.png" });
      const first = (await packArt(tx, set.id))!.packImageKey!;
      const meta = await sharp((await store.get(first))!.body).metadata();
      expect([meta.format, meta.width, meta.height]).toEqual(["webp", 600, 900]);
      await uploadPackImage(tx, store, admin.id, set.id, { body: await testImage({ width: 600, height: 900, hue: 90 }), mime: MIME.png, filename: "sobre2.png" });
      const second = (await packArt(tx, set.id))!.packImageKey!;
      expect(second).not.toBe(first);
      expect(await store.get(first)).toBeNull();
      await removePackImage(tx, store, admin.id, set.id);
      expect((await packArt(tx, set.id))!.packImageKey).toBeNull();
      expect(await store.get(second)).toBeNull();
      const actions = (await tx.select().from(auditLog).where(eq(auditLog.entityId, set.id))).map((r) => r.action);
      expect(actions.filter((a) => a.startsWith("set.pack_image"))).toEqual(["set.pack_image", "set.pack_image", "set.pack_image_remove"]);
    });
  });

  it("test_s014_rf8_el_arte_se_sirve_a_quien_puede_ver_la_coleccion", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const store = tempStore();
      const sfw = await createPublishedSet(tx, admin.id, { code: "PA5", rarities: ["common", "legendary"], slots: ODDS, store });
      const adult = await createPublishedSet(tx, admin.id, { code: "PA6", rarities: ["common", "legendary"], slots: ODDS, isAdult: true, store });
      const fan = await upsertUserFromLogin(tx, { patreonUserId: "fan-pa", displayName: "Fan", role: "user" });
      expect((await packArtFile(tx, store, fan.id, sfw.set.id, "cover"))?.contentType).toMatch(/^image\//);
      expect(await packArtFile(tx, store, null, sfw.set.id, "cover")).toBeNull();
      expect(await packArtFile(tx, store, fan.id, sfw.set.id, "pack")).toBeNull();
      // 18+: solo con la edad verificada.
      expect(await packArtFile(tx, store, fan.id, adult.set.id, "cover")).toBeNull();
      expect(await packArtFile(tx, store, admin.id, adult.set.id, "cover")).not.toBeNull(); // vista previa del panel
      await tx.update(users).set({ isAdultDeclared: true, adultVerifiedAt: new Date() }).where(eq(users.id, fan.id));
      expect(await packArtFile(tx, store, fan.id, adult.set.id, "cover")).not.toBeNull();
    });
  });
});
