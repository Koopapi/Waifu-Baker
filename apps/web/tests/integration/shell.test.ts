// Spec 010: datos de la estructura (barra de colecciones, contadores y panel de usuario).
import { describe, expect, it } from "vitest";
import { packs, userCards, userRewards, users } from "@/db/schema";
import { shellSummary } from "@/server/services/shell";
import { upsertUserFromLogin } from "@/server/services/users";
import { eq } from "drizzle-orm";
import { inRollback } from "./db";
import { createPublishedSet, makeAdmin } from "./factories";

const NOW = new Date("2026-10-16T12:00:00Z");

describe("estructura del coleccionista", () => {
  it("test_s010_rf1_un icono por colección con cartas o sobres, con la mejor carta como portada", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const a = await createPublishedSet(tx, admin.id, { code: "SHA", rarities: ["common"], slots: [{ common: 100 }] });
      const b = await createPublishedSet(tx, admin.id, { code: "SHB", rarities: ["common", "epic", "rare"], slots: [{ common: 100 }] });
      const fan = await upsertUserFromLogin(tx, { patreonUserId: "dev:shell-fan", displayName: "Shell fan", role: "user" });
      await tx.insert(packs).values([0, 1].map((n) => ({ userId: fan.id, setId: a.set.id, source: "manual" as const, grantKey: `shell:${n}` })));
      await tx.insert(userCards).values([b.cards[0], b.cards[1]].map((c) => ({ userId: fan.id, cardId: c.id })));

      const s = await shellSummary(tx, fan.id, { now: NOW, timeZone: "UTC" });
      expect(s.collections.map((c) => [c.code, c.coverCardId])).toEqual([
        ["SHA", null],
        ["SHB", b.cards[1].id],
      ]);
      expect(s.collections[1].progress).toEqual({ owned: 2, total: 3 });
      expect(s.sealed).toBe(2);
    });
  });

  it("test_s010_rf2_contadores: galletas y recompensas listas para reclamar", async () => {
    await inRollback(async (tx) => {
      const fan = await upsertUserFromLogin(tx, { patreonUserId: "dev:shell-fan2", displayName: "Shell fan 2", role: "user" });
      // Sin fila de recompensas: tiene la carga inicial y la diaria sin reclamar.
      expect(await shellSummary(tx, fan.id, { now: NOW, timeZone: "UTC" })).toMatchObject({ cookies: 0, rewardsReady: 2, sealed: 0, collections: [] });
      await tx.insert(userRewards).values({ userId: fan.id, freeCharges: 0, freeAnchor: NOW, streakDay: 3, lastDailyDay: "2026-10-16", lastDailyAt: NOW, lastTimeZone: "UTC", cookies: 35 });
      expect(await shellSummary(tx, fan.id, { now: NOW, timeZone: "UTC" })).toMatchObject({ cookies: 35, rewardsReady: 0 });
    });
  });

  it("test_s010_rf1_una colección 18+ sin verificar sale bloqueada y sin portada", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const x = await createPublishedSet(tx, admin.id, { code: "SHX", rarities: ["rare"], slots: [{ rare: 100 }], isAdult: true });
      const fan = await upsertUserFromLogin(tx, { patreonUserId: "dev:shell-fan3", displayName: "Shell fan 3", role: "user" });
      await tx.insert(userCards).values({ userId: fan.id, cardId: x.cards[0].id });
      const s = await shellSummary(tx, fan.id, { now: NOW, timeZone: "UTC" });
      expect(s.collections).toMatchObject([{ code: "SHX", locked: true, coverCardId: null }]);
      await tx.update(users).set({ isAdultDeclared: true, adultVerifiedAt: NOW }).where(eq(users.id, fan.id));
      expect((await shellSummary(tx, fan.id, { now: NOW, timeZone: "UTC" })).collections[0]).toMatchObject({ locked: false, coverCardId: x.cards[0].id });
    });
  });
});
