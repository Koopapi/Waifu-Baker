import type { MemberState } from "@/domain/patreon/membership";

export interface PatreonTier {
  id: string;
  title: string;
  amountCents: number;
  published: boolean;
}

/** Lo que la web necesita de Patreon con el token de creador (specs 003 y 001). */
export interface PatreonClient {
  listCampaignTiers(): Promise<PatreonTier[]>;
  /** Estado actual de un miembro; null si ya no existe. */
  getMember(memberId: string): Promise<MemberState | null>;
  /** Todos los miembros de la campaña (paginado internamente). */
  listMembers(): Promise<MemberState[]>;
  /**
   * Membresía de una persona en nuestra campaña al entrar. El cliente real usa el token del usuario;
   * el falso busca por su identificador. null si no es miembro.
   */
  membershipOnLogin(input: { patreonUserId: string; userAccessToken?: string | null }): Promise<MemberState | null>;
}
