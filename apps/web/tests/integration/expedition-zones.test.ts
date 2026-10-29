// Spec 020: Expediciones en el panel (terreno y rol, zonas, botín, simulador) y probabilidades públicas.
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { auditLog, characters } from "@/db/schema";
import { defaultZoneLoot } from "@/domain/expeditions/rules";
import { createCharacter, listCharacters, updateCharacter } from "@/server/services/characters";
import { listZones, publicZoneOdds, saveZone, simulateZone, uploadZoneImage, zoneImageFile } from "@/server/services/expedition-zones";
import { inRollback } from "./db";
import { makeAdmin } from "./factories";
import { MIME, testImage } from "./images";
import { tempStore } from "./store";

const base = { name: "Puerto Miel", terrain: "city" as const, difficulty: 30, fragmentsRequired: 0, sortOrder: 1, active: true, loot: defaultZoneLoot(30) };

describe("spec 020 — panel", () => {
  it("test_s020_rf27_el_administrador_asigna_terreno_y_rol_a_cada_personaje", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const c = await createCharacter(tx, admin.id, { name: "Lumi" });
      await updateCharacter(tx, admin.id, c.id, { terrain: "forest", role: "cartographer" });
      expect((await listCharacters(tx)).find((x) => x.id === c.id)).toMatchObject({ terrain: "forest", role: "cartographer" });
      // Cambiar el nombre no borra el terreno ni el rol.
      await updateCharacter(tx, admin.id, c.id, { name: "Lumi B" });
      const [row] = await tx.select().from(characters).where(eq(characters.id, c.id));
      expect(row).toMatchObject({ terrain: "forest", role: "cartographer" });
      await updateCharacter(tx, admin.id, c.id, { terrain: null, role: null });
      expect((await tx.select().from(characters).where(eq(characters.id, c.id)))[0]).toMatchObject({ terrain: null, role: null });
      await expect(updateCharacter(tx, admin.id, c.id, { terrain: "space" as never })).rejects.toMatchObject({ code: "invalid_terrain" });
    });
  });

  it("test_s020_rf28_crea_y_edita_zonas_con_sus_datos_y_queda_en_el_historial", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const z = await saveZone(tx, admin.id, base);
      await saveZone(tx, admin.id, { ...base, id: z.id, name: "Ruinas", terrain: "ruins", difficulty: 80, fragmentsRequired: 10, sortOrder: 3, active: false });
      expect((await listZones(tx)).map((x) => [x.name, x.terrain, x.difficulty, x.fragmentsRequired, x.sortOrder, x.active])).toEqual([["Ruinas", "ruins", 80, 10, 3, false]]);
      const audit = await tx.select().from(auditLog).where(eq(auditLog.entityId, z.id));
      expect(audit.map((a) => a.action).sort()).toEqual(["expedition_zone_create", "expedition_zone_update"]);
      for (const [patch, field] of [
        [{ name: " " }, "name"],
        [{ difficulty: 0 }, "difficulty"],
        [{ fragmentsRequired: -1 }, "fragments"],
        [{ sortOrder: 100 }, "order"],
        [{ terrain: "space" }, "terrain"],
      ] as const) {
        await expect(saveZone(tx, admin.id, { ...base, ...(patch as object) })).rejects.toMatchObject({ code: "invalid_zone", params: { field } });
      }
    });
  });

  it("test_s020_rf28_la_imagen_de_la_zona_se_guarda_y_se_sirve", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const store = tempStore();
      const z = await saveZone(tx, admin.id, base);
      await uploadZoneImage(tx, store, admin.id, z.id, { body: await testImage({ hue: 120 }), mime: MIME.png, filename: "zona.png" });
      const file = await zoneImageFile(tx, store, z.id);
      expect(file?.contentType).toBe("image/webp");
    });
  });

  it("test_s020_rf29_fija_el_botin_por_duracion_y_valida_sus_limites", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const loot = { "30": { cookies: 7, fragments: 1, packChance: 0.005 }, "120": { cookies: 21, fragments: 2, packChance: 0.02 }, "480": { cookies: 64, fragments: 5, packChance: 0.06 } };
      const z = await saveZone(tx, admin.id, { ...base, loot });
      expect(z.loot).toEqual(loot);
      await expect(saveZone(tx, admin.id, { ...base, loot: { ...loot, "120": { cookies: 21, fragments: 2, packChance: 1.5 } } })).rejects.toMatchObject({ code: "invalid_zone", params: { field: "loot" } });
      await expect(saveZone(tx, admin.id, { ...base, loot: { ...loot, "30": { cookies: -1, fragments: 1, packChance: 0 } } })).rejects.toMatchObject({ code: "invalid_zone", params: { field: "loot" } });
    });
  });

  it("test_s020_rf30_el_simulador_usa_la_zona_guardada", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const z = await saveZone(tx, admin.id, base);
      const r = await simulateZone(tx, z.id, [{ rarity: "ex", holo: false, terrain: "city", role: null, bondLevel: 1 }], 120, { runs: 2000, seed: 3 });
      expect(r.rating).toBe("good");
      expect(r.expeditionsPerDay).toBe(24);
      await expect(simulateZone(tx, z.id, [], 120)).rejects.toMatchObject({ code: "invalid_team" });
    });
  });

  it("test_s020_rf26_las_probabilidades_publicas_traen_cada_zona_activa_y_duracion", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      await saveZone(tx, admin.id, base);
      await saveZone(tx, admin.id, { ...base, name: "Oculta", active: false });
      const odds = await publicZoneOdds(tx);
      expect(odds.map((o) => o.name)).toEqual(["Puerto Miel"]);
      expect(odds[0].chances).toEqual([
        { duration: 30, packChance: base.loot["30"].packChance },
        { duration: 120, packChance: base.loot["120"].packChance },
        { duration: 480, packChance: base.loot["480"].packChance },
      ]);
    });
  });
});
