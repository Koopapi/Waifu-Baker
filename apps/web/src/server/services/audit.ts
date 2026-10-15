import { auditLog } from "@/db/schema";
import type { DbLike } from "@/server/db-types";

export interface AuditEntry {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  meta?: Record<string, unknown>;
}

export async function recordAudit(db: DbLike, e: AuditEntry) {
  await db.insert(auditLog).values({
    actorUserId: e.actorUserId,
    action: e.action,
    entityType: e.entityType,
    entityId: e.entityId ?? null,
    before: e.before ?? null,
    after: e.after ?? null,
    meta: e.meta ?? null,
  });
}

/** RF-3: registra solo los campos que cambiaron; no escribe nada si no cambió ninguno. */
export async function auditChange(
  db: DbLike,
  e: Omit<AuditEntry, "before" | "after"> & { before: Record<string, unknown>; after: Record<string, unknown> },
) {
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  for (const key of new Set([...Object.keys(e.before), ...Object.keys(e.after)])) {
    if (JSON.stringify(e.before[key]) !== JSON.stringify(e.after[key])) {
      before[key] = e.before[key];
      after[key] = e.after[key];
    }
  }
  if (Object.keys(after).length === 0) return;
  await recordAudit(db, { ...e, before, after });
}
