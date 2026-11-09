import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { auditLog, cardVersions, cards, dropTables, packDesigns, sets } from "@/db/schema";
import { createSet } from "@/server/services/collections";
import { uploadCardImage } from "@/server/services/cards";
import { deleteSet, getSetDeletionInfo } from "@/server/services/set-deletion";
import { setCoverCards } from "@/server/services/settings";
import { saveTierRule } from "@/server/services/tiers";
import { upsertUserFromLogin } from "@/server/services/users";
import { giftPacks } from "@/server/services/users-admin";
import { setWelcomeSet } from "@/server/services/welcome";
import { openPack } from "@/server/services/packs";
import { inRollback } from "./db";
import { createPublishedSet, makeAdmin } from "./factories";
import { MIME, testImage } from "./images";
import { tempStore } from "./store";

const png = async (hue: number) => ({ body: await testImage({ hue }), mime: MIME.png, filename: `${hue}.png` });

describe("spec 032: eliminar una colección", () => {
  it("test_s032_rf5_rf7_un_borrador_se_elimina_con_sus_cartas_imagenes_y_disenos_y_queda_la_auditoria", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const store = tempStore();
      const s = await createSet(tx, admin.id, { code: "DEL1", name: "Para borrar", isAdult: false });
      const c1 = await uploadCardImage(tx, store, admin.id, s.id, await png(10));
      await uploadCardImage(tx, store, admin.id, s.id, await png(90));
      await tx.insert(cardVersions).values({ cardId: c1.id, number: 99, ficha: {} as never, layers: null, changed: "ficha", actorUserId: admin.id });
      await tx.insert(packDesigns).values({ setId: s.id, kind: "silver", design: {} as never, thumbKey: `sets/${s.id}/pack-design/thumb-x.webp` });
      await store.put(`sets/${s.id}/pack-design/thumb-x.webp`, Buffer.from("x"));
      // Lo de otra colección y la biblioteca no se toca.
      const other = await createSet(tx, admin.id, { code: "KEEP", name: "Se queda", isAdult: false });
      await uploadCardImage(tx, store, admin.id, other.id, await png(200));
      await store.put("library/abc.webp", Buffer.from("y"));
      const otherKeys = (await store.list(`sets/${other.id}/`)).length;

      const info = await getSetDeletionInfo(tx, store, s.id);
      expect(info).toMatchObject({ code: "DEL1", status: "draft", cards: 2, packDesigns: 1, blockers: [], canArchive: false });
      expect(info.images).toBeGreaterThan(2);

      expect(await deleteSet(tx, store, admin.id, s.id, " del1 ")).toEqual({ code: "DEL1" });
      expect(await tx.select().from(sets).where(eq(sets.id, s.id))).toHaveLength(0);
      expect(await tx.select().from(cards).where(eq(cards.setId, s.id))).toHaveLength(0);
      expect(await tx.select().from(dropTables).where(eq(dropTables.setId, s.id))).toHaveLength(0);
      expect(await tx.select().from(packDesigns).where(eq(packDesigns.setId, s.id))).toHaveLength(0);
      expect(await tx.select().from(cardVersions).where(eq(cardVersions.cardId, c1.id))).toHaveLength(0);
      expect(await store.list(`sets/${s.id}/`)).toEqual([]);
      expect(await store.list(`sets/${other.id}/`)).toHaveLength(otherKeys);
      expect(await store.get("library/abc.webp")).not.toBeNull();
      const [log] = await tx.select().from(auditLog).where(eq(auditLog.action, "set_delete"));
      expect(log).toMatchObject({ actorUserId: admin.id, entityType: "set", entityId: s.id, before: { code: "DEL1", name: "Para borrar", status: "draft", cards: 2 } });
    });
  });

  it("test_s032_rf5_una_coleccion_sin_cartas_se_elimina", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const store = tempStore();
      const s = await createSet(tx, admin.id, { code: "VACIA", name: "Vacía", isAdult: true });
      expect((await getSetDeletionInfo(tx, store, s.id)).cards).toBe(0);
      await deleteSet(tx, store, admin.id, s.id, "VACIA");
      expect(await tx.select().from(sets).where(eq(sets.id, s.id))).toHaveLength(0);
    });
  });

  it("test_s032_rf4_con_el_codigo_equivocado_no_se_elimina", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const store = tempStore();
      const s = await createSet(tx, admin.id, { code: "DEL2", name: "X", isAdult: false });
      await expect(deleteSet(tx, store, admin.id, s.id, "DEL3")).rejects.toMatchObject({ code: "confirm_mismatch" });
      expect(await tx.select().from(sets).where(eq(sets.id, s.id))).toHaveLength(1);
    });
  });

  it("test_s032_rf8_rf9_con_un_sobre_entregado_aunque_este_abierto_no_se_elimina_y_dice_cuantos_usuarios", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const store = tempStore();
      const pub = await createPublishedSet(tx, admin.id, { code: "OWN1", rarities: ["common", "rare"], slots: [{ common: 100 }, { rare: 100 }], store });
      const fan = await upsertUserFromLogin(tx, { patreonUserId: "fan-del", displayName: "Fan", role: "user" });
      await giftPacks(tx, admin.id, { userId: fan.id, setId: pub.set.id, count: 1, reason: "Pruebas" });
      const info = await getSetDeletionInfo(tx, store, pub.set.id);
      expect(info.blockers).toEqual([{ kind: "owners", count: 1 }]);
      expect(info.canArchive).toBe(true);
      const [p] = await tx.query.packs.findMany({ where: (t, { eq }) => eq(t.userId, fan.id) });
      await openPack(tx, { userId: fan.id, packId: p.id });
      await expect(deleteSet(tx, store, admin.id, pub.set.id, "OWN1")).rejects.toMatchObject({ code: "set_not_deletable" });
      expect(await tx.select().from(sets).where(eq(sets.id, pub.set.id))).toHaveLength(1);
      expect(await store.list(`sets/${pub.set.id}/`)).not.toEqual([]);
    });
  });

  it("test_s032_rf11_la_bienvenida_las_cartas_de_portada_y_una_regla_de_tier_impiden_eliminar", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const store = tempStore();
      const pub = await createPublishedSet(tx, admin.id, { code: "USE1", rarities: ["common", "rare", "epic"], slots: [{ common: 100 }, { rare: 100 }], store });
      await setWelcomeSet(tx, admin.id, pub.set.id);
      await setCoverCards(tx, admin.id, pub.cards.map((c) => c.id));
      await saveTierRule(tx, admin.id, { patreonTierId: "t-1", tierName: "Booster", setId: pub.set.id, packsPerMonth: 3, active: true });
      const info = await getSetDeletionInfo(tx, store, pub.set.id);
      expect(info.blockers).toEqual([{ kind: "welcome" }, { kind: "cover_cards", count: 3 }, { kind: "tier_rule", name: "Booster" }]);
      expect(info.canArchive).toBe(false);
      await expect(deleteSet(tx, store, admin.id, pub.set.id, "USE1")).rejects.toMatchObject({ code: "set_not_deletable" });
    });
  });

  it("test_s032_rf14_si_alguien_recibe_un_sobre_despues_de_abrir_el_aviso_no_se_elimina", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const store = tempStore();
      const pub = await createPublishedSet(tx, admin.id, { code: "RACE", rarities: ["common", "rare"], slots: [{ common: 100 }, { rare: 100 }], store });
      expect((await getSetDeletionInfo(tx, store, pub.set.id)).blockers).toEqual([]);
      const fan = await upsertUserFromLogin(tx, { patreonUserId: "fan-race", displayName: "Fan", role: "user" });
      await giftPacks(tx, admin.id, { userId: fan.id, setId: pub.set.id, count: 1, reason: "Llega tarde" });
      await expect(deleteSet(tx, store, admin.id, pub.set.id, "RACE")).rejects.toMatchObject({ code: "set_not_deletable" });
    });
  });

  it("test_s032_rf5_una_coleccion_publicada_sin_duenos_se_elimina_y_otra_vez_ya_no_existe", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const store = tempStore();
      const pub = await createPublishedSet(tx, admin.id, { code: "PUB1", rarities: ["common", "rare"], slots: [{ common: 100 }, { rare: 100 }], store });
      await deleteSet(tx, store, admin.id, pub.set.id, "pub1");
      await expect(deleteSet(tx, store, admin.id, pub.set.id, "PUB1")).rejects.toMatchObject({ code: "not_found" });
      await expect(getSetDeletionInfo(tx, store, pub.set.id)).rejects.toMatchObject({ code: "not_found" });
    });
  });
});
