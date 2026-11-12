// Spec 037: la imagen fija holo de cada carta y la regeneración de las cartas con receta anterior.
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { cards, userCards } from "@/db/schema";
import { FLAT_VERSION } from "@/domain/cards/flat-version";
import { activateAlbum, publicCardImageKey } from "@/server/services/album";
import { saveCardLayers } from "@/server/services/card-layers";
import { regenerateSet, reviewCard } from "@/server/services/cards";
import { failedFlats, regenerateOutdated } from "@/server/services/flat-regen";
import { upsertUserFromLogin } from "@/server/services/users";
import { stageLayerImage } from "@/server/cards/layer-images";
import { imageKeys } from "@/domain/cards/layers";
import { inRollback } from "./db";
import { createPublishedSet, makeAdmin } from "./factories";
import { MIME, testImage } from "./images";
import { tempStore } from "./store";

type Tx = Parameters<Parameters<typeof inRollback>[0]>[0];

async function world(tx: Tx, opts: { isAdult?: boolean } = {}) {
  const admin = await makeAdmin(tx);
  const store = tempStore();
  const { set, cards: list } = await createPublishedSet(tx, admin.id, { code: "HOL1", rarities: ["common", "rare"], slots: [{ common: 100 }, { rare: 100 }], store, isAdult: opts.isAdult });
  const load = async (id: string) => (await tx.select().from(cards).where(eq(cards.id, id)))[0];
  return { admin, store, set, list, load };
}

describe("spec 037 — imagen fija holo", () => {
  it("test_s037_rf11_guardar_una_carta_genera_su_imagen_holo", async () => {
    await inRollback(async (tx) => {
      const { store, list, load } = await world(tx);
      const card = await load(list[0].id);
      for (const key of [card.keyHoloMid, card.keyHoloThumb, card.keyHoloPublic]) {
        expect(key).toBeTruthy();
        expect(await store.get(key!)).not.toBeNull();
      }
      expect(card.keyHoloThumb).not.toBe(card.keyThumb);
      expect(card.flatVersion).toBe(FLAT_VERSION);
    });
  });

  it("test_s037_rf15_una_carta_guardada_con_holo_usa_la_misma_imagen", async () => {
    await inRollback(async (tx) => {
      const { admin, store, list, load } = await world(tx);
      const card = await load(list[0].id);
      await saveCardLayers(tx, store, admin.id, card.id, { config: { ...card.layers!, holo: true }, expectedVersion: card.version });
      const after = await load(card.id);
      expect(after.keyHoloThumb).toBe(after.keyThumb);
      expect(after.keyHoloMid).toBe(after.keyMid);
      expect(after.keyHoloPublic).toBe(after.keyPublic);
      // La imagen holo anterior ya no la usa nadie.
      expect(await store.get(card.keyHoloThumb!)).toBeNull();
    });
  });

  it("test_s037_rf11_lo_pendiente_de_revision_lleva_su_holo_y_al_aprobarlo_pasa_a_la_carta", async () => {
    await inRollback(async (tx) => {
      const { admin, store, list, load } = await world(tx, { isAdult: true });
      const card = await load(list[0].id);
      const extra = (await stageLayerImage(store, { body: await testImage({ width: 1400, height: 1982, hue: 200 }), mime: MIME.png, filename: "x.png" }, "layer")).key;
      await saveCardLayers(tx, store, admin.id, card.id, { config: { ...card.layers!, capas: [...card.layers!.capas, { key: extra, rol: "extra" }] }, expectedVersion: card.version });
      const pending = await load(card.id);
      expect(pending.keyHoloThumb).toBe(card.keyHoloThumb);
      expect(pending.pendingKeys?.holoThumb).toBeTruthy();
      await reviewCard(tx, store, admin.id, card.id, pending.version, true);
      const approved = await load(card.id);
      expect(approved.keyHoloThumb).toBe(pending.pendingKeys!.holoThumb);
      expect(approved.flatVersion).toBe(FLAT_VERSION);
      expect(await store.get(card.keyHoloThumb!)).toBeNull();
    });
  });
});

