"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RARITIES } from "@/domain/catalog/card-rules";
import { bulkUpdateCardsAction, reorderCardsAction } from "@/app/admin/sets/card-actions";
import type { ActionState } from "@/server/auth/admin-action";
import { Button } from "@/ui/action/Button";
import { EmptyState } from "@/ui/feedback/EmptyState";
import { focusRing } from "@/ui/focus";
import { Checkbox } from "@/ui/form/Choice";
import { Select } from "@/ui/form/Select";
import { CardDefaultsContext } from "./card-defaults-context";
import { FACTORY_CARD_DEFAULTS, type CardDefaults } from "@/domain/cards/card-defaults";
import { CardEditorLoader } from "./CardEditorLoader";
import { Notice, pad, pct, RARITY_DOT, ReviewBadge } from "./card-bits";
import type { CardTileDTO, CharacterOption, Permissions } from "./types";
import { useLocale, useT } from "@/i18n/client";

function Tile({
  card,
  selected,
  onToggle,
  onOpen,
  sortable,
  isAdult,
}: {
  card: CardTileDTO;
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
          // Spec 031, RF-6: la miniatura se descarga cuando la carta está cerca de verse.
          // eslint-disable-next-line @next/next/no-img-element -- recurso privado servido por la API del panel
          <img src={card.thumbUrl} alt="" loading="lazy" decoding="async" className="aspect-[700/991] w-full object-cover" draggable={false} />
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


/** RF-14 y RF-15: cuadrícula con selección múltiple, edición en lote y reordenación. */
export function CardWorkspace({
  setId,
  cards,
  characters,
  perms,
  cardDefaults = FACTORY_CARD_DEFAULTS,
}: {
  setId: string;
  /** Spec 031, RF-2: solo lo que muestra la cuadrícula; la carta completa la pide la ventana al abrirse. */
  cards: CardTileDTO[];
  characters: CharacterOption[];
  perms: Permissions;
  /** Spec 028, RF-15: sello y borde por defecto vigentes (ajustes del panel). */
  cardDefaults?: CardDefaults;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<number | null>(null);
  const [editing, setEditing] = useState<CardTileDTO | null>(null);
  // Última versión conocida de cada carta guardada desde aquí (el refresco del servidor puede tardar).
  const [known, setKnown] = useState<Record<string, number>>({});
  const latest = (c: CardTileDTO) => (known[c.id] && known[c.id] > c.version ? { ...c, version: known[c.id] } : c);
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
      const versions = Object.fromEntries([...selected].map((id) => [id, latest(byId.get(id)!).version]));
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
    <CardDefaultsContext.Provider value={cardDefaults}>
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
        // Spec 031, RF-8 a RF-12: la ventana abre al instante y el editor llega después.
        <CardEditorLoader
          key={editing.id}
          setId={setId}
          tile={latest(byId.get(editing.id) ?? editing)}
          characters={characters}
          perms={perms}
          onClose={() => setEditing(null)}
          onSaved={(v) => setKnown((k) => ({ ...k, [editing.id]: Math.max(k[editing.id] ?? 0, v) }))}
        />
      )}
    </div>
    </CardDefaultsContext.Provider>
  );
}
