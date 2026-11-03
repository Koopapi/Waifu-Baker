// Spec 027: guardado único de la carta (ficha y capas en una transacción), versiones por carta y lo que se suelta.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { and, asc, eq, sql } from "drizzle-orm";
import { auditLog, cards, cardVersions } from "@/db/schema";
import { createSet } from "@/server/services/collections";
import { deleteCard, updateCard, uploadCardImage } from "@/server/services/cards";
import { removeCardLayers, saveCardLayers } from "@/server/services/card-layers";
import { getVersion, listVersions, missingKeys, saveCard } from "@/server/services/card-save";
import { stageLayerImage } from "@/server/cards/layer-images";
import { imageKeys, type LayersConfig } from "@/domain/cards/layers";
import { inRollback } from "./db";
import { createPublishedSet, makeAdmin } from "./factories";
import { MIME, testImage } from "./images";
import { tempStore } from "./store";

type Tx = Parameters<Parameters<typeof inRollback>[0]>[0];

async function setup(tx: Tx) {
  const admin = await makeAdmin(tx);
  const set = await createSet(tx, admin.id, { code: "SAV1", name: "Guardado", isAdult: false });
  const store = tempStore();
  // Desde la spec 017 la carta nace con la chica como capa (y, desde la 027, con su versión 1).
  const card = await uploadCardImage(tx, store, admin.id, set.id, { body: await testImage({ cutout: true }), mime: MIME.png, filename: "chica.png" });
  const stage = async (hue: number) => (await stageLayerImage(store, { body: await testImage({ width: 1400, height: 1982, hue }), mime: MIME.png, filename: `${hue}.png` }, "layer")).key;
  const load = async () => (await tx.select().from(cards).where(eq(cards.id, card.id)))[0];
  const versions = async () => tx.select().from(cardVersions).where(eq(cardVersions.cardId, card.id)).orderBy(asc(cardVersions.number));
  const withBackground = async (hue: number): Promise<LayersConfig> => ({ ...card.layers!, capas: [{ key: await stage(hue), rol: "fondo", profundidad: 0.2 }, ...card.layers!.capas] });
  return { admin, set, store, card, stage, load, versions, withBackground };
}

