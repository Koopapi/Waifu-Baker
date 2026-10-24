"use client";

import { Suspense, lazy, useMemo, useState } from "react";
import { RARITIES, type Rarity } from "@/domain/catalog/card-rules";
import { filterBinder, type BinderMode } from "@/domain/collection/binder";
import { useT } from "@/i18n/client";
import "@/features/opening/opening.css";
import { Button } from "@/ui/action/Button";
import { focusRing } from "@/ui/focus";
import { Select } from "@/ui/form/Select";

export interface BinderSlotDTO {
  number: number;
  owned: {
    cardId: string;
    name: string;
    rarity: Rarity | null;
    flavorText: string;
    qty: number;
    holoQty: number;
    firstObtainedAt: string;
    thumb: string;
    mid: string;
  } | null;
}

const pad = (n: number) => String(n).padStart(3, "0");
const MODES: BinderMode[] = ["all", "owned", "missing", "holo"];
// Spec 011 (RNF de peso): el modal de la ficha se descarga al abrir la primera carta.
const CardSheet = lazy(() => import("./CardSheet").then((m) => ({ default: m.CardSheet })));

export function BinderView({ slots, setCode }: { slots: BinderSlotDTO[]; setCode: string }) {
  const t = useT();
  const [mode, setMode] = useState<BinderMode>("all");
  const [rarity, setRarity] = useState<Rarity | "">("");
  const [open, setOpen] = useState<number | null>(null);
  const shown = useMemo(
    () =>
      filterBinder(
        slots.map((s) => ({ ...s, owned: s.owned ? { ...s.owned, firstObtainedAt: new Date(s.owned.firstObtainedAt) } : null })),
        { mode, rarity: rarity || null },
      ).map((s) => s.number),
    [slots, mode, rarity],
  );
  const visible = slots.filter((s) => shown.includes(s.number));
  const current = slots.find((s) => s.number === open && s.owned);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2" data-testid="binder-filters">
        {MODES.map((m) => (
          <Button key={m} size="sm" variant={mode === m ? "primary" : "secondary"} onClick={() => setMode(m)} aria-pressed={mode === m}>
            {t.collection.binder.modes[m]}
          </Button>
        ))}
        <Select
          label={t.collection.binder.filterByRarity}
          hideLabel
          value={rarity}
          onValueChange={(v) => setRarity(v as Rarity | "")}
          options={[{ value: "", label: t.collection.binder.allRarities }, ...RARITIES.map((r) => ({ value: r, label: t.common.rarity[r] }))]}
          className="ml-auto w-48"
        />
      </div>
      {visible.length === 0 && <p className="text-ui-text-3">{t.collection.binder.noMatches}</p>}
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6" data-testid="binder-grid">
        {visible.map((s) =>
          s.owned ? (
            <li key={s.number} data-slot={s.number}>
              <button
                type="button"
                onClick={() => setOpen(s.number)}
                className={`binder-card group relative block w-full overflow-hidden rounded-l ${focusRing} ${s.owned.holoQty > 0 ? "binder-card--holo holo-finish" : ""}`}
                aria-label={t.collection.binder.viewCard(pad(s.number))}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- enlace firmado y privado */}
                <img src={s.owned.thumb} alt={s.owned.name} loading="lazy" className="aspect-[63/88] w-full object-cover transition group-hover:scale-[1.03]" />
                {/* Spec 014, RF-20: abajo a la izquierda, sin tapar el símbolo de la colección (arriba a la derecha). */}
                <span data-testid="copies" className="absolute bottom-1.5 left-1.5 rounded-full border-2 border-k-blanco/70 bg-k-tinta/85 px-2 py-0.5 text-[11px] font-black tabular-nums">x{s.owned.qty + s.owned.holoQty}</span>
                {s.owned.holoQty > 0 && <span className="absolute left-1.5 top-1.5 rounded-md bg-gradient-to-r from-pink-400 via-sky-300 to-yellow-200 px-1.5 py-0.5 text-[10px] font-bold text-ui-rail">HOLO</span>}
              </button>
            </li>
          ) : (
            <li key={s.number} data-slot={s.number} data-missing="true">
              <div className="grid aspect-[63/88] w-full place-items-center rounded-l border-2 border-dashed border-ui-line bg-ui-raised">
                <span className="font-mono text-lg text-ui-text-3">{pad(s.number)}</span>
              </div>
            </li>
          ),
        )}
      </ul>
      {current?.owned && (
        <Suspense fallback={null}>
          <CardSheet slot={current as BinderSlotDTO & { owned: NonNullable<BinderSlotDTO["owned"]> }} setCode={setCode} onClose={() => setOpen(null)} />
        </Suspense>
      )}
    </div>
  );
}
