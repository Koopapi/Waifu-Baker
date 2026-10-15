"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { RARITIES } from "@/domain/catalog/card-rules";
import { openAllPacksAction, type OpenAllCard } from "@/app/sobres/actions";
import "./open-all.css";

const rank = (r: OpenAllCard["rarity"]) => RARITIES.indexOf(r);

/** RF-18: abre todos los sobres de la colección y muestra las cartas, nuevas y raras primero. */
export function OpenAllView({ setId, setName, sealed }: { setId: string; setName: string; sealed: number }) {
  const [cards, setCards] = useState<OpenAllCard[] | null>(null);
  const [opened, setOpened] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const sorted = useMemo(
    () =>
      [...(cards ?? [])].sort(
        (a, b) => rank(b.rarity) - rank(a.rarity) || Number(b.isNew) - Number(a.isNew) || Number(b.holo) - Number(a.holo) || a.number - b.number,
      ),
    [cards],
  );
  // Cantidad final de cada versión tras abrir todo el lote (no la de cada momento intermedio).
  const finalQty = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cards ?? []) m.set(`${c.number}-${c.holo}`, Math.max(m.get(`${c.number}-${c.holo}`) ?? 0, c.qtyAfter));
    return m;
  }, [cards]);
  const stats = useMemo(() => {
    const c = cards ?? [];
    return { total: c.length, nuevas: c.filter((x) => x.isNew).length, holo: c.filter((x) => x.holo).length, pity: c.filter((x) => x.pity).length };
  }, [cards]);

  const openAll = () =>
    start(async () => {
      setError(null);
      const r = await openAllPacksAction(setId);
      if (!r.ok) return setError(r.error);
      setOpened(r.packs);
      setCards(r.cards);
    });

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/sobres" className="text-sm text-white/50 hover:text-white">
            ← Mis sobres
          </Link>
          <h1 className="text-3xl font-bold">Abrir todos · {setName}</h1>
        </div>
        {!cards && (
          <button
            type="button"
            onClick={openAll}
            disabled={pending || sealed === 0}
            className="rounded-full bg-[#d6b370] px-6 py-2.5 font-semibold text-[#0b0c0e] disabled:opacity-50"
            data-testid="open-all"
          >
            {pending ? "Abriendo…" : sealed === 0 ? "No quedan sobres" : `Abrir ${sealed} sobre(s)`}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
      {cards && (
        <>
          <p className="text-white/70" data-testid="open-all-summary">
            {opened} sobre(s) abiertos · {stats.total} cartas · {stats.nuevas} nuevas · {stats.holo} holo
            {stats.pity > 0 && ` · ${stats.pity} garantizada(s) por la protección`}
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6" data-testid="open-all-grid">
            {sorted.map((c, i) => (
              <li
                key={c.key}
                className={`oa-card rarity-${c.rarity} ${c.isNew ? "oa-card--new" : ""} ${c.holo ? "oa-card--holo" : ""}`}
                style={{ animationDelay: `${Math.min(i, 40) * 45}ms` }}
              >
                <div className="oa-card__art">
                  {/* eslint-disable-next-line @next/next/no-img-element -- enlace firmado y privado */}
                  <img src={c.image} alt={c.name} loading="lazy" />
                </div>
                <div className="oa-card__meta">
                  <span className="oa-card__name">{c.name}</span>
                  <span>
                    {c.rarityLabel}
                    {c.holo ? " · holo" : ""}
                  </span>
                  <span className={c.isNew ? "text-emerald-300" : "text-white/50"}>{c.isNew ? "¡Nueva!" : `Tienes ${finalQty.get(`${c.number}-${c.holo}`) ?? c.qtyAfter}`}</span>
                </div>
              </li>
            ))}
          </ul>
          <Link href="/sobres" className="inline-block rounded-full border border-white/20 px-5 py-2 text-sm">
            Volver a mis sobres
          </Link>
        </>
      )}
    </main>
  );
}
