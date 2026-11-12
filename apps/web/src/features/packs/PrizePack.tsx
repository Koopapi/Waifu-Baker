"use client";

import type { PackViewData } from "@/domain/packs/view";
import { PackThumb } from "@/ui/game/sobre-capas/PackThumb";
import { useT } from "@/i18n/client";

/**
 * Spec 037, RF-1 a RF-5: el sobre que se recibe en una celebración (recompensa, regalo, Expediciones), con la misma
 * miniatura que «Mis sobres»: su diseño plata o gold o, si la colección no tiene, el sobre básico.
 */
export function PrizePack({ view, className }: { view: PackViewData; className?: string }) {
  const t = useT();
  return (
    <PackThumb
      registro={view.registro}
      thumb={view.thumb}
      label={`${view.name} (${view.code}) · ${t.common.packKind[view.kind]}`}
      textos={{ carta: t.packs.sobre.card, cartas: t.packs.sobre.cards }}
      className={className}
      data={{ "data-testid": "prize-pack", "data-kind": view.kind, "data-designed": view.designed ? "true" : undefined }}
    />
  );
}
