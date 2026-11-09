"use client";

import { focusRing } from "@/ui/focus";
import { Checkbox } from "@/ui/form/Choice";
import { useLocale, useT } from "@/i18n/client";
import { pad, pct, RARITY_DOT, ReviewBadge } from "./card-bits";
import type { CardTileDTO } from "./types";

export type TileDrag = { ref: (el: HTMLElement | null) => void; style: React.CSSProperties; handlers: Record<string, unknown>; isDragging: boolean };

/** Una carta de la cuadrícula del panel. */
export function CardTile({
  card,
  selected,
  onToggle,
  onOpen,
  sortable,
  isAdult,
  drag,
}: {
  card: CardTileDTO;
  selected: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onOpen: () => void;
  sortable: boolean;
  isAdult: boolean;
  /** Spec 033: lo que añade el modo «Reordenar» (se descarga solo al pulsarlo, ver `SortableGrid`). */
  drag?: TileDrag;
}) {
  const isDragging = drag?.isDragging ?? false;
  const tt = useT();
  const t = tt.admin.cards;
  const locale = useLocale();
  return (
    <div
      ref={drag?.ref}
      style={drag?.style}
      data-card-tile={card.number}
      id={`carta-${pad(card.number)}`}
      className={`group relative overflow-hidden rounded-l border bg-ui-raised ${selected ? "border-ui-accent ring-2 ring-ui-accent/60" : "border-ui-line"} ${isDragging ? "opacity-80 shadow-3" : ""}`}
      {...(sortable ? drag?.handlers : {})}
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
