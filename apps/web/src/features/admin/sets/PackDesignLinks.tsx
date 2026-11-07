"use client";

import Link from "next/link";
import type { PackViewData } from "@/domain/packs/view";
import { useT } from "@/i18n/client";
import { useAdminPacksT } from "@/i18n/admin-packs";
import { Button } from "@/ui/action/Button";
import { Badge } from "@/ui/content/Badge";
import { PackThumb } from "@/ui/game/sobre-capas/PackThumb";

/** Spec 030, RF-1 y RF-15: los dos sobres de la colección (plata y gold), con su diseño o el básico, y su editor. */
export function PackDesignLinks({ setId, views }: { setId: string; views: PackViewData[] }) {
  const t = useAdminPacksT();
  const tt = useT();
  return (
    <div className="space-y-3 border-t border-ui-line pt-4" data-testid="pack-designs">
      <div>
        <h3 className="text-base font-bold text-ui-text">{t.card.title}</h3>
        <p className="text-sm text-ui-text-2">{t.card.intro}</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {views.map((v) => (
          <li key={v.kind} className="flex items-center gap-4 rounded-m border border-ui-line p-3" data-testid={`pack-design-${v.kind}`} data-designed={v.designed || undefined}>
            <PackThumb registro={v.registro} thumb={v.thumb} label={`${v.name} (${v.code}) · ${tt.common.packKind[v.kind]}`} textos={{ carta: tt.packs.sobre.card, cartas: tt.packs.sobre.cards }} className="w-[72px] shrink-0" />
            <div className="min-w-0 space-y-2">
              <Badge tone={v.designed ? "success" : "neutral"}>{v.designed ? t.card.designed : t.card.basic}</Badge>
              <Button size="sm" variant="secondary" asChild>
                <Link href={`/admin/sets/${setId}/pack/${v.kind}`} data-testid={`pack-design-edit-${v.kind}`}>
                  {t.card.edit(tt.common.packKind[v.kind])}
                </Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
