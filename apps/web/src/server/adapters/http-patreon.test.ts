import { describe, expect, it } from "vitest";
import { parseCampaignTiers } from "./http-patreon";

describe("Cliente HTTP de Patreon", () => {
  it("extrae los tiers del JSON:API de la campaña", () => {
    const body = {
      data: { id: "123", type: "campaign" },
      included: [
        { id: "t1", type: "tier", attributes: { title: "SFW", amount_cents: 300, published: true } },
        { id: "b1", type: "benefit", attributes: { title: "Otro" } },
        { id: "t0", type: "tier", attributes: { title: "Free", amount_cents: 0, published: true } },
      ],
    };
    expect(parseCampaignTiers(body)).toEqual([
      { id: "t0", title: "Free", amountCents: 0, published: true },
      { id: "t1", title: "SFW", amountCents: 300, published: true },
    ]);
  });
});
