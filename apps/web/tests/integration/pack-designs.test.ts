// Spec 030: guardar y cargar el diseño del sobre con sus imágenes, y servirlo en el juego con enlaces firmados.
import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import sharp from "sharp";
import { auditLog, packDesigns, users } from "@/db/schema";
import { emptyDesign, isPackDesignKey, isPackThumbKey, type PackDesign, type PackImageLayer } from "@/domain/packs/design";
import { checkAdminAccess } from "@/server/services/admin-guard";
import { getPackDesign, packViewFor, packViewsFor, savePackDesign, servePackAsset } from "@/server/services/pack-designs";
import { upsertUserFromLogin } from "@/server/services/users";
import { inRollback } from "./db";
import { createPublishedSet, makeAdmin } from "./factories";
import { MIME, testImage } from "./images";
import { tempStore } from "./store";

const ODDS = [{ common: 100 }, { legendary: 100 }];

const thumb = async () => ({ body: await testImage({ width: 500, height: 875, hue: 10 }), mime: MIME.png, filename: "miniatura.png" });
const upload = async (hue: number, w = 1000, h = 1750) => ({ body: await testImage({ width: w, height: h, hue }), mime: MIME.png, filename: `capa-${hue}.png` });

/** El FA01 del paquete de diseño con sus tres capas nuevas (marcas `upload:`), partículas, insignia y patrón incluido. */
function fa01(): PackDesign {
  return {
    ...emptyDesign("silver"),
    capas: [
      { key: "upload:fondo", nombre: "sobre_fa01_fondo.webp", profundidad: 0.25, margen: 3 },
      { particulas: "destellos-arcoiris", cantidad: 18, tamano: 0.9, semilla: 41, profundidad: 0.6, margen: 4 },
      { key: "upload:chica", nombre: "sobre_fa01_personaje.webp", profundidad: 1, margen: 2 },
      { key: "upload:efecto", nombre: "sobre_fa01_efecto.webp", profundidad: 1.3, margen: 3, mezcla: "overlay" },
    ],
    sellos: { arriba: "#FF3EA5", abajo: "#C6F432", patron: { incluido: "liquido" }, patronTamano: 40 },
    insignia: { texto: "Edición especial", color: "#C6F432" },
  };
}

async function uploads() {
  return new Map([
    ["upload:fondo", await upload(20)],
    ["upload:chica", await upload(140)],
    ["upload:efecto", await upload(260)],
  ]);
}

