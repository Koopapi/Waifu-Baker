import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { auditLog, sets, tierRules } from "@/db/schema";
import { createSet } from "@/server/services/collections";
import { deleteTierRule, saveTierRule, tierOverview } from "@/server/services/tiers";
import { FakePatreonClient } from "@/server/adapters/fake-patreon";
import { inRollback } from "./db";
import { makeAdmin } from "./factories";

type Tx = Parameters<Parameters<typeof inRollback>[0]>[0];
const client = new FakePatreonClient([
  { id: "t-sfw", title: "SFW", amountCents: 300, published: true },
  { id: "t-adult", title: "18+", amountCents: 700, published: true },
]);

async function published(tx: Tx, adminId: string, code: string, isAdult = false) {
  const s = await createSet(tx, adminId, { code, name: code, isAdult });
  await tx.update(sets).set({ status: "published" }).where(eq(sets.id, s.id));
  return s;
}

describe("RF-24 reglas de tiers de Patreon", () => {
  it("test_rf24_asigna a un tier una colección publicada con N sobres al mes", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const s = await published(tx, admin.id, "WB01");
      await saveTierRule(tx, admin.id, { patreonTierId: "t-sfw", tierName: "SFW", setId: s.id, packsPerMonth: 3, active: true });
      const [r] = await tx.select().from(tierRules);
      expect(r).toMatchObject({ patreonTierId: "t-sfw", setId: s.id, packsPerMonth: 3, active: true });
      expect((await tx.select().from(auditLog).where(eq(auditLog.action, "tier_rule_save"))).length).toBe(1);
    });
  });

  it("test_rf24_un tier puede dar varias colecciones; repetir la misma la actualiza", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const a = await published(tx, admin.id, "WB01");
      const b = await published(tx, admin.id, "WB01A", true);
      await saveTierRule(tx, admin.id, { patreonTierId: "t-adult", tierName: "18+", setId: a.id, packsPerMonth: 3, active: true });
      await saveTierRule(tx, admin.id, { patreonTierId: "t-adult", tierName: "18+", setId: b.id, packsPerMonth: 3, active: true });
      await saveTierRule(tx, admin.id, { patreonTierId: "t-adult", tierName: "18+", setId: b.id, packsPerMonth: 4, active: false });
      const rows = await tx.select().from(tierRules).where(eq(tierRules.patreonTierId, "t-adult"));
      expect(rows).toHaveLength(2);
      expect(rows.find((r) => r.setId === b.id)).toMatchObject({ packsPerMonth: 4, active: false });
    });
  });

  it("test_rf24_rechaza colecciones no publicadas y cantidades fuera de 1–50", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const draft = await createSet(tx, admin.id, { code: "WB02", name: "Borrador", isAdult: false });
      const pub = await published(tx, admin.id, "WB01");
      await expect(saveTierRule(tx, admin.id, { patreonTierId: "t-sfw", tierName: "SFW", setId: draft.id, packsPerMonth: 3, active: true })).rejects.toMatchObject({ code: "not_grantable" });
      await expect(saveTierRule(tx, admin.id, { patreonTierId: "t-sfw", tierName: "SFW", setId: pub.id, packsPerMonth: 0, active: true })).rejects.toMatchObject({ code: "invalid_packs" });
      await expect(saveTierRule(tx, admin.id, { patreonTierId: "t-sfw", tierName: "SFW", setId: pub.id, packsPerMonth: 51, active: true })).rejects.toMatchObject({ code: "invalid_packs" });
    });
  });

  it("test_rf24_la vista une los tiers de la campaña con sus reglas y muestra reglas huérfanas", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const s = await published(tx, admin.id, "WB01");
      await saveTierRule(tx, admin.id, { patreonTierId: "t-sfw", tierName: "SFW", setId: s.id, packsPerMonth: 3, active: true });
      await saveTierRule(tx, admin.id, { patreonTierId: "t-borrado", tierName: "Antiguo", setId: s.id, packsPerMonth: 1, active: true });
      const o = await tierOverview(tx, client);
      expect(o.tiers.map((t) => [t.id, t.rules.length])).toEqual([["t-sfw", 1], ["t-adult", 0]]);
      expect(o.orphanRules.map((r) => r.patreonTierId)).toEqual(["t-borrado"]);
      expect(o.grantableSets.map((g) => g.code)).toEqual(["WB01"]);
    });
  });

  it("test_rf24_borra una regla y lo registra", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const s = await published(tx, admin.id, "WB01");
      await saveTierRule(tx, admin.id, { patreonTierId: "t-sfw", tierName: "SFW", setId: s.id, packsPerMonth: 3, active: true });
      const [r] = await tx.select().from(tierRules);
      await deleteTierRule(tx, admin.id, r.id);
      expect(await tx.select().from(tierRules)).toHaveLength(0);
    });
  });
});
