"use client";

import { Suspense, lazy, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RARITIES } from "@/domain/catalog/card-rules";
import { bulkUpdateCardsAction, reorderCardsAction } from "@/app/admin/sets/card-actions";
import type { ActionState } from "@/server/auth/admin-action";
import { Button } from "@/ui/action/Button";
import { EmptyState } from "@/ui/feedback/EmptyState";
import { Select } from "@/ui/form/Select";
import { CardDefaultsContext } from "./card-defaults-context";
import { FACTORY_CARD_DEFAULTS, type CardDefaults } from "@/domain/cards/card-defaults";
import { CardEditorLoader } from "./CardEditorLoader";
import { Notice } from "./card-bits";
import { CardTile } from "./CardTile";

// Spec 033: reordenar (con `@dnd-kit`) solo se descarga al pulsar «Reordenar».
const SortableGrid = lazy(() => import("./SortableGrid").then((m) => ({ default: m.SortableGrid })));
import type { CardTileDTO, CharacterOption, Permissions } from "./types";
import { NO_FILTERS, filtersToParams, isFiltered, optionCounts, parseFilters, visibleCards, type CardFilters as Filters } from "@/domain/cards/card-filters";
import { CardFilters } from "./CardFilters";
import { useT } from "@/i18n/client";

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
  const isAdultSet = perms.isAdultSet;
  // Spec 033: los personajes de la colección (no todos los del panel), para el filtro.
  const setCharacters = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of cards) if (c.characterId) m.set(c.characterId, c.characterName ?? "");
    return [...m].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [cards]);
  // RF-17 y RF-18: los filtros iniciales salen de la dirección; lo que no existe se ignora.
  const params = useSearchParams();
  const pathname = usePathname();
  const [filters, setFiltersState] = useState<Filters>(() => parseFilters(params, { characterIds: setCharacters.map((c) => c.id), isAdultSet }));
  const setFilters = (f: Filters) => {
    setFiltersState(f);
    // RF-16: la dirección se reescribe sin añadir una entrada al historial ni volver a pedir la página.
    const q = filtersToParams(f).toString();
    window.history.replaceState(window.history.state, "", `${pathname}${q ? `?${q}` : ""}`);
  };
  const filtered = isFiltered(filters);
  const visible = useMemo(() => visibleCards(cards, filters, isAdultSet), [cards, filters, isAdultSet]);
  const counts = useMemo(() => optionCounts(cards, isAdultSet), [cards, isAdultSet]);

  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  useEffect(() => {
    setOrder(cards.map((c) => c.id));
  }, [cards]);
  // RF-13: lo que deja de verse (o de existir) sale de la selección.
  useEffect(() => {
    const ids = new Set(visible.map((c) => c.id));
    setSelected((s) => ([...s].every((id) => ids.has(id)) ? s : new Set([...s].filter((id) => ids.has(id)))));
  }, [visible]);

  const toggle = (index: number) => (e: React.MouseEvent) => {
    const id = shown[index].id;
    setSelected((prev) => {
      const next = new Set(prev);
      if (e.shiftKey && anchor !== null) {
        const [a, b] = [Math.min(anchor, index), Math.max(anchor, index)];
        for (let i = a; i <= b; i++) next.add(shown[i].id);
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

  const onReorder = (next: string[]) => {
    setOrder(next);
    start(async () => {
      const r = await reorderCardsAction(setId, next);
      setState(r);
      router.refresh();
    });
  };

  if (cards.length === 0) return <EmptyState title={t.empty} />;

  const shown = sorting ? order.map((id) => byId.get(id)!).filter(Boolean) : visible;
  const grid = (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6" data-testid="card-grid">
      {shown.map((c, i) => (
        <CardTile
          key={c.id}
          card={c}
          sortable={sorting}
          isAdult={perms.isAdultSet}
          selected={selected.has(c.id)}
          onToggle={toggle(i)}
          onOpen={() => setEditing(latest(c))}
        />
      ))}
    </div>
  );
  // RF-12: con filtros, «Seleccionar todas» selecciona las que se ven.
  const allShownSelected = visible.length > 0 && visible.every((c) => selected.has(c.id));

  return (
    <CardDefaultsContext.Provider value={cardDefaults}>
    <div className="space-y-4">
      {!sorting && (
        <CardFilters filters={filters} onChange={setFilters} characters={setCharacters} counts={counts} isAdultSet={isAdultSet} shown={visible.length} total={cards.length} />
      )}
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
            <Button size="sm" variant="ghost" disabled={visible.length === 0} onClick={() => setSelected(allShownSelected ? new Set() : new Set(visible.map((c) => c.id)))}>
              {allShownSelected ? t.clearSelection : filtered ? t.filters.selectVisible(visible.length) : t.selectAll}
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
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  // RF-14: se reordena la colección entera, por número.
                  setFilters(NO_FILTERS);
                  setSorting(true);
                }}
                className="ml-auto"
              >
                {t.reorder}
              </Button>
            )}
          </>
        )}
        <div className="w-full empty:hidden">
          <Notice state={state} />
        </div>
      </div>

      {sorting ? (
        // Mientras se descarga el módulo de arrastrar, la misma cuadrícula sin selección.
        <Suspense fallback={grid}>
          <SortableGrid cards={shown} isAdult={perms.isAdultSet} onReorder={onReorder} />
        </Suspense>
      ) : (
        grid
      )}
      {/* RF-9: ninguna carta cumple los filtros. */}
      {!sorting && visible.length === 0 && (
        <EmptyState
          title={t.filters.none}
          action={
            <Button size="sm" variant="secondary" onClick={() => setFilters({ ...NO_FILTERS, sort: filters.sort })} data-testid="filters-empty-clear">
              {t.filters.clear}
            </Button>
          }
        />
      )}

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
