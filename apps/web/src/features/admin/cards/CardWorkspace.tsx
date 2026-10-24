"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RARITIES, type Rarity } from "@/domain/catalog/card-rules";
import { bulkUpdateCardsAction, deleteCardAction, reorderCardsAction, reviewCardAction, updateCardAction } from "@/app/admin/sets/card-actions";
import type { ActionState } from "@/server/auth/admin-action";
import { Button } from "@/ui/action/Button";
import { Badge } from "@/ui/content/Badge";
import { Alert } from "@/ui/feedback/Alert";
import { EmptyState } from "@/ui/feedback/EmptyState";
import { focusRing } from "@/ui/focus";
import { Checkbox } from "@/ui/form/Choice";
import { Select } from "@/ui/form/Select";
import { TextArea, TextField } from "@/ui/form/TextField";
import { useConfirm } from "@/ui/overlay/Confirm";
import { Modal } from "@/ui/overlay/Modal";
import { CardPreview } from "./CardPreview";
import { LayersEditor } from "./LayersEditor";
import type { LibraryEntry } from "@/features/admin/library/LibraryPicker";
import type { CardDTO, CharacterOption, Permissions } from "./types";
import { useLocale, useT } from "@/i18n/client";
import { useAdminLayersT } from "@/i18n/admin-layers";
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
  if (card.pendingArtUrl) return <Badge tone="info">{t.pendingArt}</Badge>;
  return card.adultReviewedAt ? <Badge tone="success">{t.reviewed}</Badge> : <Badge tone="danger">{t.notReviewed}</Badge>;
}

