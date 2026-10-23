// Spec 017: biblioteca de fondos de una colección (subir, ver, quitar, en uso) y su uso desde las cartas.
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { auditLog, cards } from "@/db/schema";
import type { ImageLayer } from "@/domain/cards/layers";
import { createSet } from "@/server/services/collections";
import { uploadCardImage } from "@/server/services/cards";
import { saveCardLayers } from "@/server/services/card-layers";
import { listSetBackgrounds, removeSetBackground, uploadSetBackground } from "@/server/services/set-backgrounds";
import { inRollback } from "./db";
import { makeAdmin } from "./factories";
import { MIME, testImage } from "./images";
import { tempStore } from "./store";

type Tx = Parameters<Parameters<typeof inRollback>[0]>[0];

async function setup(tx: Tx) {
  const admin = await makeAdmin(tx);
  const set = await createSet(tx, admin.id, { code: "FON1", name: "Fondos", isAdult: false });
  const store = tempStore();
  const bg = async (hue: number, name = `fondo-${hue}.png`, size = { width: 1400, height: 1982 }) =>
    uploadSetBackground(tx, store, admin.id, set.id, { body: await testImage({ ...size, hue }), mime: MIME.png, filename: name });
  const card = async (hue: number) => uploadCardImage(tx, store, admin.id, set.id, { body: await testImage({ hue, cutout: true }), mime: MIME.png, filename: `c${hue}.png` });
  return { admin, set, store, bg, card };
}

/** Pone a la carta el fondo dado detrás de su chica. */
async function useBackground(tx: Tx, store: ReturnType<typeof tempStore>, adminId: string, c: Awaited<ReturnType<Awaited<ReturnType<typeof setup>>["card"]>>, key: string) {
  const layers = c.layers!;
  return saveCardLayers(tx, store, adminId, c.id, { config: { ...layers, capas: [{ key, rol: "fondo" }, ...layers.capas] }, expectedVersion: c.version });
}

describe("spec 017 — biblioteca de fondos", () => {
  it("test_s017_rf6_subir_y_ver_los_fondos_de_la_coleccion", async () => {
    await inRollback(async (tx) => {
      const { set, store, bg } = await setup(tx);
      const a = await bg(10, "Atardecer.png");
      await bg(200, "noche.webp");
      expect(a.key).toMatch(new RegExp(`^sets/${set.id}/backgrounds/[0-9a-f]{64}\\.webp$`));
      expect((await store.get(a.key))?.contentType).toBe("image/webp");
      const list = await listSetBackgrounds(tx, set.id);
      expect(list.map((b) => [b.name, b.uses])).toEqual([["Atardecer", 0], ["noche", 0]]);
      const audit = await tx.select().from(auditLog).where(eq(auditLog.entityId, a.id));
      expect(audit.map((r) => r.action)).toEqual(["set_background_add"]);
    });
  });

  it("test_s017_rf7_los_fondos_siguen_las_reglas_de_las_capas", async () => {
    await inRollback(async (tx) => {
      const { bg } = await setup(tx);
      await expect(bg(1, "a.png", { width: 1500, height: 2100 })).rejects.toMatchObject({ code: "layer_ratio" });
      await expect(bg(1, "a.png", { width: 600, height: 849 })).rejects.toMatchObject({ code: "layer_too_narrow" });
      // La misma proporción con otro tamaño se escala al lienzo.
      const scaled = await bg(2, "b.png", { width: 700, height: 991 });
      expect(scaled).toMatchObject({ width: 1400, height: 1982 });
    });
  });

  it("test_s017_rf6_el_mismo_fondo_dos_veces_se_avisa", async () => {
    await inRollback(async (tx) => {
      const { bg } = await setup(tx);
      await bg(40, "a.png");
      await expect(bg(40, "b.png")).rejects.toMatchObject({ code: "duplicate_background", params: { name: "a" } });
    });
  });

  it("test_s017_rf8_una_carta_usa_un_fondo_de_la_biblioteca", async () => {
    await inRollback(async (tx) => {
      const { admin, store, bg, card } = await setup(tx);
      const fondo = await bg(70);
      const c = await card(5);
      const r = await useBackground(tx, store, admin.id, c, fondo.key);
      // La clave de la biblioteca se guarda tal cual (no se copia a las capas de la carta).
      expect((r.card.layers!.capas[0] as ImageLayer).key).toBe(fondo.key);
    });
  });

  it("test_s017_rf9_un_fondo_en_uso_no_se_quita_y_dice_cuantas_cartas_lo_usan", async () => {
    await inRollback(async (tx) => {
      const { admin, set, store, bg, card } = await setup(tx);
      const fondo = await bg(90);
      for (const hue of [11, 22]) await useBackground(tx, store, admin.id, await card(hue), fondo.key);
      expect((await listSetBackgrounds(tx, set.id))[0].uses).toBe(2);
      await expect(removeSetBackground(tx, store, admin.id, set.id, fondo.id)).rejects.toMatchObject({ code: "background_in_use", params: { count: 2 } });
      expect(await store.get(fondo.key)).not.toBeNull();
    });
  });

  it("test_s017_rf6_quitar_un_fondo_sin_usar_borra_su_imagen", async () => {
    await inRollback(async (tx) => {
      const { admin, set, store, bg } = await setup(tx);
      const fondo = await bg(120);
      await removeSetBackground(tx, store, admin.id, set.id, fondo.id);
      expect(await listSetBackgrounds(tx, set.id)).toEqual([]);
      expect(await store.get(fondo.key)).toBeNull();
    });
  });

  it("test_s017_rf9_dejar_de_usar_un_fondo_no_borra_la_imagen_de_la_biblioteca", async () => {
    await inRollback(async (tx) => {
      const { admin, store, bg, card } = await setup(tx);
      const fondo = await bg(150);
      const r = await useBackground(tx, store, admin.id, await card(33), fondo.key);
      const sinFondo = { ...r.card.layers!, capas: r.card.layers!.capas.slice(1) };
      await saveCardLayers(tx, store, admin.id, r.card.id, { config: sinFondo, expectedVersion: r.card.version });
      expect(await store.get(fondo.key)).not.toBeNull();
    });
  });

  it("test_s017_rf8_no_se_puede_usar_un_fondo_de_otra_coleccion", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card } = await setup(tx);
      const other = await createSet(tx, admin.id, { code: "FON2", name: "Otra", isAdult: false });
      const ajeno = await uploadSetBackground(tx, store, admin.id, other.id, { body: await testImage({ width: 1400, height: 1982, hue: 5 }), mime: MIME.png, filename: "x.png" });
      await expect(useBackground(tx, store, admin.id, await card(44), ajeno.key)).rejects.toMatchObject({ code: "invalid_layers" });
      expect(await tx.select().from(cards).where(eq(cards.setId, other.id))).toHaveLength(0);
    });
  });
});
