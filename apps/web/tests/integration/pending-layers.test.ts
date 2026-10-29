// Spec 018, RF-18 a RF-20: en una colección 18+ publicada, los cambios de capas quedan pendientes de revisión.
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { cards, sets } from "@/db/schema";
import { reviewCard } from "@/server/services/cards";
import { discardPendingLayers, saveCardLayers } from "@/server/services/card-layers";
import { stageLayerImage } from "@/server/cards/layer-images";
import { inRollback } from "./db";
import { createPublishedSet, makeAdmin } from "./factories";
import { MIME, testImage } from "./images";
import { tempStore } from "./store";

type Tx = Parameters<Parameters<typeof inRollback>[0]>[0];

async function setup(tx: Tx) {
  const admin = await makeAdmin(tx);
  const store = tempStore();
  const { set, cards: list } = await createPublishedSet(tx, admin.id, { code: "PEN1", rarities: ["common", "rare"], slots: [{ common: 100 }, { rare: 100 }], isAdult: true, store });
  const card = list[0];
  const load = async () => (await tx.select().from(cards).where(eq(cards.id, card.id)))[0];
  const extra = async (hue: number) => (await stageLayerImage(store, { body: await testImage({ width: 1400, height: 1982, hue }), mime: MIME.png, filename: `${hue}.png` }, "layer")).key;
  const withExtra = async (hue: number) => ({ ...card.layers!, capas: [...card.layers!.capas, { key: await extra(hue), rol: "extra" }] });
  return { admin, set, store, card, load, withExtra };
}

describe("spec 018 — cambios de capas pendientes en 18+ publicadas", () => {
  it("test_s018_rf18_el_cambio_queda_pendiente_y_lo_vigente_no_cambia", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card, load, withExtra } = await setup(tx);
      await saveCardLayers(tx, store, admin.id, card.id, { config: await withExtra(40), expectedVersion: card.version });
      const after = await load();
      expect(after.layers).toEqual(card.layers);
      expect(after.keyFull).toBe(card.keyFull);
      expect(after.layersPending?.capas).toHaveLength(card.layers!.capas.length + 1);
      expect(await store.get(after.pendingKeys!.full)).not.toBeNull();
      expect(after.adultReviewedAt).not.toBeNull();
    });
  });

  it("test_s018_rf18_varios_cambios_seguidos_dejan_pendiente_solo_el_ultimo", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card, load, withExtra } = await setup(tx);
      await saveCardLayers(tx, store, admin.id, card.id, { config: await withExtra(40), expectedVersion: card.version });
      const first = await load();
      await saveCardLayers(tx, store, admin.id, card.id, { config: await withExtra(90), expectedVersion: first.version });
      const second = await load();
      expect(second.pendingKeys!.full).not.toBe(first.pendingKeys!.full);
      expect(await store.get(first.pendingKeys!.full)).toBeNull();
    });
  });

  it("test_s018_rf19_aprobar_pasa_lo_pendiente_a_vigente", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card, load, withExtra } = await setup(tx);
      await saveCardLayers(tx, store, admin.id, card.id, { config: await withExtra(40), expectedVersion: card.version });
      const pending = await load();
      await reviewCard(tx, store, admin.id, card.id, pending.version, true);
      const approved = await load();
      expect(approved.layers).toEqual(pending.layersPending);
      expect(approved.keyFull).toBe(pending.pendingKeys!.full);
      expect(approved.layersPending).toBeNull();
      expect(approved.pendingKeys).toBeNull();
      expect(await store.get(card.keyFull!)).toBeNull();
    });
  });

  it("test_s018_rf20_descartar_quita_lo_pendiente_y_la_carta_sigue_como_estaba", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card, load, withExtra } = await setup(tx);
      await saveCardLayers(tx, store, admin.id, card.id, { config: await withExtra(40), expectedVersion: card.version });
      const pending = await load();
      await discardPendingLayers(tx, store, admin.id, card.id, { expectedVersion: pending.version });
      const after = await load();
      expect(after.layersPending).toBeNull();
      expect(after.layers).toEqual(card.layers);
      expect(after.keyFull).toBe(card.keyFull);
      expect(await store.get(pending.pendingKeys!.full)).toBeNull();
    });
  });

  it("test_s018_rf18_en_una_18_en_borrador_el_cambio_se_guarda_al_momento", async () => {
    await inRollback(async (tx) => {
      const { admin, set, store, card, load, withExtra } = await setup(tx);
      await tx.update(sets).set({ status: "draft" }).where(eq(sets.id, set.id));
      await saveCardLayers(tx, store, admin.id, card.id, { config: await withExtra(40), expectedVersion: card.version });
      const after = await load();
      expect(after.layersPending).toBeNull();
      expect(after.layers?.capas).toHaveLength(card.layers!.capas.length + 1);
    });
  });
});
