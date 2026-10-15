export interface PatreonTier {
  id: string;
  title: string;
  amountCents: number;
  published: boolean;
}

/** Lo que el panel necesita de Patreon. La sincronización de miembros llega con la spec 001. */
export interface PatreonClient {
  listCampaignTiers(): Promise<PatreonTier[]>;
}
