// Siembra de datos de desarrollo y E2E (`/api/dev/seed`): mismos servicios que el panel.
import { describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
import { cards, packs, sets, users } from "@/db/schema";
import { seedGift, seedPublishedSet } from "@/server/services/dev-seed";
import { upsertUserFromLogin } from "@/server/services/users";
import { inRollback } from "./db";
import { makeAdmin } from "./factories";
import { MIME, testImage } from "./images";
import { tempStore } from "./store";

type Tx = Parameters<Parameters<typeof inRollback>[0]>[0];

async function seedSet(tx: Tx, adminId: string, isAdult = false) {
  const store = tempStore();
  const files = await Promise.all([0, 1, 2, 3].map(async (i) => ({ body: await testImage({ hue: i * 90 }), mime: MIME.png, filename: `${i}.png` })));
  const setId = await seedPublishedSet(tx, store, adminId, {
    code: "SEED1",
    name: "Seed",
    characterName: "Seed character",
    packSize: 2,
    isAdult,
    // Spec 022: la legendaria hace posible la tabla gold (la de por defecto, con las rarezas que tienen cartas).
    cards: files.map((file, i) => ({ file, name: `SEED1 ${i + 1}`, rarity: (["common", "common", "rare", "legendary"] as const)[i] })),
    slots: [{ common: 100 }, { rare: 100 }],
    holoPercent: 50,
  });
  return { setId, store };
}

describe("siembra de desarrollo", () => {
  it("crea una colección publicada con cartas completas y compuestas", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const { setId, store } = await seedSet(tx, admin.id, true);
      const [set] = await tx.select().from(sets).where(eq(sets.id, setId));
      expect(set.status).toBe("published");
      const list = await tx.select().from(cards).where(eq(cards.setId, setId)).orderBy(asc(cards.number));
      expect(list.map((c) => [c.number, c.rarity, c.status])).toEqual([
        [1, "common", "ready"],
        [2, "common", "ready"],
        [3, "rare", "ready"],
        [4, "legendary", "ready"],
      ]);
      expect(list.every((c) => c.adultReviewedBy === admin.id)).toBe(true);
      expect(await store.get(list[2].keyFull!)).not.toBeNull();
    });
  });

  it("regala sobres por nombre y crea el usuario de desarrollo si no existe", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      await seedSet(tx, admin.id);
      const existing = await upsertUserFromLogin(tx, { patreonUserId: "dev:fan-seed", displayName: "fan-seed", role: "user" });
      expect(await seedGift(tx, admin.id, { userName: "fan-seed", setCode: "SEED1", count: 2, reason: "Regalo" })).toBe(existing.id);
      const createdId = await seedGift(tx, admin.id, { userName: "Nuevo Fan", setCode: "SEED1", count: 1, reason: "Regalo" });
      const [created] = await tx.select().from(users).where(eq(users.id, createdId));
      expect(created.patreonUserId).toBe("dev:nuevofan");
      expect(await tx.select().from(packs).where(eq(packs.userId, existing.id))).toHaveLength(2);
      expect(await tx.select().from(packs).where(eq(packs.userId, createdId))).toHaveLength(1);
    });
  });
});