describe("spec 030 — guardar el diseño del sobre", () => {
  it("test_s030_rf10_rf11_se_guarda_con_sus_imagenes_y_miniatura_y_se_vuelve_a_cargar", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const store = tempStore();
      const { set } = await createPublishedSet(tx, admin.id, { code: "SB1", rarities: ["common", "legendary"], slots: ODDS, store });
      const row = await savePackDesign(tx, store, admin.id, set.id, "silver", { design: fa01(), uploads: await uploads(), thumb: await thumb() });
      expect(row.version).toBe(1);

      // RF-11: al volver, el diseño trae sus imágenes guardadas (claves del almacén propio), sin subirlas otra vez.
      const saved = (await getPackDesign(tx, set.id, "silver"))!;
      const layers = saved.design.capas.filter((l): l is PackImageLayer => "key" in l);
      expect(layers).toHaveLength(3);
      for (const l of layers) {
        expect(isPackDesignKey(set.id, l.key)).toBe(true);
        expect((await sharp((await store.get(l.key))!.body).metadata()).format).toBe("webp");
      }
      expect(layers.map((l) => l.nombre)).toEqual(["sobre_fa01_fondo.webp", "sobre_fa01_personaje.webp", "sobre_fa01_efecto.webp"]);
      expect(saved.design.insignia).toEqual({ texto: "Edición especial", color: "#C6F432" });
      // RF-10: la miniatura de 500 × 875.
      expect(isPackThumbKey(set.id, saved.thumbKey)).toBe(true);
      const meta = await sharp((await store.get(saved.thumbKey))!.body).metadata();
      expect([meta.width, meta.height]).toEqual([500, 875]);

      // Guardar otra vez sin imágenes nuevas (las claves de antes) sube la versión.
      const again = await savePackDesign(tx, store, admin.id, set.id, "silver", { design: { ...saved.design, apertura: "sticker" }, uploads: new Map(), thumb: await thumb() });
      expect(again.version).toBe(2);
      // RF-10: en la auditoría, con lo de antes y lo de después.
      const audits = await tx.select().from(auditLog).where(and(eq(auditLog.entityId, set.id), eq(auditLog.action, "set.pack_design"))).orderBy(auditLog.id);
      expect(audits).toHaveLength(2);
      expect(audits[1].before).toMatchObject({ kind: "silver", design: { apertura: "rasgar" } });
      expect(audits[1].after).toMatchObject({ kind: "silver", design: { apertura: "sticker" } });
    });
  });

  it("test_s030_rf1_cada_coleccion_tiene_un_diseno_plata_y_otro_gold", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const store = tempStore();
      const { set } = await createPublishedSet(tx, admin.id, { code: "SB2", rarities: ["common", "legendary"], slots: ODDS, store });
      await savePackDesign(tx, store, admin.id, set.id, "silver", { design: fa01(), uploads: await uploads(), thumb: await thumb() });
      await savePackDesign(tx, store, admin.id, set.id, "gold", { design: { ...fa01(), vista: "plano" }, uploads: await uploads(), thumb: await thumb() });
      const rows = await tx.select().from(packDesigns).where(eq(packDesigns.setId, set.id));
      expect(rows.map((r) => [r.kind, r.design.vista]).sort()).toEqual([["gold", "plano"], ["silver", "3d"]]);
    });
  });

  it("test_s030_rf12_un_diseno_invalido_no_se_guarda_y_dice_que_campo_falla", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const store = tempStore();
      const { set } = await createPublishedSet(tx, admin.id, { code: "SB3", rarities: ["common", "legendary"], slots: ODDS, store });
      const bad = { ...fa01(), sellos: { arriba: "red;background:url(https://evil)", abajo: "#C6F432" } };
      await expect(savePackDesign(tx, store, admin.id, set.id, "silver", { design: bad, uploads: await uploads(), thumb: await thumb() })).rejects.toMatchObject({ code: "invalid_pack_design", params: { path: "sellos.arriba" } });
      // Una ruta que no es del almacén propio.
      const foreign = { ...fa01(), capas: [{ key: "https://evil.example/a.webp" }] };
      await expect(savePackDesign(tx, store, admin.id, set.id, "silver", { design: foreign, uploads: new Map(), thumb: await thumb() })).rejects.toMatchObject({ params: { path: "capas.0.key" } });
      // Una imagen que no llegó, o una miniatura de otro tamaño.
      await expect(savePackDesign(tx, store, admin.id, set.id, "silver", { design: fa01(), uploads: new Map(), thumb: await thumb() })).rejects.toMatchObject({ code: "pack_upload_missing" });
      const wrongThumb = { body: await testImage({ width: 400, height: 700 }), mime: MIME.png, filename: "m.png" };
      await expect(savePackDesign(tx, store, admin.id, set.id, "silver", { design: fa01(), uploads: await uploads(), thumb: wrongThumb })).rejects.toMatchObject({ params: { path: "thumb" } });
      expect(await getPackDesign(tx, set.id, "silver")).toBeNull();
      expect(await store.list(`sets/${set.id}/pack-design`)).toEqual([]);
    });
  });

  it("test_s030_rf9_una_imagen_que_no_mide_1000_x_1750_se_guarda_igual", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const store = tempStore();
      const { set } = await createPublishedSet(tx, admin.id, { code: "SB4", rarities: ["common", "legendary"], slots: ODDS, store });
      const design = { ...fa01(), capas: [{ key: "upload:a", nombre: "capa-800x1200.png" }] };
      await savePackDesign(tx, store, admin.id, set.id, "silver", { design, uploads: new Map([["upload:a", await upload(50, 800, 1200)]]), thumb: await thumb() });
      const key = ((await getPackDesign(tx, set.id, "silver"))!.design.capas[0] as PackImageLayer).key;
      // Conserva sus medidas: la revisión del editor las lee al volver.
      const meta = await sharp((await store.get(key))!.body).metadata();
      expect([meta.width, meta.height]).toEqual([800, 1200]);
    });
  });

  it("test_s030_rf10_las_imagenes_que_ya_no_usa_ningun_diseno_se_borran", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const store = tempStore();
      const { set } = await createPublishedSet(tx, admin.id, { code: "SB5", rarities: ["common", "legendary"], slots: ODDS, store });
      await savePackDesign(tx, store, admin.id, set.id, "silver", { design: fa01(), uploads: await uploads(), thumb: await thumb() });
      const first = (await getPackDesign(tx, set.id, "silver"))!;
      const [fondo, , chica] = first.design.capas as PackImageLayer[];
      // El gold usa el mismo fondo: al cambiar el plata, ese fondo se queda.
      await savePackDesign(tx, store, admin.id, set.id, "gold", { design: { ...first.design, capas: [fondo] }, uploads: new Map(), thumb: await thumb() });
      await savePackDesign(tx, store, admin.id, set.id, "silver", { design: { ...first.design, capas: [{ key: "upload:n", nombre: "nuevo.png" }] }, uploads: new Map([["upload:n", await upload(300)]]), thumb: { ...(await thumb()), body: await testImage({ width: 500, height: 875, hue: 99 }) } });
      expect(await store.get(fondo.key)).not.toBeNull();
      expect(await store.get(chica.key)).toBeNull();
    });
  });

  it("test_s030_rf13_solo_los_administradores_pueden_editar_sobres", async () => {
    await inRollback(async (tx) => {
      const fan = await upsertUserFromLogin(tx, { patreonUserId: "fan-sb", displayName: "Fan", role: "user" });
      expect(await checkAdminAccess(tx, fan.id, "/api/admin/pack-designs")).toBe(false);
      expect(await checkAdminAccess(tx, null, "/admin/sets/x/pack/silver")).toBe(false);
      const admin = await makeAdmin(tx);
      expect(await checkAdminAccess(tx, admin.id, "/api/admin/pack-designs")).toBe(true);
    });
  });
});

