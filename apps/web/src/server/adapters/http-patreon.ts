import type { PatreonClient, PatreonTier } from "@/server/ports/patreon";

interface JsonApiResource {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
}

/** Extrae y ordena por precio los tiers del JSON:API de `/campaigns/{id}?include=tiers`. */
export function parseCampaignTiers(body: { included?: JsonApiResource[] }): PatreonTier[] {
  return (body.included ?? [])
    .filter((r) => r.type === "tier")
    .map((r) => ({
      id: r.id,
      title: String(r.attributes?.title ?? ""),
      amountCents: Number(r.attributes?.amount_cents ?? 0),
      published: Boolean(r.attributes?.published),
    }))
    .sort((a, b) => a.amountCents - b.amountCents);
}

/** Cliente real con el token de creador (API v2). */
export class HttpPatreonClient implements PatreonClient {
  constructor(
    private readonly token: string,
    private readonly campaignId: string,
  ) {}

  async listCampaignTiers() {
    const url = `https://www.patreon.com/api/oauth2/v2/campaigns/${encodeURIComponent(this.campaignId)}?include=tiers&fields%5Btier%5D=title,amount_cents,published`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${this.token}` }, cache: "no-store" });
    if (!res.ok) throw new Error(`Patreon respondió ${res.status} al pedir los tiers de la campaña.`);
    return parseCampaignTiers(await res.json());
  }
}
