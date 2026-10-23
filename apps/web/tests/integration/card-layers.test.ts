// Spec 016, entrega 1: subir capas, guardar la configuración, conflicto, quitar capas y auditoría.
import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { auditLog, cards } from "@/db/schema";
import { createSet } from "@/server/services/collections";
import { bulkUpdateCards, updateCard, uploadCardImage } from "@/server/services/cards";
import { getCardLayers, removeCardLayers, saveCardLayers } from "@/server/services/card-layers";
import { stageLayerImage } from "@/server/cards/layer-images";
import { inRollback } from "./db";
import { createPublishedSet, makeAdmin } from "./factories";
import { MIME, testImage } from "./images";
import { tempStore } from "./store";

type Tx = Parameters<Parameters<typeof inRollback>[0]>[0];

async function setup(tx: Tx) {
  const admin = await makeAdmin(tx);
  const set = await createSet(tx, admin.id, { code: "LAY1", name: "Capas", isAdult: false });
  const store = tempStore();
  const card = await uploadCardImage(tx, store, admin.id, set.id, { body: await testImage(), mime: MIME.png, filename: "base.png" });
  const stage = async (hue: number, size = { width: 1400, height: 1982 }) =>
    (await stageLayerImage(store, { body: await testImage({ ...size, hue }), mime: MIME.png, filename: `${hue}.png` }, "layer")).key;
  const load = async () => (await tx.select().from(cards).where(eq(cards.id, card.id)))[0];
  return { admin, set, store, card, stage, load };
}

const config = (keys: string[], extra: Record<string, unknown> = {}) => ({ capas: keys.map((key, i) => ({ key, profundidad: i * 0.4 })), marco: "sr", sello: null, ...extra });

describe("spec 016 — subir capas", () => {
  it("test_s016_rf19_acepta_png_jpeg_y_webp_y_rf21_guarda_webp", async () => {
    const store = tempStore();
    for (const format of ["png", "jpeg", "webp"] as const) {
      const staged = await stageLayerImage(store, { body: await testImage({ width: 1400, height: 1982, format }), mime: MIME[format], filename: `a.${format}` }, "layer");
      expect(staged.key).toMatch(/^tmp\/layers\/[0-9a-f-]{36}\.webp$/);
      expect((await store.get(staged.key))?.contentType).toBe("image/webp");
    }
  });

  it("test_s016_rf19_formato_no_admitido_o_mas_de_20_mb_se_rechaza_con_motivo", async () => {
    const store = tempStore();
    await expect(stageLayerImage(store, { body: await testImage({ format: "gif" }), mime: MIME.gif, filename: "a.gif" }, "layer")).rejects.toMatchObject({ code: "unsupported_type" });
    await expect(stageLayerImage(store, { body: Buffer.alloc(21 * 1024 * 1024), mime: MIME.png, filename: "big.png" }, "layer")).rejects.toMatchObject({ code: "too_large" });
  });

  it("test_s016_rf20_ancho_minimo_y_proporcion_del_lienzo", async () => {
    const store = tempStore();
    await expect(stageLayerImage(store, { body: await testImage({ width: 600, height: 849 }), mime: MIME.png, filename: "a.png" }, "layer")).rejects.toMatchObject({ code: "layer_too_narrow" });
    await expect(stageLayerImage(store, { body: await testImage({ width: 1500, height: 2100 }), mime: MIME.png, filename: "a.png" }, "layer")).rejects.toMatchObject({
      code: "layer_ratio",
      params: { expected: "1400 × 1982" },
    });
  });

  it("test_s016_rf20_misma_proporcion_con_otro_tamano_se_escala_al_lienzo", async () => {
    const store = tempStore();
    const staged = await stageLayerImage(store, { body: await testImage({ width: 700, height: 991 }), mime: MIME.png, filename: "a.png" }, "layer");
    expect(staged).toMatchObject({ width: 1400, height: 1982, scaled: true });
  });

  it("test_s016_rf23_el_sello_no_necesita_la_proporcion_del_lienzo", async () => {
    const store = tempStore();
    const staged = await stageLayerImage(store, { body: await testImage({ width: 900, height: 300 }), mime: MIME.png, filename: "sello.png" }, "seal");
    expect(staged).toMatchObject({ width: 600, height: 200 });
  });
});

