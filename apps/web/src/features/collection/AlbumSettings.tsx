"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { MAX_FEATURED } from "@/domain/collection/album-rules";
import type { Rarity } from "@/domain/catalog/card-rules";
import {
  activateAlbumAction,
  deactivateAlbumAction,
  regenerateAlbumLinkAction,
  saveFeaturedAction,
  type AlbumActionState,
} from "@/app/coleccion/album/actions";

interface FeaturableCard {
  cardId: string;
  number: number;
  name: string;
  rarity: Rarity;
  setCode: string;
  thumb: string;
}

const pad = (n: number) => String(n).padStart(3, "0");

function Status({ state }: { state: AlbumActionState }) {
  if (!state) return null;
  return (
    <p role="status" className={`text-sm ${state.error ? "text-red-300" : "text-emerald-300"}`}>
      {state.error ?? state.message}
    </p>
  );
}

function FeaturedPicker({ cards, initial }: { cards: FeaturableCard[]; initial: string[] }) {
  const [picked, setPicked] = useState<string[]>(initial.filter((id) => cards.some((c) => c.cardId === id)));
  const [state, setState] = useState<AlbumActionState>(null);
  const [pending, start] = useTransition();
  const byId = new Map(cards.map((c) => [c.cardId, c]));
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_FEATURED ? p : [...p, id]));
  const move = (i: number, d: -1 | 1) =>
    setPicked((p) => {
      const j = i + d;
      if (j < 0 || j >= p.length) return p;
      const n = [...p];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  if (cards.length === 0) return <p className="text-white/50">Cuando tengas cartas SFW podrás elegir hasta {MAX_FEATURED} destacadas.</p>;
  return (
    <div className="space-y-4" data-testid="featured-picker">
      <div>
        <p className="mb-2 text-sm text-white/60">
          Destacadas, en este orden ({picked.length} de {MAX_FEATURED}):
        </p>
        {picked.length === 0 ? (
          <p className="text-sm text-white/40">Aún no has elegido ninguna. Pulsa cartas de abajo.</p>
        ) : (
          <ol className="flex flex-wrap gap-2" data-testid="featured-order">
            {picked.map((id, i) => {
              const c = byId.get(id)!;
              return (
                <li key={id} className="flex items-center gap-1 rounded-full border border-white/15 py-1 pl-3 pr-1 text-sm">
                  <span>
                    {i + 1}. {c.name || `Carta ${pad(c.number)}`}
                  </span>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="px-1.5 text-white/60 disabled:opacity-30" aria-label={`Subir ${c.name}`}>
                    ↑
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === picked.length - 1} className="px-1.5 text-white/60 disabled:opacity-30" aria-label={`Bajar ${c.name}`}>
                    ↓
                  </button>
                  <button type="button" onClick={() => toggle(id)} className="px-1.5 text-white/60" aria-label={`Quitar ${c.name}`}>
                    ✕
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
        {cards.map((c) => {
          const on = picked.includes(c.cardId);
          const full = !on && picked.length >= MAX_FEATURED;
          return (
            <li key={c.cardId}>
              <button
                type="button"
                onClick={() => toggle(c.cardId)}
                disabled={full}
                aria-pressed={on}
                aria-label={`Destacar ${c.setCode} ${pad(c.number)}`}
                className={`relative block w-full overflow-hidden rounded-lg ring-2 transition disabled:opacity-40 ${on ? "ring-[#d6b370]" : "ring-transparent"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- enlace firmado y privado */}
                <img src={c.thumb} alt={c.name} loading="lazy" className="aspect-[63/88] w-full object-cover" />
                {on && (
                  <span className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-[#d6b370] text-xs font-bold text-black">
                    {picked.indexOf(c.cardId) + 1}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => setState(await saveFeaturedAction(picked)))}
          className="rounded-full bg-[#d6b370] px-4 py-1.5 text-sm font-semibold text-[#0b0c0e] disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar destacadas"}
        </button>
        <Status state={state} />
      </div>
    </div>
  );
}

export function AlbumSettings({
  album,
  cards,
}: {
  album: { isPublic: boolean; alias: string; url: string; featured: string[] } | null;
  cards: FeaturableCard[];
}) {
  const [aliasState, activate, activating] = useActionState(activateAlbumAction, null);
  const [state, setState] = useState<AlbumActionState>(null);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(t);
  }, [copied]);
  const active = Boolean(album?.isPublic);

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-white/10 p-5" data-testid="album-status">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-emerald-400" : "bg-white/30"}`} />
          <h2 className="text-lg font-semibold">{active ? "Tu álbum es público" : "Tu álbum es privado"}</h2>
        </div>
        {active && album && (
          <div className="flex flex-wrap items-center gap-2">
            <input readOnly value={album.url} aria-label="Enlace del álbum" className="min-w-0 basis-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm sm:basis-auto sm:flex-1" data-testid="album-url" />
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(album.url).then(() => setCopied(true))}
              className="rounded-full border border-white/20 px-4 py-2 text-sm"
            >
              {copied ? "¡Copiado!" : "Copiar"}
            </button>
            <a href={album.url} target="_blank" rel="noreferrer" className="rounded-full border border-white/20 px-4 py-2 text-sm">
              Ver
            </a>
          </div>
        )}
        <form action={activate} className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
            Alias que verán los visitantes
            <input
              name="alias"
              defaultValue={album?.alias ?? "Coleccionista"}
              minLength={2}
              maxLength={30}
              required
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2"
            />
          </label>
          <button disabled={activating} className="rounded-full bg-[#d6b370] px-4 py-2 text-sm font-semibold text-[#0b0c0e] disabled:opacity-50">
            {active ? "Guardar alias" : "Activar álbum público"}
          </button>
        </form>
        <Status state={aliasState} />
        {active && (
          <div className="flex flex-wrap gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              disabled={pending}
              onClick={() => start(async () => setState(await deactivateAlbumAction()))}
              className="rounded-full border border-white/20 px-4 py-1.5 text-sm"
            >
              Desactivar álbum
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (window.confirm("El enlace actual dejará de funcionar. ¿Crear uno nuevo?")) start(async () => setState(await regenerateAlbumLinkAction()));
              }}
              className="rounded-full border border-white/20 px-4 py-1.5 text-sm"
            >
              Generar enlace nuevo
            </button>
          </div>
        )}
        <Status state={state} />
      </section>
      {album && (
        <section className="space-y-4 rounded-2xl border border-white/10 p-5">
          <h2 className="text-lg font-semibold">Cartas destacadas</h2>
          <FeaturedPicker cards={cards} initial={album.featured} />
        </section>
      )}
    </div>
  );
}
