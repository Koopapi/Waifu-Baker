import { describe, expect, it } from "vitest";
import { HttpPatreonClient, parseCampaignTiers, parseIdentityMembership, parseMember } from "./http-patreon";

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

describe("Cliente HTTP de Patreon — membresías (spec 001)", () => {
  const member = {
    id: "mem-1",
    type: "member",
    attributes: { patron_status: "active_patron", last_charge_date: "2026-10-01T10:00:00.000+00:00", last_charge_status: "Paid", next_charge_date: "2026-11-01T00:00:00.000+00:00" },
    relationships: {
      currently_entitled_tiers: { data: [{ id: "t-sfw", type: "tier" }] },
      user: { data: { id: "u-9", type: "user" } },
      campaign: { data: { id: "16965609", type: "campaign" } },
    },
  };

  it("test_s001_rf1_lee_estado_tiers_y_cobro_de_un_miembro", () => {
    expect(parseMember(member)).toEqual({
      memberId: "mem-1",
      patreonUserId: "u-9",
      patronStatus: "active_patron",
      lastChargeDate: new Date("2026-10-01T10:00:00Z"),
      lastChargeStatus: "Paid",
      nextChargeDate: new Date("2026-11-01T00:00:00Z"),
      entitledTierIds: ["t-sfw"],
    });
  });

  it("test_s001_rf1_al_entrar_solo_cuenta_la_membresia_de_nuestra_campana", () => {
    const other = { ...member, id: "mem-x", relationships: { ...member.relationships, campaign: { data: { id: "999", type: "campaign" } } } };
    const body = { data: { id: "u-9", type: "user" }, included: [other, member, { id: "t-sfw", type: "tier" }] };
    expect(parseIdentityMembership(body, "16965609")?.memberId).toBe("mem-1");
    expect(parseIdentityMembership({ data: { id: "u-9", type: "user" }, included: [other] }, "16965609")).toBeNull();
  });

  it("test_s001_rf17_recorre_todas_las_paginas_de_miembros", async () => {
    const pages: Record<string, unknown> = {
      first: { data: [member], links: { next: "https://www.patreon.com/api/oauth2/v2/campaigns/c/members?page=2" } },
      second: { data: [{ ...member, id: "mem-2", relationships: { ...member.relationships, user: { data: { id: "u-10", type: "user" } } } }] },
    };
    const fetcher = (async (url: string) =>
      new Response(JSON.stringify(url.includes("page=2") ? pages.second : pages.first), { status: 200 })) as unknown as typeof fetch;
    const all = await new HttpPatreonClient("tok", "c", fetcher).listMembers();
    expect(all.map((m) => m.memberId)).toEqual(["mem-1", "mem-2"]);
  });

  it("test_s001_rf15_un_miembro_que_ya_no_existe_devuelve_null", async () => {
    const fetcher = (async () => new Response("{}", { status: 404 })) as unknown as typeof fetch;
    expect(await new HttpPatreonClient("tok", "c", fetcher).getMember("gone")).toBeNull();
  });
});