function Notice({ state }: { state: ActionState | null }) {
  if (!state) return null;
  return <Alert tone={state.error ? "danger" : "success"}>{state.error ?? state.message}</Alert>;
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
      className={`group relative overflow-hidden rounded-l border bg-ui-raised ${selected ? "border-ui-accent ring-2 ring-ui-accent/60" : "border-ui-line"} ${isDragging ? "opacity-80 shadow-3" : ""}`}
      {...(sortable ? { ...attributes, ...listeners } : {})}
    >
      <button type="button" onClick={sortable ? undefined : onOpen} className={`block w-full ${sortable ? "cursor-grab" : "cursor-pointer"} ${focusRing}`} aria-label={t.editAria(pad(card.number))}>
        {card.thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- recurso privado servido por la API del panel
          <img src={card.thumbUrl} alt="" className="aspect-[700/991] w-full object-cover" draggable={false} />
        ) : (
          <div className="grid aspect-[700/991] place-items-center text-xs text-ui-text-3">{t.processing}</div>
        )}
      </button>
      {!sortable && (
        <div className="absolute left-2 top-2 grid size-7 place-items-center rounded-m bg-ui-rail/80">
          {/* Mayúsculas + clic selecciona un rango (onToggle recibe el evento). */}
          <Checkbox checked={selected} onClick={onToggle} label={<span className="sr-only">{t.selectAria(pad(card.number))}</span>} className="gap-0" />
        </div>
      )}
      <div className="space-y-1 p-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-ui-text-3">{pad(card.number)}</span>
          {card.rarity ? (
            <span className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${RARITY_DOT[card.rarity]}`} />
              {tt.common.rarity[card.rarity]}
            </span>
          ) : (
            <span className="text-ui-warning-text">{t.noRarity}</span>
          )}
        </div>
        <div className="truncate font-medium">{card.name || <span className="text-ui-text-3">{tt.admin.noName}</span>}</div>
        <div className="flex items-center justify-between gap-2 text-ui-text-3">
          <span className="truncate">{card.characterName ?? t.noCharacter}</span>
          {card.status === "ready" ? <span className="text-ui-success-text">{t.ready}</span> : <span className="text-ui-warning-text">{t.incomplete}</span>}
        </div>
        <div className="flex items-center justify-between gap-2 text-ui-text-3">
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
  library,
  perms,
  onClose,
  onSaved,
}: {
  setId: string;
  card: CardDTO;
  characters: CharacterOption[];
  library: LibraryEntry[];
  perms: Permissions;
  onClose: () => void;
  /** Versión nueva tras guardar: la cuadrícula la recuerda aunque el refresco llegue tarde. */
  onSaved: (version: number) => void;
}) {
  const tt = useT();
  const tl = useAdminLayersT();
  const confirm = useConfirm();
  const t = tt.admin.cards;
  const locale = useLocale();
  const [state, setState] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const save = (fd: FormData) =>
    start(async () => {
      const r = await updateCardAction(setId, card.id, card.version, fd);
      setState(r);
      if (r.version) onSaved(r.version);
      if (r.code === "stale_version") router.refresh();
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
      if (r.version) onSaved(r.version);
      if (r.code === "stale_version") router.refresh();
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
      // Spec 017, RF-3: si la chica nueva no está recortada, el editor sigue abierto para que se vea el aviso.
      if (body.ok && body.uncut) {
        setState({ ok: true, message: `${t.artReplaced} ${tl.uncut}` });
        router.refresh();
        return;
      }
      if (body.ok) {
        router.refresh();
        onClose();
      }
    });

  const remove = async () => {
    // Spec 011, RF-12: borrar una carta es irreversible.
    if (!(await confirm({ title: t.deleteCard, body: t.confirmDelete(pad(card.number)), confirmLabel: t.deleteCard, tone: "danger" }))) return;
    start(async () => {
      const r = await deleteCardAction(setId, card.id);
      setState(r);
      if (r.ok) {
        router.refresh();
        onClose();
      }
    });
  };

  return (
    <Modal open onOpenChange={(open) => !open && onClose()} size="xl" testId="card-editor" closeLabel={tt.common.close} title={t.cardN(pad(card.number))} description={t.chance(pct(locale, card.chance))}>
      <form action={save} className="grid gap-6 md:grid-cols-[300px_1fr]">
        <div>
          <CardPreview card={card} />
          <p className="mt-2 text-xs text-ui-text-3">{t.tiltHint}</p>
          {card.pendingArtUrl && (
            <div className="mt-3 space-y-1 rounded-m border border-ui-info/40 p-2">
              <p className="text-xs text-ui-info-text">{t.pendingArtNote}</p>
              {/* eslint-disable-next-line @next/next/no-img-element -- original privado servido por la API del panel */}
              <img src={card.pendingArtUrl} alt={t.pendingArtAlt} className="w-full rounded-s" />
            </div>
          )}
          <div className="mt-3 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-ui-text-2">{t.replaceArt}</span>
            <input type="file" accept="image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-xs text-ui-text-2" data-testid="replace-art" />
            {file && (
              <Button size="sm" variant="secondary" onClick={replaceArt} disabled={pending}>
                {t.uploadNewArt}
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <TextField label={t.name} name="name" defaultValue={card.name} maxLength={60} autoFocus />
          <TextArea label={t.flavorText} name="flavorText" defaultValue={card.flavorText} rows={2} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label={t.character}
              name="characterId"
              defaultValue={card.characterId ?? ""}
              searchable={characters.length > 8}
              options={[{ value: "", label: t.noCharacter }, ...characters.map((c) => ({ value: c.id, label: c.name }))]}
            />
            <Select
              label={t.rarity}
              name="rarity"
              defaultValue={card.rarity ?? "__none"}
              disabled={!perms.canEditRarity}
              options={[{ value: "__none", label: t.noRarity }, ...RARITIES.map((r) => ({ value: r, label: tt.common.rarity[r] }))]}
            />
            <Select
              label={t.variant}
              name="variant"
              defaultValue={card.variant}
              disabled={!perms.canEditRarity}
              options={[
                { value: "normal", label: t.variants.normal },
                { value: "holo", label: t.variants.holo },
                { value: "alt", label: t.variants.alt },
              ]}
            />
          </div>
          {perms.isAdultSet && (
            <div className="space-y-2 rounded-m border border-ui-danger/40 bg-ui-danger/5 p-3" data-testid="review-box">
              <p className="flex flex-wrap items-center gap-2 text-sm">
                {t.review18} <ReviewBadge card={card} />
              </p>
              {card.adultReviewedAt && !card.pendingArtUrl ? (
                <Button size="sm" variant="secondary" onClick={() => review(false)} disabled={pending}>
                  {t.removeReview}
                </Button>
              ) : (
                <Button size="sm" onClick={() => review(true)} disabled={pending}>
                  {card.pendingArtUrl ? t.approveNewArt : t.confirmAdult}
                </Button>
              )}
            </div>
          )}
          <Notice state={state} />
          <div className="flex flex-wrap items-center gap-3 border-t border-ui-line pt-4">
            <Button type="submit" loading={pending}>
              {tt.common.save}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              {tt.common.cancel}
            </Button>
            {perms.canRemove && (
              <Button variant="danger" onClick={remove} disabled={pending} className="ml-auto">
                {t.deleteCard}
              </Button>
            )}
          </div>
        </div>
      </form>
      {/* Spec 016: la carta por capas se guarda aparte del formulario de la carta. */}
      <LayersEditor card={card} library={library} onSaved={onSaved} />
    </Modal>
  );
}

/** RF-14 y RF-15: cuadrícula con selección múltiple, edición en lote y reordenación. */
export function CardWorkspace({
  setId,
  cards,
  characters,
  library = [],
  perms,
}: {
  setId: string;
  cards: CardDTO[];
  characters: CharacterOption[];
  /** Spec 017, RF-8: la biblioteca general de elementos, para armar las cartas en el editor de capas. */
  library?: LibraryEntry[];
  perms: Permissions;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<number | null>(null);
  const [editing, setEditing] = useState<CardDTO | null>(null);
  // Última versión conocida de cada carta guardada desde aquí (el refresco del servidor puede tardar).
  const [known, setKnown] = useState<Record<string, number>>({});
  const latest = (c: CardDTO) => (known[c.id] && known[c.id] > c.version ? { ...c, version: known[c.id] } : c);
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

  if (cards.length === 0) return <EmptyState title={t.empty} />;

  const shown = sorting ? order.map((id) => byId.get(id)!).filter(Boolean) : cards;

  return (
    <div className="space-y-4">
      <div className="sticky top-[calc(var(--banner-h,0px)+52px)] z-10 -mx-2 flex flex-wrap items-end gap-3 rounded-l border border-ui-line bg-ui-bg/95 px-4 py-3 backdrop-blur">
        {sorting ? (
          <>
            <span className="text-sm">{t.dragHint}</span>
            <Button size="sm" onClick={() => setSorting(false)} className="ml-auto">
              {t.done}
            </Button>
          </>
        ) : (
          <>
            <span className="text-sm tabular-nums">
              {t.selectedCount(selected.size, cards.length)}
            </span>
            <Button size="sm" variant="ghost" onClick={() => setSelected(selected.size === cards.length ? new Set() : new Set(cards.map((c) => c.id)))}>
              {selected.size === cards.length ? t.clearSelection : t.selectAll}
            </Button>
            {selected.size > 0 && (
              <>
                <Select
                  label={t.bulkCharacterAria}
                  hideLabel
                  value={bulk.characterId}
                  onValueChange={(v) => setBulk({ ...bulk, characterId: v })}
                  searchable={characters.length > 8}
                  options={[{ value: "", label: t.bulkCharacter }, { value: "__none", label: t.removeCharacter }, ...characters.map((c) => ({ value: c.id, label: c.name }))]}
                  className="w-52"
                />
                {perms.canEditRarity && (
                  <>
                    <Select
                      label={t.bulkRarityAria}
                      hideLabel
                      value={bulk.rarity}
                      onValueChange={(v) => setBulk({ ...bulk, rarity: v })}
                      options={[{ value: "", label: t.bulkRarity }, ...RARITIES.map((r) => ({ value: r, label: tt.common.rarity[r] }))]}
                      className="w-44"
                    />
                    <Select
                      label={t.bulkVariantAria}
                      hideLabel
                      value={bulk.variant}
                      onValueChange={(v) => setBulk({ ...bulk, variant: v })}
                      options={[
                        { value: "", label: t.bulkVariant },
                        { value: "normal", label: t.variants.normal },
                        { value: "holo", label: t.variants.holo },
                        { value: "alt", label: t.variants.alt },
                      ]}
                      className="w-40"
                    />
                  </>
                )}
                <Button size="sm" onClick={applyBulk} loading={pending}>
                  {pending ? t.applying : t.apply}
                </Button>
              </>
            )}
            {perms.canReorder && selected.size === 0 && (
              <Button size="sm" variant="secondary" onClick={() => setSorting(true)} className="ml-auto">
                {t.reorder}
              </Button>
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
                onOpen={() => setEditing(latest(c))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {editing && (
        <CardEditor
          setId={setId}
          card={latest(byId.get(editing.id) ?? editing)}
          characters={characters}
          library={library}
          perms={perms}
          onClose={() => setEditing(null)}
          onSaved={(v) => setKnown((k) => ({ ...k, [editing.id]: Math.max(k[editing.id] ?? 0, v) }))}
        />
      )}
    </div>
  );
}
