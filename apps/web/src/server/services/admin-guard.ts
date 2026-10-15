import { and, eq, isNull } from "drizzle-orm";
import { users } from "@/db/schema";
import type { DbLike } from "@/server/db-types";
import { recordAudit } from "./audit";

/** RF-1 y RF-2: true si el usuario es administrador activo; si no, registra el intento. */
export async function checkAdminAccess(db: DbLike, userId: string | null, path: string): Promise<boolean> {
  if (userId) {
    const [u] = await db
      .select({ role: users.role })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);
    if (u?.role === "admin") return true;
  }
  await recordAudit(db, {
    actorUserId: userId,
    action: "admin_access_denied",
    entityType: "admin_panel",
    meta: { path },
  });
  return false;
}
