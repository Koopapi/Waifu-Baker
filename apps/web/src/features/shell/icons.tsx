"use client";

import {
  Activity,
  BookOpen,
  ChartColumn,
  Gift,
  Image as ImageIcon,
  LayoutGrid,
  Library,
  Link2,
  Package,
  Percent,
  Plus,
  Settings,
  Shield,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

/** Los iconos se nombran con texto para poder pasarlos desde componentes de servidor. */
export const ICONS = {
  packs: Package,
  collection: LayoutGrid,
  album: BookOpen,
  rewards: Gift,
  account: UserRound,
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
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, className = "size-[18px]" }: { name: IconName; className?: string }) {
  const C = ICONS[name];
  return <C aria-hidden className={className} strokeWidth={2} />;
}
