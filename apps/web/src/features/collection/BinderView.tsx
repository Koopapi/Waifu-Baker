"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RARITIES, type Rarity } from "@/domain/catalog/card-rules";
import { filterBinder, type BinderMode } from "@/domain/collection/binder";
import { useLocale, useT } from "@/i18n/client";
import { formatDate } from "@/i18n/format";
import { Card3D } from "@/features/opening/Card3D";
import { useTiltSource } from "@/features/opening/useTiltSource";
import "@/features/opening/opening.css";

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

function CardSheet({ slot, setCode, onClose }: { slot: BinderSlotDTO & { owned: NonNullable<BinderSlotDTO["owned"]> }; setCode: string; onClose: () => void }) {
  const t = useT();
  const locale = useLocale();
  const ref = useRef<HTMLDialogElement>(null);
  const tilt = useTiltSource();
  const o = slot.owned;
  const [holo, setHolo] = useState(o.qty === 0 && o.holoQty > 0);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} onClose={onClose} className="m-auto w-[min(94vw,820px)] rounded-2xl border border-white/10 bg-[#15121f] p-0 text-[#f1eef8] backdrop:bg-black/75" data-testid="card-sheet">
      <div className="grid gap-6 p-6 md:grid-cols-[320px_1fr]">
        <div
          className="grid place-items-center rounded-xl bg-[radial-gradient(120%_80%_at_50%_15%,#1d1236_0%,#0b0912_70%)] p-4"
          style={{ perspective: 1200 }}
          data-testid="card-sheet-art"
          onPointerMove={tilt.onPointerMove}
          onPointerLeave={tilt.onPointerLeave}
        >
          <Card3D
            card={{ id: o.cardId, name: o.name, number: slot.number, rarity: o.rarity ?? "common", holo, image: o.mid, framed: true }}
            active
            mode={tilt.mode}
            tiltTarget={tilt.target}
            style={{ width: "100%" }}
          />
        </div>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-sm text-white/50">
                {setCode} · {pad(slot.number)}
              </p>
              <h2 className="text-2xl font-bold">{o.name || t.collection.binder.cardFallbackName(pad(slot.number))}</h2>
              <p className="text-white/70">{o.rarity ? t.common.rarity[o.rarity] : "—"}</p>
            </div>
            <button type="button" onClick={onClose} className="text-white/50 hover:text-white" aria-label={t.common.close}>
              ✕
            </button>
          </div>
          {o.flavorText && <p className="italic text-white/80">{t.collection.binder.flavorQuote(o.flavorText)}</p>}
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-white/10 p-3">
              <dt className="text-white/50">{t.collection.binder.normal}</dt>
              <dd className="text-xl font-semibold tabular-nums">x{o.qty}</dd>
            </div>
            <div className="rounded-lg border border-white/10 p-3">
              <dt className="text-white/50">{t.collection.binder.holo}</dt>
              <dd className="text-xl font-semibold tabular-nums">x{o.holoQty}</dd>
            </div>
          </dl>
          <p className="text-sm text-white/50">{t.collection.binder.firstObtained(formatDate(locale, o.firstObtainedAt, "long"))}</p>
          {o.holoQty > 0 && (
            <div className="flex gap-2 text-sm" role="group" aria-label={t.collection.binder.version}>
              <button type="button" aria-pressed={!holo} onClick={() => setHolo(false)} className={`rounded-full px-4 py-1.5 ${!holo ? "bg-white/15" : "border border-white/15"}`}>
                {t.collection.binder.normal}
              </button>
              <button type="button" aria-pressed={holo} onClick={() => setHolo(true)} className={`rounded-full px-4 py-1.5 ${holo ? "bg-white/15" : "border border-white/15"}`}>
                {t.collection.binder.holo}
              </button>
            </div>
          )}
          <p className="text-xs text-white/40">{t.collection.binder.aiHint}</p>
        </div>
      </div>
    </dialog>
  );
}

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
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={`rounded-full px-4 py-1.5 text-sm ${mode === m ? "bg-[#d6b370] font-semibold text-[#0b0c0e]" : "border border-white/15 text-white/80"}`}
          >
            {t.collection.binder.modes[m]}
          </button>
        ))}
        <select
          value={rarity}
          onChange={(e) => setRarity(e.target.value as Rarity | "")}
          aria-label={t.collection.binder.filterByRarity}
          className="rounded-full border border-white/15 bg-transparent px-3 py-1.5 text-sm"
        >
          <option value="">{t.collection.binder.allRarities}</option>
          {RARITIES.map((r) => (
            <option key={r} value={r} className="bg-[#15121f]">
              {t.common.rarity[r]}
            </option>
          ))}
        </select>
      </div>
      {visible.length === 0 && <p className="text-white/50">{t.collection.binder.noMatches}</p>}
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6" data-testid="binder-grid">
        {visible.map((s) =>
          s.owned ? (
            <li key={s.number} data-slot={s.number}>
              <button
                type="button"
                onClick={() => setOpen(s.number)}
                className={`binder-card group relative block w-full overflow-hidden rounded-xl ${s.owned.holoQty > 0 ? "binder-card--holo" : ""}`}
                aria-label={t.collection.binder.viewCard(pad(s.number))}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- enlace firmado y privado */}
                <img src={s.owned.thumb} alt={s.owned.name} loading="lazy" className="aspect-[63/88] w-full object-cover transition group-hover:scale-[1.03]" />
                <span className="absolute right-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums">x{s.owned.qty + s.owned.holoQty}</span>
                {s.owned.holoQty > 0 && <span className="absolute left-1.5 top-1.5 rounded-md bg-gradient-to-r from-pink-400 via-sky-300 to-yellow-200 px-1.5 py-0.5 text-[10px] font-bold text-black">HOLO</span>}
              </button>
            </li>
          ) : (
            <li key={s.number} data-slot={s.number} data-missing="true">
              <div className="grid aspect-[63/88] w-full place-items-center rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02]">
                <span className="font-mono text-lg text-white/25">{pad(s.number)}</span>
              </div>
            </li>
          ),
        )}
      </ul>
      {current?.owned && <CardSheet slot={current as BinderSlotDTO & { owned: NonNullable<BinderSlotDTO["owned"]> }} setCode={setCode} onClose={() => setOpen(null)} />}
    </div>
  );
}
