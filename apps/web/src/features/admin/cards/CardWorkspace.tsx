"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RARITIES, type Rarity } from "@/domain/catalog/card-rules";
import { bulkUpdateCardsAction, deleteCardAction, reorderCardsAction, reviewCardAction, updateCardAction } from "@/app/admin/sets/card-actions";
import type { ActionState } from "@/server/auth/admin-action";
import { inputCls } from "@/features/admin/ui";
import { CardPreview } from "./CardPreview";
import type { CardDTO, CharacterOption, Permissions } from "./types";
import { useLocale, useT } from "@/i18n/client";
import { formatPercent } from "@/i18n/format";
import type { Locale } from "@/i18n";

const RARITY_DOT: Record<Rarity, string> = {
  common: "bg-[#9aa0a6]",
  uncommon: "bg-[#4ade80]",
  rare: "bg-[#60a5fa]",
  epic: "bg-[#c084fc]",
  legendary: "bg-[#f5c451]",
  secret: "bg-[#ff6ad5]",
};

const pad = (n: number) => String(n).padStart(3, "0");
const pct = (locale: Locale, x: number) => formatPercent(locale, x * 100, x < 0.01 ? 2 : 1);

function ReviewBadge({ card }: { card: CardDTO }) {
  const t = useT().admin.cards;
  if (card.pendingArtUrl) return <span className="text-sky-300">{t.pendingArt}</span>;
  return card.adultReviewedAt ? <span className="text-emerald-300">{t.reviewed}</span> : <span className="text-rose-300">{t.notReviewed}</span>;
}

function Notice({ state }: { state: ActionState | null }) {
  if (!state) return null;
  return (
    <p role={state.error ? "alert" : "status"} className={`text-sm ${state.error ? "text-red-300" : "text-emerald-300"}`}>
      {state.error ?? state.message}
    </p>
  );
}

