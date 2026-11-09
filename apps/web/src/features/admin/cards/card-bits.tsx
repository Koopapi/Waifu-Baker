"use client";

// Piezas pequeñas que comparten la cuadrícula de la colección y la ventana de edición de una carta.
import type { Rarity } from "@/domain/catalog/card-rules";
import type { ActionState } from "@/server/auth/admin-action";
import { Badge } from "@/ui/content/Badge";
import { Alert } from "@/ui/feedback/Alert";
import { useT } from "@/i18n/client";
import { useAdminLayersT } from "@/i18n/admin-layers";
import { formatPercent } from "@/i18n/format";
import type { Locale } from "@/i18n";
import type { CardTileDTO } from "./types";

export const RARITY_DOT: Record<Rarity, string> = {
  common: "bg-[#9aa0a6]",
  rare: "bg-[#60a5fa]",
  epic: "bg-[#c084fc]",
  legendary: "bg-[#f5c451]",
  ex: "bg-[#ff6ad5]",
};

export const pad = (n: number) => String(n).padStart(3, "0");
export const pct = (locale: Locale, x: number) => formatPercent(locale, x * 100, x < 0.01 ? 2 : 1);

export function ReviewBadge({ card }: { card: Pick<CardTileDTO, "pendingArtUrl" | "pendingLayersUrl" | "adultReviewedAt"> }) {
  const t = useT().admin.cards;
  const tl = useAdminLayersT();
  if (card.pendingArtUrl) return <Badge tone="info">{t.pendingArt}</Badge>;
  if (card.pendingLayersUrl) return <Badge tone="info">{tl.pending.badge}</Badge>;
  return card.adultReviewedAt ? <Badge tone="success">{t.reviewed}</Badge> : <Badge tone="danger">{t.notReviewed}</Badge>;
}

export function Notice({ state }: { state: ActionState | null }) {
  if (!state) return null;
  return <Alert tone={state.error ? "danger" : "success"}>{state.error ?? state.message}</Alert>;
}
