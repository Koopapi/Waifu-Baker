// Spec 010, RF-12: la base de datos de la demo.
import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { albums, cards, characters, packs, sets, userRewards, users } from "@/db/schema";
import { parseDemoManifest } from "@/domain/demo/manifest";
import { DEMO_BANNED_NAMES, demoCollectorCards, seedDemo } from "@/server/services/demo-seed";
import { inRollback } from "./db";
import { testImage } from "./images";
import { tempStore } from "./store";

const NOW = new Date("2026-10-16T12:00:00Z");
const rarities = ["common", "common", "uncommon", "rare", "epic", "legendary"] as const;
const manifest = parseDemoManifest(
  {
    code: "FA01",
    name: "Fan Art · Vol. 1",
    cards: rarities.map((rarity, i) => ({ file: `output/t/${i}.png`, character: i < 3 ? "Mira Vance" : "Kira Steel", title: `Pose ${i}`, rarity })),
  },
  DEMO_BANNED_NAMES,
);
const readImage = async (file: string) => testImage({ hue: Number(file.match(/(\d+)\.png$/)![1]) * 50 });

// Cada siembra compone las cartas con sharp: en los ejecutores de GitHub tarda bastante más que en un Mac.
const SLOW = 90_000;

describe("demo", () => {
  it("test_s010_rf12_crea_la_coleccion_publicada_con_sus_personajes_y_los_dos_usuarios", async () => {
    await inRollback(async (tx) => {
      const r = await seedDemo(tx, tempStore(), { manifest, readImage, now: NOW });
      const [set] = await tx.select().from(sets).where(eq(sets.id, r.setId));
      expect(set).toMatchObject({ code: "FA01", status: "published", isAdult: false, isWelcome: true });
      const list = await tx.select({ name: cards.name, rarity: cards.rarity, ch: characters.name }).from(cards).innerJoin(characters, eq(characters.id, cards.characterId)).where(eq(cards.setId, r.setId));
      expect(list).toHaveLength(6);
      expect(new Set(list.map((c) => c.ch))).toEqual(new Set(["Mira Vance", "Kira Steel"]));
      const [admin] = await tx.select().from(users).where(eq(users.id, r.adminId));
      expect(admin.role).toBe("admin");
    });
  }, SLOW);

  it("test_s010_rf12_el_coleccionista_tiene_cartas_sobres_galletas_racha_y_album", async () => {
    await inRollback(async (tx) => {
      const r = await seedDemo(tx, tempStore(), { manifest, readImage, now: NOW });
      expect((await demoCollectorCards(tx, r.collectorId)).reduce((a, c) => a + c.qty, 0)).toBe(20);
      expect(await tx.select().from(packs).where(and(eq(packs.userId, r.collectorId), eq(packs.status, "sealed")))).toHaveLength(3);
      const [rw] = await tx.select().from(userRewards).where(eq(userRewards.userId, r.collectorId));
      expect(rw).toMatchObject({ cookies: 240, streakDay: 3, lastDailyDay: "2026-10-15" });
      const [album] = await tx.select().from(albums).where(eq(albums.userId, r.collectorId));
      expect(album.isPublic).toBe(true);
      expect(album.featuredCardIds).toHaveLength(3);
    });
  }, SLOW);

  it("test_s010_rf12_dos_ejecuciones_dan_las_mismas_cartas", async () => {
    const run = () =>
      inRollback(async (tx) => {
        const r = await seedDemo(tx, tempStore(), { manifest, readImage, now: NOW });
        return demoCollectorCards(tx, r.collectorId);
      });
    expect(await run()).toEqual(await run());
  }, SLOW);
});
