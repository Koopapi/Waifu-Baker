// Spec 039: la carta del armador en las vistas del panel (simulador y diseñador de sobres). Regla pura.
import type { Rarity } from "@/domain/catalog/card-rules";
import { rarityTier } from "@/domain/catalog/rarity-tier";
import { finalCardConfig } from "./final-card";
import { flatImageFor } from "./flat-image";
import type { LayersConfig } from "./layers";
import type { LiveCard } from "./live";

/** Los enlaces de imagen del panel: solo los sirve `/api/admin/assets` a administradores (los mismos del armador). */
export const adminAssetUrl = (key: string) => `/api/admin/assets/${key}`;

export interface AdminCardInput {
  rarity: Rarity;
  /** Lo vigente: lo pendiente de revisión 18+ vive aparte y no se lee (RF-8). */
  layers: LayersConfig | null;
  keyMid: string;
  keyHoloMid: string | null;
}

export interface AdminCardView {
  /** La imagen fija mediana: la holo si la copia es holo y la carta la tiene (RF-6). */
  image: string;
  /** La copia es holo y la carta aún no tiene imagen holo: la vista pone su acabado holo. */
  holoFinish: boolean;
  /** RF-1 y RF-13: la carta viva del armador; `null` sin capas (RF-9 y RF-15). */
  live: LiveCard | null;
}

/** RF-1, RF-4 y RF-6 a RF-9: la carta para una vista del panel, sin los efectos del vínculo de ninguna cuenta. */
export function adminCardView(card: AdminCardInput, holoCopy: boolean): AdminCardView {
  const choice = flatImageFor("mid", { holoCopy, holoImage: Boolean(card.keyHoloMid) });
  const key = choice.size === "mid-holo" && card.keyHoloMid ? card.keyHoloMid : card.keyMid;
  const live = card.layers ? { tier: rarityTier(card.rarity), config: finalCardConfig(card.layers, adminAssetUrl) } : null;
  return { image: adminAssetUrl(key), holoFinish: choice.holoFinish, live };
}
