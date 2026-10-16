import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { webhookEvents } from "@/db/schema";
import { verifyPatreonSignature } from "@/domain/patreon/webhook-signature";
import type { DbLike } from "@/server/db-types";
import type { PatreonClient } from "@/server/ports/patreon";
import { syncMemberById } from "./membership";

export type WebhookOutcome = "invalid_signature" | "bad_payload" | "duplicate" | "applied" | "error";

/**
 * RF-15 y RF-16: un aviso de Patreon. Sin firma válida no se toca nada. Un aviso repetido se ignora.
 * El aviso solo dice «algo cambió»: lo que se aplica es el estado que devuelve la consulta a Patreon.
 */
export async function handlePatreonWebhook(
  db: DbLike,
  client: PatreonClient | null,
  input: { rawBody: string; signature: string | null; eventType: string | null; secret: string | undefined },
): Promise<WebhookOutcome> {
  if (!verifyPatreonSignature(input.rawBody, input.signature, input.secret)) return "invalid_signature";
  let payload: { data?: { id?: string; type?: string } };
  try {
    payload = JSON.parse(input.rawBody);
  } catch {
    return "bad_payload";
  }
  const memberId = payload.data?.type === "member" ? payload.data.id : undefined;
  if (!memberId) return "bad_payload";
  const eventType = input.eventType ?? "unknown";
  const dedupeKey = createHash("sha256").update(`${eventType}\n${input.rawBody}`).digest("hex");
  const [row] = await db
    .insert(webhookEvents)
    .values({ eventType, dedupeKey, memberId, payload })
    .onConflictDoNothing({ target: webhookEvents.dedupeKey })
    .returning({ id: webhookEvents.id });
  if (!row) return "duplicate";
  if (!client) {
    await db.update(webhookEvents).set({ error: "Patreon no está configurado" }).where(eq(webhookEvents.id, row.id));
    return "error";
  }
  try {
    await syncMemberById(db, client, memberId);
    await db.update(webhookEvents).set({ processedAt: sql`now()` }).where(eq(webhookEvents.id, row.id));
    return "applied";
  } catch (e) {
    await db.update(webhookEvents).set({ error: (e as Error).message.slice(0, 500) }).where(eq(webhookEvents.id, row.id));
    return "error";
  }
}
