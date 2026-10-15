import "server-only";
import { FakePatreonClient } from "@/server/adapters/fake-patreon";
import { HttpPatreonClient } from "@/server/adapters/http-patreon";
import type { PatreonClient, PatreonTier } from "@/server/ports/patreon";

const DEV_TIERS: PatreonTier[] = [
  { id: "dev-sfw", title: "SFW (desarrollo)", amountCents: 300, published: true },
  { id: "dev-adult", title: "18+ (desarrollo)", amountCents: 700, published: true },
];

/**
 * Cliente configurado: el real si hay token de creador y campaña; en desarrollo, uno falso con
 * `PATREON_FAKE_TIERS` (JSON) o dos tiers de ejemplo; en producción sin configurar, null.
 */
export function getPatreonClient(): { client: PatreonClient | null; mode: "real" | "fake" | "none" } {
  const { PATREON_CREATOR_ACCESS_TOKEN: token, PATREON_CAMPAIGN_ID: campaign } = process.env;
  if (token && campaign) return { client: new HttpPatreonClient(token, campaign), mode: "real" };
  if (process.env.NODE_ENV === "production") return { client: null, mode: "none" };
  const tiers = process.env.PATREON_FAKE_TIERS ? (JSON.parse(process.env.PATREON_FAKE_TIERS) as PatreonTier[]) : DEV_TIERS;
  return { client: new FakePatreonClient(tiers), mode: "fake" };
}