describe("spec 027 — guardado único de la carta", () => {
  it("test_s027_rf1_guarda_la_ficha_y_las_capas_juntas_y_sube_la_version_una_vez", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card, load, versions, withBackground } = await setup(tx);
      const r = await saveCard(tx, store, admin.id, card.id, { ficha: { name: "Yuki" }, layers: await withBackground(40), expectedVersion: card.version });
      const after = await load();
      expect(after.name).toBe("Yuki");
      expect(after.layers?.capas).toHaveLength(2);
      expect(after.version).toBe(card.version + 1);
      expect(r.changed).toBe("ambas");
      // La carta nació con su versión 1; este guardado crea la 2.
      expect((await versions()).map((v) => [v.number, v.changed])).toEqual([
        [1, "ambas"],
        [2, "ambas"],
      ]);
    });
  });

  it("test_s027_rf2_si_las_capas_no_son_validas_o_hay_conflicto_la_ficha_tampoco_se_guarda", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card, load, versions } = await setup(tx);
      // Capas sin la chica: no valen (spec 017, RF-5). La ficha venía en la misma petición y no se guarda.
      await expect(saveCard(tx, store, admin.id, card.id, { ficha: { name: "Nada" }, layers: { capas: [], marco: "n", sello: null }, expectedVersion: card.version })).rejects.toMatchObject({ code: "no_visible_layer" });
      // Conflicto de edición: tampoco.
      await expect(saveCard(tx, store, admin.id, card.id, { ficha: { name: "Nada" }, expectedVersion: card.version + 7 })).rejects.toMatchObject({ code: "stale_version" });
      // Ficha inválida con capas válidas: nada.
      await expect(saveCard(tx, store, admin.id, card.id, { ficha: { name: "x".repeat(61) }, layers: card.layers, expectedVersion: card.version })).rejects.toMatchObject({ code: "invalid_name" });
      const after = await load();
      expect([after.name, after.version, after.layers]).toEqual([card.name, card.version, card.layers]);
      expect(await versions()).toHaveLength(1);
    });
  });

  it("test_s027_rf17_rf19_cada_guardado_crea_una_version_con_quien_cuando_y_que_cambio", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card, withBackground } = await setup(tx);
      await updateCard(tx, store, admin.id, card.id, card.version, { name: "Yuki" });
      await saveCardLayers(tx, store, admin.id, card.id, { config: await withBackground(80), expectedVersion: card.version + 1 });
      const list = await listVersions(tx, card.id);
      expect(list.map((v) => [v.number, v.changed, v.pending, v.actorName])).toEqual([
        [3, "capas", false, "Admin"],
        [2, "ficha", false, "Admin"],
        [1, "ambas", false, "Admin"],
      ]);
      expect(list[0].createdAt.getTime()).toBeGreaterThanOrEqual(list[2].createdAt.getTime());
      const v2 = await getVersion(tx, card.id, 2);
      expect(v2.ficha.name).toBe("Yuki");
      expect(v2.layers).toEqual(card.layers);
      expect((await getVersion(tx, card.id, 3)).layers?.capas).toHaveLength(2);
    });
  });

  it("test_s027_rf18_rf21_se_conservan_las_ultimas_10_y_las_antiguas_se_borran_sin_reescribir_ninguna", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card, versions } = await setup(tx);
      let version = card.version;
      for (let i = 1; i <= 12; i++) version = (await updateCard(tx, store, admin.id, card.id, version, { name: `Nombre ${i}` })).version;
      const kept = await versions();
      expect(kept.map((v) => v.number)).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
      expect(kept.map((v) => v.ficha.name)).toEqual(Array.from({ length: 10 }, (_, i) => `Nombre ${i + 3}`));
      await expect(getVersion(tx, card.id, 1)).rejects.toMatchObject({ code: "not_found" });
      // Volver a una versión y guardar crea una versión nueva: la anterior sigue igual.
      const v5 = await getVersion(tx, card.id, 5);
      const r = await saveCard(tx, store, admin.id, card.id, { ficha: v5.ficha, layers: v5.layers, expectedVersion: version, restoredFrom: 5 });
      expect(r.versionNumber).toBe(14);
      expect((await getVersion(tx, card.id, 5)).ficha).toEqual(v5.ficha);
      expect((await getVersion(tx, card.id, 14)).ficha.name).toBe("Nombre 4");
    });
  });

  it("test_s027_rf22_una_imagen_que_usa_una_version_conservada_no_se_borra_hasta_que_ninguna_la_use", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card, load, withBackground } = await setup(tx);
      const a = await saveCardLayers(tx, store, admin.id, card.id, { config: await withBackground(40), expectedVersion: card.version });
      const keyA = imageKeys(a.card.layers).find((k) => !imageKeys(card.layers).includes(k))!;
      const b = await saveCardLayers(tx, store, admin.id, card.id, { config: await withBackground(200), expectedVersion: a.card.version });
      const keyB = imageKeys(b.card.layers).find((k) => !imageKeys(card.layers).includes(k))!;
      // El fondo A ya no está en la carta, pero sí en la versión 2: se conserva.
      expect(imageKeys((await load()).layers)).not.toContain(keyA);
      expect(await store.get(keyA)).not.toBeNull();
      // Nueve guardados más: la versión 2 sobra (quedan de la 3 a la 12) y su fondo se suelta.
      let version = b.card.version;
      for (let i = 1; i <= 9; i++) version = (await updateCard(tx, store, admin.id, card.id, version, { name: `N${i}` })).version;
      expect((await listVersions(tx, card.id)).map((v) => v.number)).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3]);
      expect(await store.get(keyA)).toBeNull();
      expect(await store.get(keyB)).not.toBeNull();
    });
  });

  it("test_s027_rf23_en_una_18_publicada_el_guardado_queda_pendiente_y_la_version_lo_marca", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const store = tempStore();
      const { cards: list } = await createPublishedSet(tx, admin.id, { code: "SAV2", rarities: ["common", "rare"], slots: [{ common: 100 }, { rare: 100 }], isAdult: true, store });
      const card = list[0];
      const extra = (await stageLayerImage(store, { body: await testImage({ width: 1400, height: 1982, hue: 90 }), mime: MIME.png, filename: "x.png" }, "layer")).key;
      const r = await saveCard(tx, store, admin.id, card.id, { ficha: { flavorText: "Texto" }, layers: { ...card.layers!, capas: [...card.layers!.capas, { key: extra, rol: "extra" }] }, expectedVersion: card.version });
      expect(r.pending).toBe(true);
      const [latest] = await listVersions(tx, card.id);
      expect([latest.pending, latest.changed]).toEqual([true, "ambas"]);
      // La foto de la versión es la del cambio pendiente; lo vigente no cambió.
      expect((await getVersion(tx, card.id, latest.number)).layers?.capas).toHaveLength(card.layers!.capas.length + 1);
      expect(r.card.layers).toEqual(card.layers);
    });
  });

  it("test_s027_rf24_la_auditoria_lleva_el_numero_de_version_y_la_vuelta_a_una_version", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card, withBackground } = await setup(tx);
      const r = await saveCard(tx, store, admin.id, card.id, { ficha: { name: "Vuelta" }, layers: await withBackground(10), expectedVersion: card.version, restoredFrom: 1 });
      const rows = await tx.select().from(auditLog).where(eq(auditLog.entityId, card.id)).orderBy(asc(auditLog.id));
      const ficha = rows.find((x) => x.action === "card_update");
      const capas = rows.find((x) => x.action === "card_layers_update");
      expect(ficha?.meta).toMatchObject({ version: r.card.version, versionNumber: 2, restoredFrom: 1 });
      expect(capas?.meta).toMatchObject({ version: r.card.version, versionNumber: 2, restoredFrom: 1, forced: false });
    });
  });

  it("test_s027_rf25_la_migracion_toma_lo_guardado_de_cada_carta_existente_como_su_version_1", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card, load, versions, withBackground } = await setup(tx);
      await saveCard(tx, store, admin.id, card.id, { ficha: { name: "Antes de la spec" }, layers: await withBackground(40), expectedVersion: card.version });
      // Una carta de antes de la spec: sin versiones. La siembra de la migración 0020 le da la 1 con su estado actual.
      await tx.delete(cardVersions).where(eq(cardVersions.cardId, card.id));
      const migration = readFileSync(path.resolve(__dirname, "../../drizzle/0020_versiones_de_carta.sql"), "utf8");
      const seed = migration.split("--> statement-breakpoint").pop()!;
      await tx.execute(sql.raw(seed));
      const [v1] = await versions();
      const cur = await load();
      expect(v1).toMatchObject({ number: 1, changed: "ambas", pending: false, actorUserId: null });
      expect(v1.ficha).toEqual({ name: cur.name, flavorText: cur.flavorText, characterId: cur.characterId, rarity: cur.rarity, variant: cur.variant });
      expect(v1.layers).toEqual(cur.layers);
    });
  });

  it("test_s027_borrar_la_carta_borra_sus_versiones_y_suelta_las_imagenes_que_solo_ellas_usaban", async () => {
    await inRollback(async (tx) => {
      const { admin, set, store, card, withBackground } = await setup(tx);
      const r = await saveCardLayers(tx, store, admin.id, card.id, { config: await withBackground(40), expectedVersion: card.version });
      const keys = imageKeys(r.card.layers);
      for (const k of keys) expect(await store.get(k)).not.toBeNull();
      expect(set.status).toBe("draft");
      await deleteCard(tx, store, admin.id, card.id);
      expect(await tx.select().from(cardVersions).where(eq(cardVersions.cardId, card.id))).toHaveLength(0);
      for (const k of keys) expect(await store.get(k)).toBeNull();
    });
  });

  it("test_s027_rf16_dice_que_claves_de_un_borrador_ya_no_estan", async () => {
    await inRollback(async (tx) => {
      const { store, card, stage } = await setup(tx);
      const temp = await stage(10);
      const gone = "tmp/layers/00000000-0000-4000-8000-000000000000.webp";
      expect(await missingKeys(store, [...imageKeys(card.layers), temp, gone, "../../etc/passwd"])).toEqual([gone, "../../etc/passwd"]);
    });
  });

  it("test_s027_quitar_las_capas_sigue_pasando_por_el_guardado_unico", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card } = await setup(tx);
      // Una carta con chica no puede quedarse sin capas (spec 017, RF-5): el guardado único lo respeta.
      await expect(removeCardLayers(tx, store, admin.id, card.id, { expectedVersion: card.version })).rejects.toMatchObject({ code: "character_required" });
      expect(await tx.select().from(cardVersions).where(and(eq(cardVersions.cardId, card.id), eq(cardVersions.number, 2)))).toHaveLength(0);
    });
  });
});
