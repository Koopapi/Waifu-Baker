// Spec 017 (ampliación): biblioteca general de elementos (subir por tipo, partículas, guardar desde una carta, uso,
// renombrar y quitar) y su uso desde las cartas.
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { auditLog } from "@/db/schema";
import type { ImageLayer } from "@/domain/cards/layers";
import { createSet } from "@/server/services/collections";
import { uploadCardImage } from "@/server/services/cards";
import { saveCardLayers } from "@/server/services/card-layers";
import { stageLayerImage } from "@/server/cards/layer-images";
import { listLibrary, removeLibraryItem, renameLibraryItem, saveLibraryFromCard, saveLibraryParticles, uploadLibraryImage } from "@/server/services/library";
import { inRollback } from "./db";
import { makeAdmin } from "./factories";
import { MIME, testImage } from "./images";
import { tempStore } from "./store";

type Tx = Parameters<Parameters<typeof inRollback>[0]>[0];
const CANVAS = { width: 1400, height: 1982 };

async function setup(tx: Tx) {
  const admin = await makeAdmin(tx);
  const store = tempStore();
  const image = async (kind: "fondo" | "sello" | "adorno", hue: number, name = `${kind}-${hue}.png`, size: { width: number; height: number } = kind === "sello" ? { width: 400, height: 300 } : CANVAS) =>
    uploadLibraryImage(tx, store, admin.id, kind, { body: await testImage({ ...size, hue }), mime: MIME.png, filename: name });
  const set = async (code: string) => createSet(tx, admin.id, { code, name: code, isAdult: false });
  const card = async (setId: string, hue: number) => uploadCardImage(tx, store, admin.id, setId, { body: await testImage({ hue, cutout: true }), mime: MIME.png, filename: `c${hue}.png` });
  return { admin, store, image, set, card };
}

