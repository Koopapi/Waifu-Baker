"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCoverCardsAction } from "@/app/admin/settings/actions";
import { COVER_MAX } from "@/domain/catalog/cover-cards";
import type { Rarity } from "@/domain/catalog/card-rules";
import { useAdminDefaultsT } from "@/i18n/admin-defaults";
import { useT } from "@/i18n/client";
import type { ActionState } from "@/server/auth/admin-action";
import { FormMessage } from "../ui";
import { Button, IconButton } from "@/ui/action/Button";
import { Badge } from "@/ui/content/Badge";
import { Select } from "@/ui/form/Select";
import { ArrowDown, ArrowUp, X } from "@/ui/icons/glyphs";

export interface CoverOption {
  id: string;
  setCode: string;
  number: number;
  name: string;
  rarity: Rarity | null;
  thumbUrl: string | null;
}

/**
 * Spec 028, RF-20: elegir de 3 a 5 cartas de portada (solo de colecciones publicadas que no sean 18+) y su orden, de
 * izquierda a derecha del abanico. Una carta elegida que ya no vale (RF-22) se ve marcada para quitarla.
 */
export function CoverCardsForm({ current, candidates }: { current: string[]; candidates: CoverOption[] }) {
  const t = useAdminDefaultsT().cover;
  const tt = useT();
  const [ids, setIds] = useState(current);
  const [state, setState] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const label = (c: CoverOption) => `${c.setCode} · ${String(c.number).padStart(3, "0")} · ${c.name || t.noName}${c.rarity ? ` · ${tt.common.rarity[c.rarity]}` : ""}`;
  const dirty = JSON.stringify(ids) !== JSON.stringify(current);
  const move = (i: number, to: number) =>
    setIds((prev) => {
      const next = [...prev];
      const [x] = next.splice(i, 1);
      next.splice(to, 0, x);
      return next;
    });
  const free = candidates.filter((c) => !ids.includes(c.id));

  return (
    <form
      data-testid="cover-cards-form"
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await setCoverCardsAction(ids);
          setState(r);
          if (r.ok) router.refresh();
        });
      }}
    >
      {candidates.length === 0 ? (
        <p className="text-sm text-ui-text-3">{t.noCandidates}</p>
      ) : (
        <Select
          label={t.add}
          value=""
          placeholder={t.search}
          searchable
          searchPlaceholder={t.search}
          emptyText={t.noResults}
          disabled={ids.length >= COVER_MAX}
          options={free.map((c) => ({ value: c.id, label: label(c) }))}
          onValueChange={(id) => id && setIds((prev) => (prev.length < COVER_MAX && !prev.includes(id) ? [...prev, id] : prev))}
          hint={t.count(ids.length)}
        />
      )}
      {ids.length === 0 ? (
        <p className="text-sm text-ui-text-3" data-testid="cover-empty">
          {t.empty}
        </p>
      ) : (
        <ol className="space-y-2" data-testid="cover-list">
          {ids.map((id, i) => {
            const c = byId.get(id);
            const name = c ? label(c) : id.slice(0, 8);
            return (
              <li key={id} className="flex items-center gap-3 rounded-m border border-ui-line bg-ui-raised p-2" data-testid="cover-item">
                <span className="w-5 text-center font-mono text-xs text-ui-text-3">{i + 1}</span>
                {c?.thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- miniatura privada servida por la API del panel
                  <img src={c.thumbUrl} alt="" className="h-14 w-10 shrink-0 rounded-s object-cover" />
                ) : (
                  <span className="h-14 w-10 shrink-0 rounded-s bg-ui-rail" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
                {!c && <Badge tone="warning">{t.invalid}</Badge>}
                <IconButton label={t.left(name)} size="sm" variant="ghost" disabled={i === 0} onClick={() => move(i, i - 1)}>
                  <ArrowUp className="size-4" aria-hidden />
                </IconButton>
                <IconButton label={t.right(name)} size="sm" variant="ghost" disabled={i === ids.length - 1} onClick={() => move(i, i + 1)}>
                  <ArrowDown className="size-4" aria-hidden />
                </IconButton>
                <IconButton label={t.remove(name)} size="sm" variant="ghost" onClick={() => setIds((prev) => prev.filter((x) => x !== id))}>
                  <X className="size-4" aria-hidden />
                </IconButton>
              </li>
            );
          })}
        </ol>
      )}
      <Button type="submit" loading={pending} disabled={!dirty} data-testid="cover-cards-save">
        {t.save}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
