import type { MemberState, PatronStatus } from "@/domain/patreon/membership";
import type { PatreonClient, PatreonTier } from "@/server/ports/patreon";

const API = "https://www.patreon.com/api/oauth2/v2";
const MEMBER_FIELDS = "fields%5Bmember%5D=patron_status,last_charge_date,last_charge_status,next_charge_date";

interface Ref {
  id: string;
  type: string;
}

interface JsonApiResource extends Ref {
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: Ref | Ref[] | null }>;
}

interface JsonApiBody {
  data?: JsonApiResource | JsonApiResource[];
  included?: JsonApiResource[];
  links?: { next?: string };
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

const date = (v: unknown) => (typeof v === "string" && v ? new Date(v) : null);
const refs = (r: JsonApiResource, rel: string): Ref[] => {
  const d = r.relationships?.[rel]?.data;
  return Array.isArray(d) ? d : d ? [d] : [];
};

/** Convierte un recurso `member` del JSON:API en el estado que usa el dominio. */
export function parseMember(m: JsonApiResource, patreonUserId?: string): MemberState | null {
  const userId = patreonUserId ?? refs(m, "user")[0]?.id;
  if (m.type !== "member" || !userId) return null;
  const a = m.attributes ?? {};
  return {
    memberId: m.id,
    patreonUserId: userId,
    patronStatus: (a.patron_status ?? null) as PatronStatus,
    lastChargeDate: date(a.last_charge_date),
    lastChargeStatus: (a.last_charge_status as string | null) ?? null,
    nextChargeDate: date(a.next_charge_date),
    entitledTierIds: refs(m, "currently_entitled_tiers").map((t) => t.id),
  };
}

/** De `/identity?include=memberships.campaign,...`: la membresía de esa persona en nuestra campaña. */
export function parseIdentityMembership(body: JsonApiBody, campaignId: string): MemberState | null {
  const user = Array.isArray(body.data) ? body.data[0] : body.data;
  if (!user) return null;
  const member = (body.included ?? []).find((r) => r.type === "member" && refs(r, "campaign")[0]?.id === campaignId);
  return member ? parseMember(member, user.id) : null;
}

/** Cliente real (API v2). El token de creador lee la campaña; el del usuario, su propia membresía. */
export class HttpPatreonClient implements PatreonClient {
  constructor(
    private readonly token: string,
    private readonly campaignId: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  private async get(url: string, token = this.token): Promise<{ status: number; body: JsonApiBody }> {
    const res = await this.fetcher(url, { headers: { Authorization: `Bearer ${token}`, "User-Agent": "WaifuBaker/1.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) return { status: 404, body: {} };
    if (!res.ok) throw new Error(`Patreon respondió ${res.status} a ${new URL(url).pathname}.`);
    return { status: res.status, body: (await res.json()) as JsonApiBody };
  }

  async listCampaignTiers() {
    const { body } = await this.get(`${API}/campaigns/${encodeURIComponent(this.campaignId)}?include=tiers&fields%5Btier%5D=title,amount_cents,published`);
    return parseCampaignTiers(body);
  }

  async getMember(memberId: string) {
    const { status, body } = await this.get(`${API}/members/${encodeURIComponent(memberId)}?include=currently_entitled_tiers,user&${MEMBER_FIELDS}`);
    if (status === 404 || !body.data || Array.isArray(body.data)) return null;
    return parseMember(body.data);
  }

  async listMembers() {
    const out: MemberState[] = [];
    let url: string | undefined = `${API}/campaigns/${encodeURIComponent(this.campaignId)}/members?include=currently_entitled_tiers,user&${MEMBER_FIELDS}&page%5Bcount%5D=500`;
    while (url) {
      const { body }: { body: JsonApiBody } = await this.get(url);
      for (const m of Array.isArray(body.data) ? body.data : []) {
        const s = parseMember(m);
        if (s) out.push(s);
      }
      url = body.links?.next;
    }
    return out;
  }

  async membershipOnLogin({ userAccessToken }: { patreonUserId: string; userAccessToken?: string | null }) {
    if (!userAccessToken) return null;
    const { body } = await this.get(
      `${API}/identity?include=memberships.currently_entitled_tiers,memberships.campaign&${MEMBER_FIELDS}`,
      userAccessToken,
    );
    return parseIdentityMembership(body, this.campaignId);
  }
}
