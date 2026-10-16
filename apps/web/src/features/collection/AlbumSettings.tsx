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
} from "@/app/(app)/coleccion/album/actions";
import { useT } from "@/i18n/client";

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
  const t = useT();
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

  if (cards.length === 0) return <p className="text-ui-text-3">{t.collection.album.featuredEmpty(MAX_FEATURED)}</p>;
  return (
    <div className="space-y-4" data-testid="featured-picker">
      <div>
        <p className="mb-2 text-sm text-ui-text-2">
          {t.collection.album.featuredOrder(picked.length, MAX_FEATURED)}
        </p>
        {picked.length === 0 ? (
          <p className="text-sm text-ui-text-3">{t.collection.album.featuredNone}</p>
        ) : (
          <ol className="flex flex-wrap gap-2" data-testid="featured-order">
            {picked.map((id, i) => {
              const c = byId.get(id)!;
              return (
                <li key={id} className="flex items-center gap-1 rounded-full border border-ui-line py-1 pl-3 pr-1 text-sm">
                  <span>
                    {i + 1}. {c.name || t.collection.binder.cardFallbackName(pad(c.number))}
                  </span>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="px-1.5 text-ui-text-2 disabled:opacity-30" aria-label={t.collection.album.moveUp(c.name)}>
                    ↑
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === picked.length - 1} className="px-1.5 text-ui-text-2 disabled:opacity-30" aria-label={t.collection.album.moveDown(c.name)}>
                    ↓
                  </button>
                  <button type="button" onClick={() => toggle(id)} className="px-1.5 text-ui-text-2" aria-label={t.collection.album.remove(c.name)}>
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
                aria-label={t.collection.album.feature(c.setCode, pad(c.number))}
                className={`relative block w-full overflow-hidden rounded-lg ring-2 transition disabled:opacity-40 ${on ? "ring-ui-accent" : "ring-transparent"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- enlace firmado y privado */}
                <img src={c.thumb} alt={c.name} loading="lazy" className="aspect-[63/88] w-full object-cover" />
                {on && (
                  <span className="absolute right-1 top-1 grid h-6 w-6 place-items-center btn rounded-md bg-ui-accent hover:bg-ui-accent-hover text-xs font-bold text-black">
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
          className="btn rounded-md bg-ui-accent hover:bg-ui-accent-hover px-4 py-1.5 text-sm font-semibold text-ui-on-accent disabled:opacity-50"
        >
          {pending ? t.common.saving : t.collection.album.saveFeatured}
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
  const t = useT();
  const [aliasState, activate, activating] = useActionState(activateAlbumAction, null);
  const [state, setState] = useState<AlbumActionState>(null);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);
  const active = Boolean(album?.isPublic);

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-ui-line p-5" data-testid="album-status">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-emerald-400" : "bg-white/30"}`} />
          <h2 className="text-lg font-semibold">{active ? t.collection.album.isPublic : t.collection.album.isPrivate}</h2>
        </div>
        {active && album && (
          <div className="flex flex-wrap items-center gap-2">
            <input readOnly value={album.url} aria-label={t.collection.album.linkLabel} className="min-w-0 basis-full rounded-lg border border-ui-line bg-black/30 px-3 py-2 font-mono text-sm sm:basis-auto sm:flex-1" data-testid="album-url" />
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(album.url).then(() => setCopied(true))}
              className="btn rounded-md border border-ui-line px-4 py-2 text-sm hover:bg-ui-hover"
            >
              {copied ? t.collection.album.copied : t.collection.album.copy}
            </button>
            <a href={album.url} target="_blank" rel="noreferrer" className="btn rounded-md border border-ui-line px-4 py-2 text-sm hover:bg-ui-hover">
              {t.collection.album.view}
            </a>
          </div>
        )}
        <form action={activate} className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
            {t.collection.album.aliasLabel}
            <input
              name="alias"
              defaultValue={album?.alias ?? t.collection.album.defaultAlias}
              minLength={2}
              maxLength={30}
              required
              className="rounded-lg border border-ui-line bg-black/30 px-3 py-2"
            />
          </label>
          <button disabled={activating} className="btn rounded-md bg-ui-accent hover:bg-ui-accent-hover px-4 py-2 text-sm font-semibold text-ui-on-accent disabled:opacity-50">
            {active ? t.collection.album.saveAlias : t.collection.album.activate}
          </button>
        </form>
        <Status state={aliasState} />
        {active && (
          <div className="flex flex-wrap gap-3 border-t border-ui-line pt-4">
            <button
              type="button"
              disabled={pending}
              onClick={() => start(async () => setState(await deactivateAlbumAction()))}
              className="btn rounded-md border border-ui-line px-4 py-1.5 text-sm hover:bg-ui-hover"
            >
              {t.collection.album.deactivate}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (window.confirm(t.collection.album.regenerateConfirm)) start(async () => setState(await regenerateAlbumLinkAction()));
              }}
              className="btn rounded-md border border-ui-line px-4 py-1.5 text-sm hover:bg-ui-hover"
            >
              {t.collection.album.regenerate}
            </button>
          </div>
        )}
        <Status state={state} />
      </section>
      {album && (
        <section className="space-y-4 rounded-2xl border border-ui-line p-5">
          <h2 className="text-lg font-semibold">{t.collection.album.featuredTitle}</h2>
          <FeaturedPicker cards={cards} initial={album.featured} />
        </section>
      )}
    </div>
  );
}
