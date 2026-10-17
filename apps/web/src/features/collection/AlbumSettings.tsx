"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { MAX_FEATURED } from "@/domain/collection/album-rules";
import type { Rarity } from "@/domain/catalog/card-rules";
import type { ModerationState } from "@/domain/collection/moderation";
import {
  activateAlbumAction,
  deactivateAlbumAction,
  regenerateAlbumLinkAction,
  requestReviewAction,
  saveFeaturedAction,
  type AlbumActionState,
} from "@/app/(app)/coleccion/album/actions";
import { ArrowDown, ArrowUp, X } from "@/ui/icons/glyphs";
import { useT } from "@/i18n/client";
import { Button, IconButton } from "@/ui/action/Button";
import { Card } from "@/ui/content/Card";
import { Alert } from "@/ui/feedback/Alert";
import { focusRing } from "@/ui/focus";
import { TextField } from "@/ui/form/TextField";
import { useConfirm } from "@/ui/overlay/Confirm";

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
  return <Alert tone={state.error ? "danger" : "success"}>{state.error ?? state.message}</Alert>;
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
                <li key={id} className="flex items-center gap-1 rounded-m border border-ui-line py-1 pl-3 pr-1 text-sm">
                  <span>
                    {i + 1}. {c.name || t.collection.binder.cardFallbackName(pad(c.number))}
                  </span>
                  <IconButton size="sm" onClick={() => move(i, -1)} disabled={i === 0} label={t.collection.album.moveUp(c.name)}>
                    <ArrowUp aria-hidden className="size-4" />
                  </IconButton>
                  <IconButton size="sm" onClick={() => move(i, 1)} disabled={i === picked.length - 1} label={t.collection.album.moveDown(c.name)}>
                    <ArrowDown aria-hidden className="size-4" />
                  </IconButton>
                  <IconButton size="sm" onClick={() => toggle(id)} label={t.collection.album.remove(c.name)}>
                    <X aria-hidden className="size-4" />
                  </IconButton>
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
                className={`relative block w-full overflow-hidden rounded-m ring-2 transition-[box-shadow,opacity] duration-[var(--duration-fast)] disabled:opacity-40 ${on ? "ring-ui-accent" : "ring-transparent"} ${focusRing}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- enlace firmado y privado */}
                <img src={c.thumb} alt={c.name} loading="lazy" className="aspect-[63/88] w-full object-cover" />
                {on && (
                  <span className="absolute right-1 top-1 grid size-6 place-items-center rounded-s bg-ui-accent text-xs font-bold text-ui-on-accent">
                    {picked.indexOf(c.cardId) + 1}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <Button loading={pending} onClick={() => start(async () => setState(await saveFeaturedAction(picked)))}>
          {t.collection.album.saveFeatured}
        </Button>
        <Status state={state} />
      </div>
    </div>
  );
}

interface ModerationInfo {
  moderation: ModerationState;
  hiddenReason: string | null;
  hiddenNote: string | null;
  reviewAlias: string | null;
  reviewNote: string | null;
}

/** Spec 012, RF-7 a RF-10 y RF-12: aviso al dueño de un álbum oculto y petición de revisión. */
function ModerationNotice({ m }: { m: ModerationInfo }) {
  const t = useT().collection.album.moderation;
  const [state, request, requesting] = useActionState(requestReviewAction, null);
  const reason = t.reasons[m.hiddenReason as keyof typeof t.reasons] ?? m.hiddenReason ?? "";
  return (
    <Card className="space-y-4" data-testid="album-moderation">
      <Alert tone="danger" title={t.hiddenTitle}>
        <p>{t.hiddenBody(reason)}</p>
        {m.hiddenNote && <p>{t.adminNote(m.hiddenNote)}</p>}
      </Alert>
      {m.moderation === "review_requested" ? (
        <Alert tone="warning" title={t.requested}>
          {t.requestedBody(m.reviewAlias ?? "")}
        </Alert>
      ) : (
        <>
          {m.moderation === "review_rejected" && (
            <Alert tone="warning" title={t.rejectedTitle}>
              {m.reviewNote && t.adminNote(m.reviewNote)}
            </Alert>
          )}
          <p className="text-sm text-ui-text-2">{t.requestIntro}</p>
          <form action={request} className="flex flex-wrap items-end gap-3">
            <TextField label={t.newAlias} name="alias" minLength={2} maxLength={30} required fieldClassName="min-w-0 flex-1" />
            <Button loading={requesting}>{t.request}</Button>
          </form>
        </>
      )}
      <Status state={state} />
    </Card>
  );
}

export function AlbumSettings({
  album,
  cards,
}: {
  album: ({ isPublic: boolean; alias: string; url: string; featured: string[] } & ModerationInfo) | null;
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
  const confirm = useConfirm();

  return (
    <div className="space-y-6">
      {album && album.moderation !== "none" ? (
        <ModerationNotice m={album} />
      ) : (
      <Card className="space-y-4" data-testid="album-status">
        <div className="flex items-center gap-3">
          <span aria-hidden className={`size-2.5 rounded-full ${active ? "bg-ui-success" : "bg-ui-hover"}`} />
          <h2 className="text-lg font-semibold">{active ? t.collection.album.isPublic : t.collection.album.isPrivate}</h2>
        </div>
        {active && album && (
          <div className="flex flex-wrap items-end gap-2">
            <TextField readOnly value={album.url} label={t.collection.album.linkLabel} hideLabel fieldClassName="min-w-0 basis-full sm:basis-auto sm:flex-1" className="font-mono" data-testid="album-url" />
            <Button variant="secondary" onClick={() => void navigator.clipboard?.writeText(album.url).then(() => setCopied(true))}>
              {copied ? t.collection.album.copied : t.collection.album.copy}
            </Button>
            <Button variant="secondary" asChild>
              <a href={album.url} target="_blank" rel="noreferrer">
                {t.collection.album.view}
              </a>
            </Button>
          </div>
        )}
        <form action={activate} className="flex flex-wrap items-end gap-3">
          <TextField
            label={t.collection.album.aliasLabel}
            name="alias"
            defaultValue={album?.alias ?? t.collection.album.defaultAlias}
            minLength={2}
            maxLength={30}
            required
            fieldClassName="min-w-0 flex-1"
          />
          <Button loading={activating}>{active ? t.collection.album.saveAlias : t.collection.album.activate}</Button>
        </form>
        <Status state={aliasState} />
        {active && (
          <div className="flex flex-wrap gap-3 border-t border-ui-line pt-4">
            <Button variant="secondary" disabled={pending} onClick={() => start(async () => setState(await deactivateAlbumAction()))}>
              {t.collection.album.deactivate}
            </Button>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={async () => {
                if (await confirm({ title: t.collection.album.regenerate, body: t.collection.album.regenerateConfirm, confirmLabel: t.collection.album.regenerate, tone: "danger" }))
                  start(async () => setState(await regenerateAlbumLinkAction()));
              }}
            >
              {t.collection.album.regenerate}
            </Button>
          </div>
        )}
        <Status state={state} />
      </Card>
      )}
      {album && (
        <Card className="space-y-4" title={t.collection.album.featuredTitle}>
          <FeaturedPicker cards={cards} initial={album.featured} />
        </Card>
      )}
    </div>
  );
}
