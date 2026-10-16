import { isDevLoginEnabled } from "@/domain/auth/access";
import { clockOffset, setClockOffset } from "@/server/clock";

export const runtime = "nodejs";

const allowed = () => isDevLoginEnabled(process.env) && process.env.NODE_ENV !== "production";

/** Solo desarrollo y E2E: adelanta el reloj del servidor (`{ "advanceHours": 12 }`). */
export async function POST(req: Request) {
  if (!allowed()) return new Response("Not found", { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { advanceHours?: number };
  const hours = Number(body.advanceHours);
  if (!Number.isFinite(hours) || hours < 0 || hours > 24 * 365) return Response.json({ error: "advanceHours" }, { status: 400 });
  setClockOffset(clockOffset() + hours * 3_600_000);
  return Response.json({ offsetMs: clockOffset() });
}

/** Vuelve a la hora real. */
export async function DELETE() {
  if (!allowed()) return new Response("Not found", { status: 404 });
  setClockOffset(0);
  return Response.json({ offsetMs: 0 });
}