describe("spec 016 — guardar capas", () => {
  it("test_s016_rf12_guarda_la_configuracion_y_la_carta_pasa_a_tener_capas", async () => {
    await inRollback(async (tx) => {
      const { admin, set, store, card, stage, load } = await setup(tx);
      const [a, b] = [await stage(10), await stage(120)];
      const r = await saveCardLayers(tx, store, admin.id, card.id, { config: config([a, b]), expectedVersion: card.version });
      const saved = await load();
      expect(saved.layers?.capas).toHaveLength(2);
      // Las imágenes pasan del área temporal a la colección, con su huella en la clave.
      for (const l of saved.layers!.capas as { key: string }[]) {
        expect(l.key).toMatch(new RegExp(`^sets/${set.id}/layers/[0-9a-f]{64}\\.webp$`));
        expect(await store.get(l.key)).not.toBeNull();
      }
      expect(await store.get(a)).toBeNull();
      expect(r.card.version).toBe(card.version + 1);
    });
  });

  it("test_s016_rf13_sin_ninguna_capa_visible_no_guarda", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card, stage } = await setup(tx);
      const a = await stage(10);
      await expect(
        saveCardLayers(tx, store, admin.id, card.id, { config: { capas: [{ key: a, visible: false }], marco: "n", sello: null }, expectedVersion: card.version }),
      ).rejects.toMatchObject({ code: "no_visible_layer" });
    });
  });

  it("test_s016_rf17_si_otro_guardo_antes_avisa_del_conflicto", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card, stage } = await setup(tx);
      await saveCardLayers(tx, store, admin.id, card.id, { config: config([await stage(10)]), expectedVersion: card.version });
      await expect(saveCardLayers(tx, store, admin.id, card.id, { config: config([await stage(20)]), expectedVersion: card.version })).rejects.toMatchObject({ code: "stale_version" });
    });
  });

  it("test_s016_rf18_recargar_devuelve_lo_guardado_y_su_version", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card, stage } = await setup(tx);
      const r = await saveCardLayers(tx, store, admin.id, card.id, { config: config([await stage(10)]), expectedVersion: card.version });
      expect(await getCardLayers(tx, card.id)).toMatchObject({ version: r.card.version, hasOriginal: true, layers: r.card.layers });
    });
  });

  it("test_s016_rf18_forzar_guarda_encima_y_queda_marcado_en_la_auditoria", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card, stage, load } = await setup(tx);
      await saveCardLayers(tx, store, admin.id, card.id, { config: config([await stage(10)]), expectedVersion: card.version });
      await saveCardLayers(tx, store, admin.id, card.id, { config: config([await stage(20), await stage(30)]), expectedVersion: card.version, force: true });
      expect((await load()).layers?.capas).toHaveLength(2);
      const [last] = await tx.select().from(auditLog).where(and(eq(auditLog.entityId, card.id), eq(auditLog.action, "card_layers_update")));
      expect(last.meta).toMatchObject({ forced: true });
    });
  });

  it("test_s016_rf2_cada_cambio_queda_en_la_auditoria_con_valores_anteriores_y_nuevos", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card, stage } = await setup(tx);
      const r = await saveCardLayers(tx, store, admin.id, card.id, { config: config([await stage(10)]), expectedVersion: card.version });
      const [row] = await tx.select().from(auditLog).where(and(eq(auditLog.entityId, card.id), eq(auditLog.action, "card_layers_add")));
      expect(row).toMatchObject({ actorUserId: admin.id, before: { layers: null }, after: { layers: r.card.layers } });
    });
  });

  it("test_s016_rf24_la_misma_imagen_dos_veces_se_guarda_con_aviso_y_una_sola_copia", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card, stage } = await setup(tx);
      const a = await stage(10);
      const r = await saveCardLayers(tx, store, admin.id, card.id, { config: config([a, a]), expectedVersion: card.version });
      const keys = (r.card.layers!.capas as { key: string }[]).map((l) => l.key);
      expect(keys[0]).toBe(keys[1]);
      expect(r.repeated).toEqual([keys[0]]);
    });
  });

  it("test_s016_libera_las_imagenes_que_ya_no_usa_ninguna_carta", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card, stage } = await setup(tx);
      const r1 = await saveCardLayers(tx, store, admin.id, card.id, { config: config([await stage(10)]), expectedVersion: card.version });
      const old = (r1.card.layers!.capas[0] as { key: string }).key;
      await saveCardLayers(tx, store, admin.id, card.id, { config: config([await stage(200)]), expectedVersion: r1.card.version });
      expect(await store.get(old)).toBeNull();
    });
  });
});

