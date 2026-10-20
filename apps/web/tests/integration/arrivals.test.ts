// Spec 015, RF-6 a RF-8: llegadas pendientes de celebrar, celebradas una sola vez y «¡Nuevo!» hasta verlas.
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { packs } from "@/db/schema";
import { markCelebrated, markPacksSeen, newArrivalsBySet, pendingArrivals } from "@/server/services/arrivals";
import { upsertUserFromLogin } from "@/server/services/users";
import type { DbLike } from "@/server/db-types";
import { inRollback } from "./db";
import { createPublishedSet, makeAdmin } from "./factories";

const ODDS = [{ common: 100 }, { legendary: 100 }];
type Source = "tier_grant" | "manual" | "promo" | "free" | "daily";

async function grant(db: DbLike, userId: string, setId: string, source: Source, extra: { reason?: string; status?: "sealed" | "opened" | "void"; grantedAt?: Date } = {}) {
  const [p] = await db
    .insert(packs)
    .values({ userId, setId, source, grantKey: `${source}:${userId}:${Math.random()}`, reason: extra.reason ?? null, status: extra.status ?? "sealed", grantedAt: extra.grantedAt ?? new Date() })
    .returning({ id: packs.id });
  return p.id;
}

describe("spec 015 — llegadas", () => {
  it("test_s015_rf6_las_llegadas_pendientes_son_las_selladas_de_bienvenida_regalo_y_suscripcion_sin_celebrar", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const fan = await upsertUserFromLogin(tx, { patreonUserId: "fan-arr-1", displayName: "Fan", role: "user" });
      const { set } = await createPublishedSet(tx, admin.id, { code: "AR1", rarities: ["common", "legendary"], slots: ODDS });
      const welcome = await grant(tx, fan.id, set.id, "promo", { reason: "welcome", grantedAt: new Date("2026-10-18T10:00:00Z") });
      const gift = await grant(tx, fan.id, set.id, "manual", { grantedAt: new Date("2026-10-18T10:01:00Z") });
      const tier = await grant(tx, fan.id, set.id, "tier_grant", { grantedAt: new Date("2026-10-18T10:02:00Z") });
      await grant(tx, fan.id, set.id, "free");
      await grant(tx, fan.id, set.id, "daily");
      await grant(tx, fan.id, set.id, "manual", { status: "opened" });
      await grant(tx, fan.id, set.id, "manual", { status: "void" });
      const pending = await pendingArrivals(tx, fan.id);
      expect(pending.map((p) => p.id)).toEqual([welcome, gift, tier]);
      expect(pending[0]).toMatchObject({ code: "AR1", source: "promo", reason: "welcome" });
    });
  });

  it("test_s015_rf7_se_celebran_una_sola_vez_y_solo_las_del_propio_usuario", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const fan = await upsertUserFromLogin(tx, { patreonUserId: "fan-arr-2", displayName: "Fan", role: "user" });
      const other = await upsertUserFromLogin(tx, { patreonUserId: "fan-arr-3", displayName: "Otra", role: "user" });
      const { set } = await createPublishedSet(tx, admin.id, { code: "AR2", rarities: ["common", "legendary"], slots: ODDS });
      const mine = await grant(tx, fan.id, set.id, "manual");
      const theirs = await grant(tx, other.id, set.id, "manual");
      const first = new Date("2026-10-18T12:00:00Z");
      await markCelebrated(tx, fan.id, [mine, theirs], first);
      // Otro dispositivo la muestra a la vez: la marca no cambia.
      await markCelebrated(tx, fan.id, [mine], new Date("2026-10-18T12:00:05Z"));
      expect(await pendingArrivals(tx, fan.id)).toEqual([]);
      expect((await tx.select().from(packs).where(eq(packs.id, mine)))[0].celebratedAt).toEqual(first);
      expect((await pendingArrivals(tx, other.id)).map((p) => p.id)).toEqual([theirs]);
    });
  });

  it("test_s015_rf8_son_nuevas_hasta_la_siguiente_visita_a_mis_sobres", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const fan = await upsertUserFromLogin(tx, { patreonUserId: "fan-arr-4", displayName: "Fan", role: "user" });
      const a = await createPublishedSet(tx, admin.id, { code: "AR3", rarities: ["common", "legendary"], slots: ODDS });
      const b = await createPublishedSet(tx, admin.id, { code: "AR4", rarities: ["common", "legendary"], slots: ODDS });
      await grant(tx, fan.id, a.set.id, "manual", { grantedAt: new Date("2026-10-18T10:00:00Z") });
      await grant(tx, fan.id, a.set.id, "tier_grant", { grantedAt: new Date("2026-10-18T10:01:00Z") });
      await grant(tx, fan.id, b.set.id, "promo", { reason: "welcome", grantedAt: new Date("2026-10-18T10:02:00Z") });
      await grant(tx, fan.id, b.set.id, "free", { grantedAt: new Date("2026-10-18T10:03:00Z") });
      expect([...(await newArrivalsBySet(tx, fan.id))]).toEqual([
        [a.set.id, 2],
        [b.set.id, 1],
      ]);
      await markPacksSeen(tx, fan.id, new Date("2026-10-18T10:05:00Z"));
      expect((await newArrivalsBySet(tx, fan.id)).size).toBe(0);
      await grant(tx, fan.id, b.set.id, "manual", { grantedAt: new Date("2026-10-18T11:00:00Z") });
      expect([...(await newArrivalsBySet(tx, fan.id))]).toEqual([[b.set.id, 1]]);
    });
  });
});
