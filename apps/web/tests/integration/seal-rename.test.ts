// Spec 038, RF-7 a RF-11: los sellos de las cartas ya armadas pasan a los nombres nuevos de rareza al arrancar.
import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { cards, cardVersions } from "@/db/schema";
import { FLAT_VERSION } from "@/domain/cards/flat-version";
import type { LayersConfig } from "@/domain/cards/layers";
import { regenerateOutdated } from "@/server/services/flat-regen";
import { renameRaritySeals } from "@/server/services/seal-rename";
import { inRollback } from "./db";
import { createPublishedSet, makeAdmin } from "./factories";
import { tempStore } from "./store";

type Tx = Parameters<Parameters<typeof inRollback>[0]>[0];

const withSeal = (c: LayersConfig, texto: string): LayersConfig => ({ ...c, sello: { texto, estilo: "oro", esquina: "sup-izq" } });

async function world(tx: Tx, isAdult = false) {
  const admin = await makeAdmin(tx);
  const store = tempStore();
  const { cards: list } = await createPublishedSet(tx, admin.id, { code: "SEL1", rarities: ["epic", "legendary", "epic"], slots: [{ epic: 100 }, { legendary: 100 }], store, isAdult });
  const load = async (id: string) => (await tx.select().from(cards).where(eq(cards.id, id)))[0];
  const [epic, legendary, handmade] = await Promise.all(list.map((c) => load(c.id)));
  // Como quedaron antes de la spec: E y LEG; la tercera, con un sello escrito a mano.
  await tx.update(cards).set({ layers: withSeal(epic.layers!, "E") }).where(eq(cards.id, epic.id));
  await tx.update(cards).set({ layers: withSeal(legendary.layers!, "LEG") }).where(eq(cards.id, legendary.id));
  await tx.update(cards).set({ layers: withSeal(handmade.layers!, "SR") }).where(eq(cards.id, handmade.id));
  return { store, epic, legendary, handmade, load };
}

describe("spec 038 — sellos de las cartas ya armadas", () => {
  it("test_s038_rf7_rf8_al_arrancar_e_pasa_a_ur_y_leg_a_ssr_y_lo_escrito_a_mano_no_cambia", async () => {
    await inRollback(async (tx) => {
      const { epic, legendary, handmade, load } = await world(tx);
      expect(await renameRaritySeals(tx)).toBe(2);
      expect((await load(epic.id)).layers?.sello).toMatchObject({ texto: "UR" });
      expect((await load(legendary.id)).layers?.sello).toMatchObject({ texto: "SSR" });
      expect((await load(handmade.id)).layers?.sello).toMatchObject({ texto: "SR" });
      // Idempotente.
      expect(await renameRaritySeals(tx)).toBe(0);
    });
  });

  it("test_s038_rf9_las_cartas_renombradas_se_regeneran_con_el_sello_nuevo", async () => {
    await inRollback(async (tx) => {
      const { store, epic, handmade, load } = await world(tx);
      await tx.update(cards).set({ flatVersion: FLAT_VERSION });
      await renameRaritySeals(tx);
      expect((await load(epic.id)).flatVersion).toBe(0);
      // La del sello a mano no necesita regenerarse.
      expect((await load(handmade.id)).flatVersion).toBe(FLAT_VERSION);
      await regenerateOutdated(tx, store);
      const after = await load(epic.id);
      expect(after.flatVersion).toBe(FLAT_VERSION);
      expect(after.keyThumb).not.toBe(epic.keyThumb);
    });
  });

  it("test_s038_rf10_el_cambio_queda_en_el_historial_con_su_motivo", async () => {
    await inRollback(async (tx) => {
      const { epic, load } = await world(tx);
      const before = await load(epic.id);
      await renameRaritySeals(tx);
      const after = await load(epic.id);
      expect(after.version).toBe(before.version + 1);
      const [v] = await tx.select().from(cardVersions).where(and(eq(cardVersions.cardId, epic.id), eq(cardVersions.changed, "rareza")));
      expect(v).toMatchObject({ actorUserId: null, pending: false });
      expect(v.layers?.sello).toMatchObject({ texto: "UR" });
    });
  });

  it("test_s038_rf11_lo_pendiente_de_revision_tambien_cambia_sin_pedir_otra_revision", async () => {
    await inRollback(async (tx) => {
      const { epic, load } = await world(tx, true);
      const cur = await load(epic.id);
      await tx.update(cards).set({ layersPending: withSeal(cur.layers!, "E") }).where(eq(cards.id, epic.id));
      await renameRaritySeals(tx);
      const after = await load(epic.id);
      expect(after.layers?.sello).toMatchObject({ texto: "UR" });
      expect(after.layersPending?.sello).toMatchObject({ texto: "UR" });
      expect(after.adultReviewedAt).toEqual(cur.adultReviewedAt);
    });
  });
});
