import type { PatreonClient, PatreonTier } from "@/server/ports/patreon";

/** Cliente de Patreon para desarrollo y tests: tiers fijos, sin red. */
export class FakePatreonClient implements PatreonClient {
  constructor(private readonly tiers: PatreonTier[]) {}

  async listCampaignTiers() {
    return [...this.tiers];
  }
}
