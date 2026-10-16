import type { MemberState } from "@/domain/patreon/membership";
import type { PatreonClient, PatreonTier } from "@/server/ports/patreon";

// Miembros simulados compartidos por todo el proceso (rutas, acciones y tareas programadas).
const store = ((globalThis as { __wbFakeMembers?: Map<string, MemberState> }).__wbFakeMembers ??= new Map());

/** Solo desarrollo y E2E: fija el estado de un miembro simulado. */
export function setFakeMember(state: MemberState) {
  const memberId = state.memberId ?? `fake-${state.patreonUserId}`;
  store.set(memberId, { ...state, memberId });
  return memberId;
}

export function clearFakeMembers() {
  store.clear();
}

/** Cliente de Patreon para desarrollo y tests: tiers fijos y miembros en memoria, sin red. */
export class FakePatreonClient implements PatreonClient {
  constructor(private readonly tiers: PatreonTier[]) {}

  async listCampaignTiers() {
    return [...this.tiers];
  }

  async getMember(memberId: string) {
    return store.get(memberId) ?? null;
  }

  async listMembers() {
    return [...store.values()];
  }

  async membershipOnLogin({ patreonUserId }: { patreonUserId: string }) {
    return [...store.values()].find((m) => m.patreonUserId === patreonUserId) ?? null;
  }
}
