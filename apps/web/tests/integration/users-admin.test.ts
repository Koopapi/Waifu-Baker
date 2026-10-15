import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { auditLog, packs, sets, users } from "@/db/schema";
import { createSet } from "@/server/services/collections";
import { upsertUserFromLogin } from "@/server/services/users";
import { getUserDetail, giftPacks, searchUsers } from "@/server/services/users-admin";
import { inRollback } from "./db";
import { makeAdmin } from "./factories";

type Tx = Parameters<Parameters<typeof inRollback>[0]>[0];

async function setup(tx: Tx) {
  const admin = await makeAdmin(tx);
  const fan = await upsertUserFromLogin(tx, { patreonUserId: "p-777", displayName: "Fan Número Uno", role: "user" });
  const sfw = await createSet(tx, admin.id, { code: "WB01", name: "Base", isAdult: false });
  const adult = await createSet(tx, admin.id, { code: "WB01A", name: "Base 18+", isAdult: true });
  await tx.update(sets).set({ status: "published" }).where(eq(sets.id, sfw.id));
  await tx.update(sets).set({ status: "published" }).where(eq(sets.id, adult.id));
  return { admin, fan, sfw, adult };
}

describe("RF-27 búsqueda y ficha de usuario", () => {
  it("test_rf27_busca por nombre (sin distinguir mayúsculas) o por id de Patreon", async () => {
    await inRollback(async (tx) => {
      const { fan } = await setup(tx);
      expect((await searchUsers(tx, "número")).map((u) => u.id)).toContain(fan.id);
      expect((await searchUsers(tx, "p-777")).map((u) => u.id)).toEqual([fan.id]);
      expect(await searchUsers(tx, "nadie-así")).toHaveLength(0);
    });
  });

  it("test_rf27_la ficha muestra sobres sin abrir, colección e historial", async () => {
    await inRollback(async (tx) => {
      const { admin, fan, sfw } = await setup(tx);
      await giftPacks(tx, admin.id, { userId: fan.id, setId: sfw.id, count: 2, reason: "Bienvenida al piloto" });
      const d = (await getUserDetail(tx, fan.id))!;
      expect(d.user.id).toBe(fan.id);
      expect(d.sealedPacks).toHaveLength(2);
      expect(d.sealedPacks[0]).toMatchObject({ setCode: "WB01", source: "manual", reason: "Bienvenida al piloto" });
      expect(d.collection).toEqual([]);
      expect(d.openings).toEqual([]);
    });
  });
});

describe("RF-25 y RF-26 regalo de sobres", () => {
  it("test_rf25_crea los sobres con origen manual, motivo y registro", async () => {
    await inRollback(async (tx) => {
      const { admin, fan, sfw } = await setup(tx);
      const n = await giftPacks(tx, admin.id, { userId: fan.id, setId: sfw.id, count: 3, reason: "Sorteo de octubre" });
      expect(n).toBe(3);
      const rows = await tx.select().from(packs).where(eq(packs.userId, fan.id));
      expect(rows).toHaveLength(3);
      for (const p of rows) expect(p).toMatchObject({ source: "manual", status: "sealed", reason: "Sorteo de octubre", grantedBy: admin.id });
      const [log] = await tx.select().from(auditLog).where(eq(auditLog.action, "packs_gift"));
      expect(log.after).toMatchObject({ count: 3, setId: sfw.id });
    });
  });

  it("test_rf25_exige motivo, de 1 a 20 sobres y una colección publicada", async () => {
    await inRollback(async (tx) => {
      const { admin, fan, sfw } = await setup(tx);
      const draft = await createSet(tx, admin.id, { code: "WB02", name: "Borrador", isAdult: false });
      await expect(giftPacks(tx, admin.id, { userId: fan.id, setId: sfw.id, count: 1, reason: "  " })).rejects.toMatchObject({ code: "invalid_reason" });
      await expect(giftPacks(tx, admin.id, { userId: fan.id, setId: sfw.id, count: 21, reason: "Premio" })).rejects.toMatchObject({ code: "invalid_count" });
      await expect(giftPacks(tx, admin.id, { userId: fan.id, setId: draft.id, count: 1, reason: "Premio" })).rejects.toMatchObject({ code: "not_grantable" });
    });
  });

  it("test_rf26_no regala sobres 18+ a quien no ha superado la verificación de edad", async () => {
    await inRollback(async (tx) => {
      const { admin, fan, adult } = await setup(tx);
      await expect(giftPacks(tx, admin.id, { userId: fan.id, setId: adult.id, count: 1, reason: "Premio" })).rejects.toMatchObject({ code: "age_not_verified" });
      await tx.update(users).set({ isAdultDeclared: true, adultVerifiedAt: new Date() }).where(eq(users.id, fan.id));
      expect(await giftPacks(tx, admin.id, { userId: fan.id, setId: adult.id, count: 1, reason: "Premio" })).toBe(1);
    });
  });

  it("caso límite: no regala a una cuenta borrada", async () => {
    await inRollback(async (tx) => {
      const { admin, fan, sfw } = await setup(tx);
      await tx.update(users).set({ deletedAt: new Date() }).where(eq(users.id, fan.id));
      await expect(giftPacks(tx, admin.id, { userId: fan.id, setId: sfw.id, count: 1, reason: "Premio" })).rejects.toMatchObject({ code: "user_deleted" });
    });
  });
});
