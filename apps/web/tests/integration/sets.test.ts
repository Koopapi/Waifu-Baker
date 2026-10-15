import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { auditLog, dropTables, sets } from "@/db/schema";
import { createSet, listSets, updateSet } from "@/server/services/collections";
import { AdminError } from "@/server/errors";
import { inRollback } from "./db";
import { makeAdmin } from "./factories";

describe("RF-4 crear y editar colecciones", () => {
  it("test_rf4_crea una colección en borrador con sus valores por defecto", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const s = await createSet(tx, admin.id, { code: "wb01", name: "Base", isAdult: false });
      expect(s).toMatchObject({ code: "WB01", name: "Base", slug: "wb01", isAdult: false, status: "draft", packSize: 5 });
      const [dt] = await tx.select().from(dropTables).where(eq(dropTables.setId, s.id));
      expect(dt.slots).toHaveLength(5);
      expect(dt.publishedAt).toBeNull();
      const logs = await tx.select().from(auditLog).where(eq(auditLog.action, "set_create"));
      expect(logs[0]).toMatchObject({ actorUserId: admin.id, entityId: s.id });
    });
  });

  it("test_rf4_rechaza un código repetido con mensaje claro", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      await createSet(tx, admin.id, { code: "WB01", name: "Base", isAdult: false });
      await expect(createSet(tx, admin.id, { code: "wb01", name: "Otra", isAdult: true })).rejects.toMatchObject({
        code: "duplicate_code",
      });
    });
  });

  it("test_rf4_valida código, nombre y tamaño de sobre", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      await expect(createSet(tx, admin.id, { code: "w", name: "X", isAdult: false })).rejects.toBeInstanceOf(AdminError);
      await expect(createSet(tx, admin.id, { code: "WB 01", name: "X", isAdult: false })).rejects.toMatchObject({ code: "invalid_code" });
      await expect(createSet(tx, admin.id, { code: "WB09", name: "  ", isAdult: false })).rejects.toMatchObject({ code: "invalid_name" });
      await expect(createSet(tx, admin.id, { code: "WB09", name: "X", isAdult: false, packSize: 11 })).rejects.toMatchObject({
        code: "invalid_pack_size",
      });
    });
  });

  it("test_rf4_edita un borrador y registra el cambio", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const s = await createSet(tx, admin.id, { code: "WB01", name: "Base", isAdult: false });
      const u = await updateSet(tx, admin.id, s.id, s.version, { name: "Base 2026", isAdult: true, packSize: 6 });
      expect(u).toMatchObject({ name: "Base 2026", isAdult: true, packSize: 6, version: s.version + 1 });
      const logs = await tx.select().from(auditLog).where(eq(auditLog.action, "set_update"));
      expect(logs[0].after).toEqual({ name: "Base 2026", isAdult: true, packSize: 6 });
    });
  });

  it("test_rf4_avisa si la colección cambió desde que se abrió", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const s = await createSet(tx, admin.id, { code: "WB01", name: "Base", isAdult: false });
      await updateSet(tx, admin.id, s.id, s.version, { name: "A" });
      await expect(updateSet(tx, admin.id, s.id, s.version, { name: "B" })).rejects.toMatchObject({ code: "stale_version" });
    });
  });

  it("test_rf8_en una publicada solo cambia el nombre", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const s = await createSet(tx, admin.id, { code: "WB01", name: "Base", isAdult: false });
      const [p] = await tx.update(sets).set({ status: "published" }).where(eq(sets.id, s.id)).returning();
      await expect(updateSet(tx, admin.id, s.id, p.version, { isAdult: true })).rejects.toMatchObject({ code: "locked" });
      await expect(updateSet(tx, admin.id, s.id, p.version, { packSize: 6 })).rejects.toMatchObject({ code: "locked" });
      const ok = await updateSet(tx, admin.id, s.id, p.version, { name: "Base renombrada" });
      expect(ok.name).toBe("Base renombrada");
    });
  });

  it("test_rf4_lista colecciones con su número de cartas", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      await createSet(tx, admin.id, { code: "WB01", name: "Base", isAdult: false });
      await createSet(tx, admin.id, { code: "WB01A", name: "Base 18+", isAdult: true });
      const rows = await listSets(tx);
      expect(rows.map((r) => r.code)).toEqual(["WB01", "WB01A"]);
      expect(rows[0].cardCount).toBe(0);
    });
  });
});
