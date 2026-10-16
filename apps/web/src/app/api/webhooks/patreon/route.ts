import { db } from "@/db/client";
import { getPatreonClient } from "@/server/patreon/client-instance";
import { handlePatreonWebhook } from "@/server/services/webhooks";

export const runtime = "nodejs";

const STATUS = { invalid_signature: 401, bad_payload: 400, duplicate: 200, applied: 200, error: 500 } as const;

/** Spec 001, RF-15 y RF-16: avisos de Patreon (members:*). */
export async function POST(req: Request) {
  const outcome = await handlePatreonWebhook(db, getPatreonClient().client, {
    rawBody: await req.text(),
    signature: req.headers.get("x-patreon-signature"),
    eventType: req.headers.get("x-patreon-event"),
    secret: process.env.PATREON_WEBHOOK_SECRET,
  });
  return Response.json({ outcome }, { status: STATUS[outcome] });
}