describe("spec 016 — quitar capas", () => {
  it("test_s016_rf14_una_carta_con_imagen_original_puede_quedarse_sin_capas", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card, stage, load } = await setup(tx);
      const r = await saveCardLayers(tx, store, admin.id, card.id, { config: config([await stage(10)]), expectedVersion: card.version });
      await removeCardLayers(tx, store, admin.id, card.id, { expectedVersion: r.card.version });
      const after = await load();
      expect(after.layers).toBeNull();
      expect(after.keyFull).toBe(card.keyFull);
    });
  });

  it("test_s016_rf14_una_carta_sin_imagen_original_no_puede_quedarse_sin_capas", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card, stage } = await setup(tx);
      const r = await saveCardLayers(tx, store, admin.id, card.id, { config: config([await stage(10)]), expectedVersion: card.version });
      await tx.update(cards).set({ originalKey: null }).where(eq(cards.id, card.id));
      await expect(removeCardLayers(tx, store, admin.id, card.id, { expectedVersion: r.card.version })).rejects.toMatchObject({ code: "layers_required" });
    });
  });
});

describe("spec 016 — la carta conserva sus datos, colecciones publicadas y cambio de rareza", () => {
  it("test_s016_rf15_guardar_capas_no_toca_el_numero_el_nombre_la_rareza_ni_la_coleccion", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card, stage, load } = await setup(tx);
      const before = await load();
      await saveCardLayers(tx, store, admin.id, card.id, { config: config([await stage(30)]), expectedVersion: card.version });
      const after = await load();
      expect({ number: after.number, name: after.name, rarity: after.rarity, setId: after.setId }).toEqual({
        number: before.number,
        name: before.name,
        rarity: before.rarity,
        setId: before.setId,
      });
    });
  });

  it("test_s016_rf16_en_una_coleccion_publicada_tambien_se_editan_las_capas", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const store = tempStore();
      const { cards: published } = await createPublishedSet(tx, admin.id, { code: "LAYP", rarities: ["common", "rare"], slots: [{ common: 100 }, { rare: 100 }], store });
      const staged = (await stageLayerImage(store, { body: await testImage({ width: 1400, height: 1982, hue: 50 }), mime: MIME.png, filename: "p.png" }, "layer")).key;
      const r = await saveCardLayers(tx, store, admin.id, published[0].id, { config: config([staged]), expectedVersion: published[0].version });
      expect(r.card.layers?.capas).toHaveLength(1);
    });
  });

  it("test_s016_rf25_al_cambiar_la_rareza_el_marco_y_el_sello_de_texto_siguen_al_escalon", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card, stage, load } = await setup(tx);
      const r = await saveCardLayers(tx, store, admin.id, card.id, {
        config: config([await stage(70)], { marco: "r", sello: { texto: "R", estilo: "plata", esquina: "inf-izq" } }),
        expectedVersion: card.version,
      });
      const updated = await updateCard(tx, store, admin.id, card.id, r.card.version, { rarity: "legendary" });
      expect(updated.layersSealToReview).toBe(false);
      const saved = await load();
      expect(saved.layers?.marco).toBe("ssr");
      expect(saved.layers?.sello).toMatchObject({ texto: "SSR", esquina: "inf-izq" });
    });
  });

  it("test_s016_rf25_con_sello_de_imagen_se_mantiene_y_avisa_tambien_en_lote", async () => {
    await inRollback(async (tx) => {
      const { admin, set, store, card, stage, load } = await setup(tx);
      const seal = (await stageLayerImage(store, { body: await testImage({ width: 400, height: 400, hue: 200 }), mime: MIME.png, filename: "s.png" }, "seal")).key;
      const r = await saveCardLayers(tx, store, admin.id, card.id, {
        config: config([await stage(90)], { marco: "n", sello: { key: seal, esquina: "sup-der" } }),
        expectedVersion: card.version,
      });
      const sealKey = ((await load()).layers?.sello as { key: string }).key;
      const out = await bulkUpdateCards(tx, store, admin.id, set.id, { [card.id]: r.card.version }, { rarity: "secret" });
      expect(out).toEqual({ updated: 1, layersSealsToReview: 1 });
      const saved = await load();
      expect(saved.layers?.marco).toBe("ur");
      expect(saved.layers?.sello).toEqual({ key: sealKey, esquina: "sup-der" });
    });
  });
});