function Tile({
  card,
  selected,
  onToggle,
  onOpen,
  sortable,
  isAdult,
}: {
  card: CardDTO;
  selected: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onOpen: () => void;
  sortable: boolean;
  isAdult: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id, disabled: !sortable });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined };
  const tt = useT();
  const t = tt.admin.cards;
  const locale = useLocale();
  return (
    <div
      ref={setNodeRef}
      style={style}
      data-card-tile={card.number}
      id={`carta-${pad(card.number)}`}
      className={`group relative overflow-hidden rounded-xl border bg-white/[0.03] ${selected ? "border-[#d6b370] ring-2 ring-[#d6b370]/60" : "border-white/10"} ${isDragging ? "opacity-80 shadow-2xl" : ""}`}
      {...(sortable ? { ...attributes, ...listeners } : {})}
    >
      <button type="button" onClick={sortable ? undefined : onOpen} className={`block w-full ${sortable ? "cursor-grab" : "cursor-pointer"}`} aria-label={t.editAria(pad(card.number))}>
        {card.thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- recurso privado servido por la API del panel
          <img src={card.thumbUrl} alt="" className="aspect-[63/88] w-full object-cover" draggable={false} />
        ) : (
          <div className="grid aspect-[63/88] place-items-center text-xs text-white/40">{t.processing}</div>
        )}
      </button>
      {!sortable && (
        <label className="absolute left-2 top-2 grid h-7 w-7 cursor-pointer place-items-center rounded-md bg-black/60" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => {}}
            onClick={onToggle}
            aria-label={t.selectAria(pad(card.number))}
            className="h-4 w-4 accent-[#d6b370]"
          />
        </label>
      )}
      <div className="space-y-1 p-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-white/50">{pad(card.number)}</span>
          {card.rarity ? (
            <span className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${RARITY_DOT[card.rarity]}`} />
              {tt.common.rarity[card.rarity]}
            </span>
          ) : (
            <span className="text-amber-300">{t.noRarity}</span>
          )}
        </div>
        <div className="truncate font-medium">{card.name || <span className="text-white/40">{tt.admin.noName}</span>}</div>
        <div className="flex items-center justify-between gap-2 text-white/50">
          <span className="truncate">{card.characterName ?? t.noCharacter}</span>
          {card.status === "ready" ? <span className="text-emerald-300">{t.ready}</span> : <span className="text-amber-300">{t.incomplete}</span>}
        </div>
        <div className="flex items-center justify-between gap-2 text-white/40">
          <span title={t.chanceTitle}>{t.perPack(pct(locale, card.chance))}</span>
          {isAdult && <ReviewBadge card={card} />}
        </div>
      </div>
    </div>
  );
}

function CardEditor({
  setId,
  card,
  characters,
  perms,
  onClose,
}: {
  setId: string;
  card: CardDTO;
  characters: CharacterOption[];
  perms: Permissions;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const tt = useT();
  const t = tt.admin.cards;
  const locale = useLocale();
  const [state, setState] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const save = (fd: FormData) =>
    start(async () => {
      const r = await updateCardAction(setId, card.id, card.version, fd);
      setState(r);
      if (r.ok) {
        router.refresh();
        onClose();
      }
    });

  const [file, setFile] = useState<File | null>(null);

  const review = (reviewed: boolean) =>
    start(async () => {
      const r = await reviewCardAction(setId, card.id, card.version, reviewed);
      setState(r);
      if (r.ok) {
        router.refresh();
        onClose();
      }
    });

  const replaceArt = () =>
    start(async () => {
      if (!file) return;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("version", String(card.version));
      const res = await fetch(`/api/admin/cards/${card.id}/art`, { method: "POST", body: fd });
      const body = await res.json().catch(() => ({ ok: false, message: tt.admin.serverError(res.status) }));
      setState(body.ok ? { ok: true, message: body.pending ? t.newArtPending : t.artReplaced } : { ok: false, error: body.message });
      if (body.ok) {
        router.refresh();
        onClose();
      }
    });

  const remove = () =>
    start(async () => {
      if (!window.confirm(t.confirmDelete(pad(card.number)))) return;
      const r = await deleteCardAction(setId, card.id);
      setState(r);
      if (r.ok) {
        router.refresh();
        onClose();
      }
    });

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      className="m-auto w-[min(92vw,860px)] rounded-2xl border border-white/10 bg-[#15121f] p-0 text-[#ece9f5] backdrop:bg-black/70"
    >
      <form action={save} className="grid gap-6 p-6 md:grid-cols-[300px_1fr]">
        <div>
          <CardPreview card={card} />
          <p className="mt-2 text-xs text-white/40">{t.tiltHint}</p>
          {card.pendingArtUrl && (
            <div className="mt-3 space-y-1 rounded-lg border border-sky-400/30 p-2">
              <p className="text-xs text-sky-300">{t.pendingArtNote}</p>
              {/* eslint-disable-next-line @next/next/no-img-element -- original privado servido por la API del panel */}
              <img src={card.pendingArtUrl} alt={t.pendingArtAlt} className="w-full rounded" />
            </div>
          )}
          <div className="mt-3 space-y-2">
            <span className="text-xs uppercase tracking-wider text-white/60">{t.replaceArt}</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-xs" data-testid="replace-art" />
            {file && (
              <button type="button" onClick={replaceArt} disabled={pending} className="rounded-full border border-white/15 px-3 py-1.5 text-xs">
                {t.uploadNewArt}
              </button>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-bold">{t.cardN(pad(card.number))}</h2>
            <button type="button" onClick={onClose} className="text-white/50 hover:text-white" aria-label={tt.common.close}>
              ✕
            </button>
          </div>
          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wider text-white/60">{t.name}</span>
            <input name="name" defaultValue={card.name} maxLength={60} className={inputCls} autoFocus />
          </label>
          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wider text-white/60">{t.flavorText}</span>
            <textarea name="flavorText" defaultValue={card.flavorText} rows={2} className={inputCls} />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-wider text-white/60">{t.character}</span>
              <select name="characterId" defaultValue={card.characterId ?? ""} className={inputCls}>
                <option value="">{t.noCharacter}</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-wider text-white/60">{t.rarity}</span>
              <select name="rarity" defaultValue={card.rarity ?? "__none"} disabled={!perms.canEditRarity} className={inputCls}>
                <option value="__none">{t.noRarity}</option>
                {RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {tt.common.rarity[r]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-wider text-white/60">{t.variant}</span>
              <select name="variant" defaultValue={card.variant} disabled={!perms.canEditRarity} className={inputCls}>
                <option value="normal">{t.variants.normal}</option>
                <option value="holo">{t.variants.holo}</option>
                <option value="alt">{t.variants.alt}</option>
              </select>
            </label>
          </div>
          <p className="text-xs text-white/50">{t.chance(pct(locale, card.chance))}</p>
          {perms.isAdultSet && (
            <div className="space-y-2 rounded-lg border border-rose-400/30 bg-rose-400/5 p-3" data-testid="review-box">
              <p className="text-sm">
                {t.review18} <ReviewBadge card={card} />
              </p>
              {card.adultReviewedAt && !card.pendingArtUrl ? (
                <button type="button" onClick={() => review(false)} disabled={pending} className="rounded-full border border-white/15 px-3 py-1.5 text-xs">
                  {t.removeReview}
                </button>
              ) : (
                <button type="button" onClick={() => review(true)} disabled={pending} className="rounded-full bg-rose-300 px-3 py-1.5 text-xs font-semibold text-black">
                  {card.pendingArtUrl ? t.approveNewArt : t.confirmAdult}
                </button>
              )}
            </div>
          )}
          <Notice state={state} />
          <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
            <button disabled={pending} className="rounded-full bg-[#d6b370] px-5 py-2 text-sm font-semibold text-[#0b0c0e] disabled:opacity-60">
              {pending ? tt.common.saving : tt.common.save}
            </button>
            <button type="button" onClick={onClose} className="rounded-full border border-white/15 px-4 py-2 text-sm">
              {tt.common.cancel}
            </button>
            {perms.canRemove && (
              <button type="button" onClick={remove} disabled={pending} className="ml-auto rounded-full border border-red-400/40 px-4 py-2 text-sm text-red-300">
                {t.deleteCard}
              </button>
            )}
          </div>
        </div>
      </form>
    </dialog>
  );
}

/** RF-14 y RF-15: cuadrícula con selección múltiple, edición en lote y reordenación. */
export function CardWorkspace({
  setId,
  cards,
  characters,
  perms,
}: {
  setId: string;
  cards: CardDTO[];
  characters: CharacterOption[];
  perms: Permissions;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<number | null>(null);
  const [editing, setEditing] = useState<CardDTO | null>(null);
  const [sorting, setSorting] = useState(false);
  const [order, setOrder] = useState(cards.map((c) => c.id));
  const [bulk, setBulk] = useState({ characterId: "", rarity: "", variant: "" });
  const [state, setState] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const tt = useT();
  const t = tt.admin.cards;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  useEffect(() => {
    setOrder(cards.map((c) => c.id));
    setSelected((s) => new Set([...s].filter((id) => cards.some((c) => c.id === id))));
  }, [cards]);

  const toggle = (index: number) => (e: React.MouseEvent) => {
    const id = cards[index].id;
    setSelected((prev) => {
      const next = new Set(prev);
      if (e.shiftKey && anchor !== null) {
        const [a, b] = [Math.min(anchor, index), Math.max(anchor, index)];
        for (let i = a; i <= b; i++) next.add(cards[i].id);
      } else if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setAnchor(index);
  };

  const applyBulk = () =>
    start(async () => {
      const patch: { characterId?: string; rarity?: string; variant?: string } = {};
      if (bulk.characterId) patch.characterId = bulk.characterId;
      if (bulk.rarity) patch.rarity = bulk.rarity;
      if (bulk.variant) patch.variant = bulk.variant;
      if (!Object.keys(patch).length) return setState({ ok: false, error: t.pickSomething });
      const versions = Object.fromEntries([...selected].map((id) => [id, byId.get(id)!.version]));
      const r = await bulkUpdateCardsAction(setId, versions, patch);
      setState(r);
      if (r.ok) {
        setSelected(new Set());
        setBulk({ characterId: "", rarity: "", variant: "" });
        router.refresh();
      }
    });

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = order.indexOf(String(e.active.id));
    const to = order.indexOf(String(e.over.id));
    const next = arrayMove(order, from, to);
    setOrder(next);
    start(async () => {
      const r = await reorderCardsAction(setId, next);
      setState(r);
      router.refresh();
    });
  };

  if (cards.length === 0) return <p className="text-sm text-white/50">{t.empty}</p>;

  const shown = sorting ? order.map((id) => byId.get(id)!).filter(Boolean) : cards;

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-20 -mx-2 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#0f0d16]/95 px-4 py-3 backdrop-blur">
        {sorting ? (
          <>
            <span className="text-sm">{t.dragHint}</span>
            <button onClick={() => setSorting(false)} className="ml-auto rounded-full bg-[#d6b370] px-4 py-1.5 text-sm font-semibold text-[#0b0c0e]">
              {t.done}
            </button>
          </>
        ) : (
          <>
            <span className="text-sm tabular-nums">
              {t.selectedCount(selected.size, cards.length)}
            </span>
            <button className="text-sm underline" onClick={() => setSelected(selected.size === cards.length ? new Set() : new Set(cards.map((c) => c.id)))}>
              {selected.size === cards.length ? t.clearSelection : t.selectAll}
            </button>
            {selected.size > 0 && (
              <>
                <select aria-label={t.bulkCharacterAria} value={bulk.characterId} onChange={(e) => setBulk({ ...bulk, characterId: e.target.value })} className={`${inputCls} w-auto`}>
                  <option value="">{t.bulkCharacter}</option>
                  <option value="__none">{t.removeCharacter}</option>
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {perms.canEditRarity && (
                  <>
                    <select aria-label={t.bulkRarityAria} value={bulk.rarity} onChange={(e) => setBulk({ ...bulk, rarity: e.target.value })} className={`${inputCls} w-auto`}>
                      <option value="">{t.bulkRarity}</option>
                      {RARITIES.map((r) => (
                        <option key={r} value={r}>
                          {tt.common.rarity[r]}
                        </option>
                      ))}
                    </select>
                    <select aria-label={t.bulkVariantAria} value={bulk.variant} onChange={(e) => setBulk({ ...bulk, variant: e.target.value })} className={`${inputCls} w-auto`}>
                      <option value="">{t.bulkVariant}</option>
                      <option value="normal">{t.variants.normal}</option>
                      <option value="holo">{t.variants.holo}</option>
                      <option value="alt">{t.variants.alt}</option>
                    </select>
                  </>
                )}
                <button onClick={applyBulk} disabled={pending} className="rounded-full bg-[#d6b370] px-4 py-1.5 text-sm font-semibold text-[#0b0c0e] disabled:opacity-60">
                  {pending ? t.applying : t.apply}
                </button>
              </>
            )}
            {perms.canReorder && selected.size === 0 && (
              <button onClick={() => setSorting(true)} className="ml-auto rounded-full border border-white/15 px-4 py-1.5 text-sm">
                {t.reorder}
              </button>
            )}
          </>
        )}
        <div className="w-full empty:hidden">
          <Notice state={state} />
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6" data-testid="card-grid">
            {shown.map((c) => (
              <Tile
                key={c.id}
                card={c}
                sortable={sorting}
                isAdult={perms.isAdultSet}
                selected={selected.has(c.id)}
                onToggle={toggle(cards.indexOf(c))}
                onOpen={() => setEditing(c)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {editing && <CardEditor setId={setId} card={editing} characters={characters} perms={perms} onClose={() => setEditing(null)} />}
    </div>
  );
}