describe("spec 037 — regeneración de las cartas ya armadas", () => {
  it("test_s037_rf17_al_desplegar_regenera_la_imagen_y_la_holo_de_las_cartas_atrasadas", async () => {
    await inRollback(async (tx) => {
      const { store, list, load } = await world(tx);
      const before = await load(list[0].id);
      // Como una carta guardada antes de la spec: sin imagen holo y con la receta anterior.
      await tx.update(cards).set({ keyHoloMid: null, keyHoloThumb: null, keyHoloPublic: null, flatVersion: 1 }).where(eq(cards.id, before.id));
      const r = await regenerateOutdated(tx, store);
      expect(r.done).toBeGreaterThanOrEqual(1);
      expect(r.failed).toBe(0);
      const after = await load(before.id);
      expect(after.flatVersion).toBe(FLAT_VERSION);
      expect(after.keyHoloThumb).toBeTruthy();
      expect(await store.get(after.keyHoloThumb!)).not.toBeNull();
      // No es una edición: la versión de la carta no cambia.
      expect(after.version).toBe(before.version);
      // Nada más que regenerar.
      expect(await regenerateOutdated(tx, store)).toEqual({ done: 0, failed: 0 });
    });
  });

  it("test_s037_rf18_si_una_carta_falla_conserva_su_imagen_queda_listada_y_se_puede_reintentar", async () => {
    await inRollback(async (tx) => {
      const { admin, store, set, list, load } = await world(tx);
      const before = await load(list[0].id);
      await tx.update(cards).set({ flatVersion: 1 }).where(eq(cards.id, before.id));
      // Una de sus capas desaparece del almacén: no se puede dibujar.
      const lost = imageKeys(before.layers!)[0];
      const saved = (await store.get(lost))!;
      await store.delete(lost);
      const r = await regenerateOutdated(tx, store);
      expect(r.failed).toBe(1);
      const failed = await load(before.id);
      expect(failed.keyThumb).toBe(before.keyThumb);
      expect(failed.flatError).toBeTruthy();
      expect(await failedFlats(tx, set.id)).toEqual([expect.objectContaining({ id: before.id, error: failed.flatError })]);
      // No se reintenta sola en cada pasada.
      expect((await regenerateOutdated(tx, store)).failed).toBe(0);
      // Con la capa de vuelta, «Regenerar imágenes» la recupera.
      await store.put(lost, saved.body);
      await regenerateSet(tx, store, admin.id, set.id);
      const fixed = await load(before.id);
      expect(fixed.flatError).toBeNull();
      expect(fixed.flatVersion).toBe(FLAT_VERSION);
      expect(await failedFlats(tx, set.id)).toEqual([]);
    });
  });
});

describe("spec 037 — álbum público", () => {
  it("test_s037_rf16_el_album_publico_usa_la_imagen_holo_si_el_dueno_tiene_la_holo", async () => {
    await inRollback(async (tx) => {
      const { list, load } = await world(tx);
      const fan = await upsertUserFromLogin(tx, { patreonUserId: "fan-holo", displayName: "Fan", role: "user" });
      const [normal, holo] = [await load(list[0].id), await load(list[1].id)];
      await tx.insert(userCards).values([
        { userId: fan.id, cardId: normal.id, holo: false },
        { userId: fan.id, cardId: holo.id, holo: true },
        { userId: fan.id, cardId: holo.id, holo: false },
      ]);
      const album = await activateAlbum(tx, fan.id, "Fan");
      expect(await publicCardImageKey(tx, album.slug, normal.id)).toBe(normal.keyPublic);
      expect(await publicCardImageKey(tx, album.slug, holo.id)).toBe(holo.keyHoloPublic);
    });
  });
});
