"use client";

import { useEffect } from "react";
import { markCelebratedAction } from "@/app/sobres/arrivals-actions";
import { arrivalsKey, type ArrivalOrigin } from "@/domain/rewards/arrivals";
import { PackArt, type PackArtData } from "@/features/packs/PackArt";
import { useCelebrations } from "@/features/rewards/celebrations";
import { useT } from "@/i18n/client";

export interface ArrivalsGroupDTO {
  total: number;
  ids: string[];
  sets: { setId: string; code: string; name: string; count: number; art: PackArtData }[];
  origin: ArrivalOrigin;
}

/**
 * Spec 015, RF-6, RF-7 y RF-9: al cargar una página del coleccionista con llegadas sin celebrar, encola una sola
 * celebración que las junta; al mostrarse, se marcan celebradas. No pinta nada: la cola decide cuándo sale.
 */
export function ArrivalsCelebration({ group }: { group: ArrivalsGroupDTO | null }) {
  const { celebrate } = useCelebrations();
  const t = useT().rewards.fx;
  useEffect(() => {
    if (!group || group.sets.length === 0) return;
    const first = group.sets[0];
    const kicker = { welcome: t.arrivals.welcome, gift: t.arrivals.gift, tier: t.arrivals.tier, mixed: t.arrivals.mixed }[group.origin];
    celebrate({
      key: arrivalsKey(group.ids),
      kicker,
      title: t.arrivals.title(group.total),
      detail: group.sets.map((s) => (s.count > 1 ? `${s.name} ×${s.count}` : s.name)).join(" · "),
      count: group.total,
      art: <PackArt setId={first.setId} code={first.code} name={first.name} art={first.art} className="w-[min(180px,26dvh)]" />,
      primary: { label: t.goToPacks, href: "/sobres" },
      onShown: () => void markCelebratedAction(group.ids),
    });
    // Solo al cargar con este grupo; las traducciones no cambian de clave.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, celebrate]);
  return null;
}
