import { z } from "zod";
import { isDevLoginEnabled } from "@/domain/auth/access";
import { clearFakeMembers, setFakeMember } from "@/server/adapters/fake-patreon";
import { getPatreonClient } from "@/server/patreon/client-instance";

export const runtime = "nodejs";

const Body = z.object({
  patreonUserId: z.string().min(1),
  patronStatus: z.enum(["active_patron", "declined_patron", "former_patron"]).nullable(),
  lastChargeStatus: z.string().nullable(),
  lastChargeDate: z.string().nullable(),
  nextChargeDate: z.string().nullable(),
  entitledTierIds: z.array(z.string()),
});

/** Solo desarrollo y E2E con el cliente falso: fija el estado de un miembro simulado de Patreon. */
export async function POST(req: Request) {
  if (!isDevLoginEnabled(process.env) || getPatreonClient().mode !== "fake") return new Response("Not found", { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  const b = parsed.data;
  const memberId = setFakeMember({
    memberId: null,
    patreonUserId: b.patreonUserId,
    patronStatus: b.patronStatus,
    lastChargeStatus: b.lastChargeStatus,
    lastChargeDate: b.lastChargeDate ? new Date(b.lastChargeDate) : null,
    nextChargeDate: b.nextChargeDate ? new Date(b.nextChargeDate) : null,
    entitledTierIds: b.entitledTierIds,
  });
  return Response.json({ memberId });
}

/** Solo desarrollo y E2E: borra todos los miembros simulados (cada test empieza limpio). */
export async function DELETE() {
  if (!isDevLoginEnabled(process.env) || getPatreonClient().mode !== "fake") return new Response("Not found", { status: 404 });
  clearFakeMembers();
  return Response.json({ ok: true });
}