describe("spec 030 — el sobre en el juego", () => {
  it("test_s030_rf14_rf15_con_diseno_se_ve_el_diseno_y_sin_diseno_el_basico", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const store = tempStore();
      const { set } = await createPublishedSet(tx, admin.id, { code: "SB6", rarities: ["common", "legendary"], slots: ODDS, store });
      const fan = await upsertUserFromLogin(tx, { patreonUserId: "fan-sb6", displayName: "Fan", role: "user" });
      // Sin diseño: el básico con la portada y sellos plateados (y dorados en el gold).
      const basic = (await packViewFor(tx, fan.id, set.id, "silver"))!;
      expect(basic.designed).toBe(false);
      expect(basic.thumb).toBeNull();
      expect(basic.registro.capas[0]).toMatchObject({ src: expect.stringMatching(new RegExp(`^/api/sets/${set.id}/art\\?k=cover`)) });
      expect(basic.registro.sellos.arriba).toBe("#C9CED6");
      expect((await packViewFor(tx, fan.id, set.id, "gold"))!.registro.sellos.arriba).toBe("#F5C451");
      // RF-8: nombre, código y cartas de la colección.
      expect([basic.registro.nombre, basic.registro.codigo, basic.registro.cartas]).toEqual(["SB6", "SB6", 2]);

      // Caso límite: sobres ya entregados se ven con el diseño nuevo en cuanto se guarda.
      await savePackDesign(tx, store, admin.id, set.id, "silver", { design: fa01(), uploads: await uploads(), thumb: await thumb() });
      const views = await packViewsFor(tx, fan.id, [{ setId: set.id, kind: "silver" }, { setId: set.id, kind: "gold" }]);
      const silver = views.get(`${set.id}:silver`)!;
      expect(silver.designed).toBe(true);
      expect(silver.thumb).toMatch(new RegExp(`^/api/sets/${set.id}/pack-asset\\?t=silver&k=`));
      expect(silver.registro.capas[0]).toMatchObject({ src: expect.stringContaining("/pack-asset?"), profundidad: 0.25 });
      expect(silver.registro.sellos.patron).toBe("/sobres/patrones/liquido.webp");
      expect(views.get(`${set.id}:gold`)!.designed).toBe(false);
    });
  });

  it("test_s030_rnf_las_imagenes_del_diseno_se_sirven_con_enlace_firmado_de_la_misma_sesion", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const store = tempStore();
      const { set } = await createPublishedSet(tx, admin.id, { code: "SB7", rarities: ["common", "legendary"], slots: ODDS, store });
      const fan = await upsertUserFromLogin(tx, { patreonUserId: "fan-sb7", displayName: "Fan", role: "user" });
      const other = await upsertUserFromLogin(tx, { patreonUserId: "otro-sb7", displayName: "Otro", role: "user" });
      await savePackDesign(tx, store, admin.id, set.id, "silver", { design: fa01(), uploads: await uploads(), thumb: await thumb() });
      const view = (await packViewFor(tx, fan.id, set.id, "silver"))!;
      const grant = (href: string) => {
        const u = new URL(href, "http://x");
        return { setId: set.id, kind: u.searchParams.get("t")!, key: u.searchParams.get("k")!, expires: Number(u.searchParams.get("e")), sig: u.searchParams.get("sig")! };
      };
      const g = grant(view.registro.capas[0].src as string);
      expect((await servePackAsset(tx, store, fan.id, g))?.contentType).toBe("image/webp");
      expect(await servePackAsset(tx, store, fan.id, grant(view.thumb!))).not.toBeNull();
      // Otra sesión, sin sesión, firma tocada, caducado o una clave que no es del diseño: nada.
      expect(await servePackAsset(tx, store, other.id, g)).toBeNull();
      expect(await servePackAsset(tx, store, null, g)).toBeNull();
      expect(await servePackAsset(tx, store, fan.id, { ...g, sig: "0".repeat(64) })).toBeNull();
      expect(await servePackAsset(tx, store, fan.id, g, g.expires + 1)).toBeNull();
      expect(await servePackAsset(tx, store, fan.id, { ...g, kind: "gold" })).toBeNull();
    });
  });

  it("test_s030_caso_limite_el_sobre_18_solo_se_ve_con_el_doble_filtro", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const store = tempStore();
      const { set } = await createPublishedSet(tx, admin.id, { code: "SB8", rarities: ["common", "legendary"], slots: ODDS, store, isAdult: true });
      const fan = await upsertUserFromLogin(tx, { patreonUserId: "fan-sb8", displayName: "Fan", role: "user" });
      await savePackDesign(tx, store, admin.id, set.id, "silver", { design: fa01(), uploads: await uploads(), thumb: await thumb() });
      const serve = async (userId: string) => {
        const u = new URL((await packViewFor(tx, userId, set.id, "silver"))!.thumb!, "http://x");
        return servePackAsset(tx, store, userId, { setId: set.id, kind: "silver", key: u.searchParams.get("k")!, expires: Number(u.searchParams.get("e")), sig: u.searchParams.get("sig")! });
      };
      expect(await serve(fan.id)).toBeNull();
      expect(await serve(admin.id)).not.toBeNull(); // vista previa del panel y simulador
      await tx.update(users).set({ isAdultDeclared: true }).where(eq(users.id, fan.id));
      expect(await serve(fan.id)).toBeNull();
      await tx.update(users).set({ adultVerifiedAt: new Date() }).where(eq(users.id, fan.id));
      expect(await serve(fan.id)).not.toBeNull();
    });
  });
});
