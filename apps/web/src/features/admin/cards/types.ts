import type { Rarity } from "@/domain/catalog/card-rules";

export interface CardDTO {
  id: string;
  number: number;
  name: string;
  flavorText: string;
  rarity: Rarity | null;
  variant: "normal" | "holo" | "alt";
  characterId: string | null;
  characterName: string | null;
  status: "draft" | "ready";
  version: number;
  thumbUrl: string | null;
  midUrl: string | null;
  fullUrl: string | null;
  adultReviewedAt: string | null;
  pendingArtUrl: string | null;
  /** Probabilidad (0–1) de que la carta salga en un sobre. */
  chance: number;
}

export interface CharacterOption {
  id: string;
  name: string;
}

export interface Permissions {
  canAdd: boolean;
  canReorder: boolean;
  canRemove: boolean;
  canEditRarity: boolean;
  isAdultSet: boolean;
}

export const assetUrl = (key: string | null) => (key ? `/api/admin/assets/${key}` : null);
