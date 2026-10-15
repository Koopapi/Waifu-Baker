import { describe, expect, it } from "vitest";
import { auditLog } from "@/db/schema";
import { auditChange } from "@/server/services/audit";
import { inRollback } from "./db";

describe("RF-3 historial de cambios", () => {
  it("test_rf3_guarda autor, entidad y solo los campos que cambiaron", async () => {
    await inRollback(async (tx) => {
      await auditChange(tx, {
        actorUserId: null,
        action: "set_update",
        entityType: "set",
        entityId: "s1",
        before: { name: "Base", packSize: 5, isAdult: false },
        after: { name: "Base II", packSize: 5, isAdult: true },
      });
      const [row] = await tx.select().from(auditLog);
      expect(row).toMatchObject({ action: "set_update", entityType: "set", entityId: "s1" });
      expect(row.before).toEqual({ name: "Base", isAdult: false });
      expect(row.after).toEqual({ name: "Base II", isAdult: true });
      expect(row.createdAt).toBeInstanceOf(Date);
    });
  });

  it("test_rf3_no registra nada si no cambió ningún campo", async () => {
    await inRollback(async (tx) => {
      await auditChange(tx, { actorUserId: null, action: "x", entityType: "set", entityId: "s1", before: { a: 1 }, after: { a: 1 } });
      expect(await tx.select().from(auditLog)).toHaveLength(0);
    });
  });
});
