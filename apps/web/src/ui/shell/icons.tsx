"use client";

import {
  Activity,
  ChartColumn,
  ImageIcon,
  Library,
  Link2,
  Percent,
  Plus,
  Settings,
  Shield,
  UserRound,
  UsersRound,
  type Glyph,
} from "../icons/glyphs";
import { Sticker, type StickerName } from "../icons/Sticker";
import { cx } from "../variants";

/**
 * Los iconos se nombran con texto para poder pasarlos desde componentes de servidor. Spec 014: los iconos clave del
 * coleccionista son pegatinas kawaii (RF-3); el resto, iconos de doble tono (RF-4).
 */
export const ICONS = {
  packs: "pack",
  collection: "collection",
  album: "card",
  rewards: "gift",
  account: "profile",
  odds: Percent,
  overview: ChartColumn,
  metrics: Activity,
  sets: Library,
  characters: UsersRound,
  cards: ImageIcon,
  users: UserRound,
  tiers: Link2,
  settings: Settings,
  admin: Shield,
  plus: Plus,
} satisfies Record<string, StickerName | Glyph>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, className = "size-[18px]" }: { name: IconName; className?: string }) {
  const C = ICONS[name];
  // Las pegatinas tienen borde y sombra: se dibujan algo más grandes que el icono al que sustituyen.
  if (typeof C === "string") {
    const rest = className.replace(/size-\[18px\]/, "").trim();
    return <Sticker name={C} className={cx("-m-1", /(^|\s)size-/.test(rest) ? rest : cx("size-[26px]", rest))} />;
  }
  return <C aria-hidden className={className} />;
}
