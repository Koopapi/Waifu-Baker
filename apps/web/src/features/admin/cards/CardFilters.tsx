"use client";

import { useState } from "react";
import { RARITIES, type Rarity } from "@/domain/catalog/card-rules";
import { NO_CHARACTER, NO_FILTERS, PENDING_KINDS, SORTS, activeFilterCount, isFiltered, type CardFilters as Filters, type CardSort, type PendingKind } from "@/domain/cards/card-filters";
import { useT } from "@/i18n/client";
import { Button } from "@/ui/action/Button";
import { Select } from "@/ui/form/Select";
import { TextField } from "@/ui/form/TextField";
import { ToggleChips } from "@/ui/form/ToggleChips";

export type FilterCounts = { characters: Record<string, number>; rarities: Record<Rarity, number>; pending: Record<PendingKind, number> };

/**
 * Spec 033, RF-1 a RF-10: la barra de filtros de la cuadrícula. Las fichas dicen cuántas cartas tiene cada opción; en
 * pantallas estrechas la barra se pliega en «Filtros (n)».
 */
export function CardFilters({
  filters,
  onChange,
  characters,
  counts,
  isAdultSet,
  shown,
  total,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  /** Los personajes de la colección, con su nombre. */
  characters: { id: string; name: string }[];
  counts: FilterCounts;
  isAdultSet: boolean;
  shown: number;
  total: number;
}) {
  const tt = useT();
  const t = tt.admin.cards.filters;
  const [open, setOpen] = useState(false);
  const filtered = isFiltered(filters);
  const active = activeFilterCount(filters);
  const pendingKinds = PENDING_KINDS.filter((p) => p !== "adult_review" || isAdultSet);
  const characterOptions = [
    ...characters.map((c) => ({ value: c.id, label: c.name, count: counts.characters[c.id] ?? 0 })),
    ...(counts.characters[NO_CHARACTER] ? [{ value: NO_CHARACTER, label: t.noCharacter, count: counts.characters[NO_CHARACTER] }] : []),
  ];

  return (
    <div className="space-y-3" data-testid="card-filters">
      <div className="flex flex-wrap items-end gap-3">
        <TextField
          label={t.search}
          hideLabel
          placeholder={t.search}
          type="search"
          value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
          fieldClassName="min-w-48 flex-1"
          data-testid="filters-search"
        />
        <div data-testid="filters-sort">
          <Select
            label={t.sort}
            hideLabel
            value={filters.sort}
            onValueChange={(v) => onChange({ ...filters, sort: v as CardSort })}
            options={SORTS.map((s) => ({ value: s, label: `${t.sort}: ${t.sorts[s]}` }))}
            className="w-44"
          />
        </div>
        <Button size="sm" variant="secondary" className="sm:hidden" aria-expanded={open} onClick={() => setOpen((o) => !o)} data-testid="filters-toggle">
          {t.toggle(active)}
        </Button>
      </div>
      <div className={`${open ? "flex" : "hidden"} flex-col gap-3 sm:flex sm:flex-row sm:flex-wrap sm:gap-6`} data-testid="filters-panel">
        {characterOptions.length > 0 && (
          <ToggleChips label={t.character} options={characterOptions} value={filters.characters} onValueChange={(v) => onChange({ ...filters, characters: v })} data-testid="filter-character" />
        )}
        <ToggleChips
          label={t.rarity}
          options={RARITIES.map((r) => ({ value: r, label: tt.common.rarity[r], count: counts.rarities[r] }))}
          value={filters.rarities}
          onValueChange={(v) => onChange({ ...filters, rarities: v as Rarity[] })}
          data-testid="filter-rarity"
        />
        <ToggleChips
          label={t.pending}
          options={pendingKinds.map((p) => ({ value: p, label: t.pendingKinds[p], count: counts.pending[p] }))}
          value={filters.pending}
          onValueChange={(v) => onChange({ ...filters, pending: v as PendingKind[] })}
          data-testid="filter-pending"
        />
      </div>
      <div className="flex min-h-8 items-center gap-3">
        {/* RF-8 y accesibilidad: cuántas se ven, anunciado a los lectores de pantalla. */}
        <p aria-live="polite" className="text-sm tabular-nums text-ui-text-2" data-testid="filters-count">
          {filtered ? t.shown(shown, total) : ""}
        </p>
        {filtered && (
          <Button size="sm" variant="ghost" onClick={() => onChange({ ...NO_FILTERS, sort: filters.sort })} data-testid="filters-clear">
            {t.clear}
          </Button>
        )}
      </div>
    </div>
  );
}