describe("spec 017 — biblioteca general de elementos", () => {
  it("test_s017_rf6_subir_fondos_sellos_y_adornos_y_verlos_por_tipo", async () => {
    await inRollback(async (tx) => {
      const { image } = await setup(tx);
      const f = await image("fondo", 10, "Atardecer.png");
      await image("sello", 50, "Sello SSR dorado.png");
      await image("adorno", 90, "Insignia.webp");
      expect(f.key).toMatch(/^library\/[0-9a-f]{64}\.webp$/);
      const list = await listLibrary(tx);
      expect(list.map((i) => [i.kind, i.name, i.uses])).toEqual([["fondo", "Atardecer", 0], ["sello", "Sello SSR dorado", 0], ["adorno", "Insignia", 0]]);
      const audit = await tx.select().from(auditLog).where(eq(auditLog.entityId, f.id));
      expect(audit.map((r) => r.action)).toEqual(["library_item_add"]);
    });
  });

  it("test_s017_rf7_fondos_y_adornos_con_las_reglas_del_lienzo_y_sellos_con_las_del_sello", async () => {
    await inRollback(async (tx) => {
      const { image } = await setup(tx);
      await expect(image("fondo", 1, "a.png", { width: 1500, height: 2100 })).rejects.toMatchObject({ code: "layer_ratio" });
      await expect(image("adorno", 1, "a.png", { width: 600, height: 849 })).rejects.toMatchObject({ code: "layer_too_narrow" });
      // El sello no necesita la proporción del lienzo.
      expect(await image("sello", 2, "s.png", { width: 900, height: 300 })).toMatchObject({ kind: "sello", width: 600, height: 200 });
    });
  });

  it("test_s017_rf7_la_misma_imagen_no_se_guarda_dos_veces", async () => {
    await inRollback(async (tx) => {
      const { image } = await setup(tx);
      await image("fondo", 40, "Atardecer.png");
      await expect(image("adorno", 40, "otra.png")).rejects.toMatchObject({ code: "duplicate_item", params: { name: "Atardecer" } });
    });
  });

  it("test_s017_rf8_una_carta_usa_elementos_de_la_biblioteca_sin_copiarlos", async () => {
    await inRollback(async (tx) => {
      const { admin, store, image, set, card } = await setup(tx);
      const [f, s, a] = [await image("fondo", 70), await image("sello", 20), await image("adorno", 120)];
      const c = await card((await set("LIB1")).id, 5);
      const config = { ...c.layers!, capas: [{ key: f.key, rol: "fondo" }, ...c.layers!.capas, { key: a.key, rol: "extra" }], sello: { key: s.key, esquina: "sup-izq" } };
      const r = await saveCardLayers(tx, store, admin.id, c.id, { config, expectedVersion: c.version });
      const keys = (r.card.layers!.capas as ImageLayer[]).map((l) => l.key);
      expect(keys[0]).toBe(f.key);
      expect(keys[2]).toBe(a.key);
      expect(r.card.layers!.sello).toMatchObject({ key: s.key });
    });
  });

  it("test_s017_rf9_una_imagen_en_uso_no_se_quita_y_dice_cuantas_cartas_y_colecciones", async () => {
    await inRollback(async (tx) => {
      const { admin, store, image, set, card } = await setup(tx);
      const f = await image("fondo", 90);
      for (const code of ["LIB1", "LIB2"]) {
        const c = await card((await set(code)).id, code === "LIB1" ? 11 : 22);
        await saveCardLayers(tx, store, admin.id, c.id, { config: { ...c.layers!, capas: [{ key: f.key, rol: "fondo" }, ...c.layers!.capas] }, expectedVersion: c.version });
      }
      expect((await listLibrary(tx))[0]).toMatchObject({ uses: 2, sets: ["LIB1", "LIB2"] });
      await expect(removeLibraryItem(tx, store, admin.id, f.id)).rejects.toMatchObject({ code: "item_in_use", params: { count: 2, sets: "LIB1, LIB2" } });
      expect(await store.get(f.key)).not.toBeNull();
    });
  });

  it("test_s017_rf6_quitar_y_renombrar", async () => {
    await inRollback(async (tx) => {
      const { admin, store, image } = await setup(tx);
      const f = await image("fondo", 120);
      await renameLibraryItem(tx, admin.id, f.id, "  Cielo rosa ");
      expect((await listLibrary(tx))[0].name).toBe("Cielo rosa");
      await expect(renameLibraryItem(tx, admin.id, f.id, "   ")).rejects.toMatchObject({ code: "invalid_name" });
      await removeLibraryItem(tx, store, admin.id, f.id);
      expect(await listLibrary(tx)).toEqual([]);
      expect(await store.get(f.key!)).toBeNull();
    });
  });

  it("test_s017_rf9_dejar_de_usar_una_imagen_de_la_biblioteca_no_la_borra", async () => {
    await inRollback(async (tx) => {
      const { admin, store, image, set, card } = await setup(tx);
      const f = await image("fondo", 150);
      const c = await card((await set("LIB1")).id, 33);
      const r = await saveCardLayers(tx, store, admin.id, c.id, { config: { ...c.layers!, capas: [{ key: f.key, rol: "fondo" }, ...c.layers!.capas] }, expectedVersion: c.version });
      await saveCardLayers(tx, store, admin.id, c.id, { config: { ...r.card.layers!, capas: r.card.layers!.capas.slice(1) }, expectedVersion: r.card.version });
      expect(await store.get(f.key)).not.toBeNull();
    });
  });

  it("test_s017_rf9_las_particulas_guardadas_no_tienen_uso_y_se_quitan_siempre", async () => {
    await inRollback(async (tx) => {
      const { admin, store } = await setup(tx);
      const p = await saveLibraryParticles(tx, admin.id, { name: "Lluvia de pétalos", particles: { particulas: "petalos", cantidad: 40, semilla: 3, profundidad: 0.2 } });
      expect(p).toMatchObject({ kind: "particulas", key: null, particles: { particulas: "petalos", cantidad: 40 } });
      expect(p.particles).not.toHaveProperty("semilla");
      await expect(saveLibraryParticles(tx, admin.id, { name: "mal", particles: { particulas: "no-existe" } })).rejects.toMatchObject({ code: "invalid_layers" });
      await removeLibraryItem(tx, store, admin.id, p.id);
      expect(await listLibrary(tx)).toEqual([]);
    });
  });

  it("test_s017_rf21_guardar_en_la_biblioteca_una_capa_o_el_sello_de_una_carta", async () => {
    await inRollback(async (tx) => {
      const { admin, store, set, card } = await setup(tx);
      const c = await card((await set("LIB1")).id, 44);
      // Una capa recién subida (área temporal) y otra ya guardada en la carta.
      const staged = (await stageLayerImage(store, { body: await testImage({ ...CANVAS, hue: 210 }), mime: MIME.png, filename: "brillo.png" }, "layer")).key;
      const r = await saveCardLayers(tx, store, admin.id, c.id, { config: { ...c.layers!, capas: [...c.layers!.capas, { key: staged, rol: "extra" }] }, expectedVersion: c.version });
      const saved = (r.card.layers!.capas as ImageLayer[]).find((l) => l.rol === "extra")!.key;
      const item = await saveLibraryFromCard(tx, store, admin.id, { kind: "adorno", key: saved, name: "Brillo" });
      expect(item).toMatchObject({ kind: "adorno", name: "Brillo" });
      expect(item.key).toMatch(/^library\//);
      // La carta no cambia y la imagen no se duplica.
      await expect(saveLibraryFromCard(tx, store, admin.id, { kind: "fondo", key: saved, name: "Otra vez" })).rejects.toMatchObject({ code: "duplicate_item", params: { name: "Brillo" } });
      const seal = (await stageLayerImage(store, { body: await testImage({ width: 400, height: 300, hue: 15 }), mime: MIME.png, filename: "s.png" }, "seal")).key;
      expect(await saveLibraryFromCard(tx, store, admin.id, { kind: "sello", key: seal, name: "Mi sello" })).toMatchObject({ kind: "sello" });
      // Un archivo que no es de una carta ni del área temporal no se acepta.
      await expect(saveLibraryFromCard(tx, store, admin.id, { kind: "adorno", key: "sets/x/original/y.png", name: "x" })).rejects.toMatchObject({ code: "invalid_layers" });
    });
  });
});
