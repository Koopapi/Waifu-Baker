import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { auditLog, users } from "@/db/schema";
import { upsertUserFromLogin } from "@/server/services/users";
import { checkAdminAccess } from "@/server/services/admin-guard";
import { inRollback } from "./db";

describe("RF-1 y RF-2: usuarios y guardia del panel", () => {
  it("test_rf1_el rol se recalcula en cada login (alta y degradación)", async () => {
    await inRollback(async (tx) => {
      const a = await upsertUserFromLogin(tx, { patreonUserId: "p-1", displayName: "Koopa", role: "admin" });
      expect(a.role).toBe("admin");
      const b = await upsertUserFromLogin(tx, { patreonUserId: "p-1", displayName: "Koopa", role: "user" });
      expect(b.id).toBe(a.id);
      expect(b.role).toBe("user");
    });
  });

  it("test_rf2_un administrador entra y no se registra nada", async () => {
    await inRollback(async (tx) => {
      const u = await upsertUserFromLogin(tx, { patreonUserId: "p-2", displayName: "Admin", role: "admin" });
      expect(await checkAdminAccess(tx, u.id, "/admin")).toBe(true);
      expect(await tx.select().from(auditLog)).toHaveLength(0);
    });
  });

  it("test_rf2_un usuario normal no entra y queda registrado el intento", async () => {
    await inRollback(async (tx) => {
      const u = await upsertUserFromLogin(tx, { patreonUserId: "p-3", displayName: "Fan", role: "user" });
      expect(await checkAdminAccess(tx, u.id, "/admin/sets")).toBe(false);
      const logs = await tx.select().from(auditLog).where(eq(auditLog.action, "admin_access_denied"));
      expect(logs).toHaveLength(1);
      expect(logs[0].actorUserId).toBe(u.id);
      expect(logs[0].meta).toMatchObject({ path: "/admin/sets" });
    });
  });

  it("test_rf2_sin sesión tampoco entra y se registra sin autor", async () => {
    await inRollback(async (tx) => {
      expect(await checkAdminAccess(tx, null, "/admin")).toBe(false);
      const logs = await tx.select().from(auditLog);
      expect(logs).toHaveLength(1);
      expect(logs[0].actorUserId).toBeNull();
    });
  });

  it("test_rf2_una cuenta borrada no entra aunque fuera admin", async () => {
    await inRollback(async (tx) => {
      const u = await upsertUserFromLogin(tx, { patreonUserId: "p-4", displayName: "Ex", role: "admin" });
      await tx.update(users).set({ deletedAt: new Date() }).where(eq(users.id, u.id));
      expect(await checkAdminAccess(tx, u.id, "/admin")).toBe(false);
    });
  });
});
