"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CardTile } from "./CardTile";
import type { CardTileDTO } from "./types";

/**
 * Spec 015, RF-15: reordenar arrastrando. Desde la spec 033 este módulo (con `@dnd-kit`) solo se descarga al pulsar
 * «Reordenar», para que la página de la colección quede dentro de su presupuesto.
 */
export function SortableGrid({ cards, isAdult, onReorder }: { cards: CardTileDTO[]; isAdult: boolean; onReorder: (ids: string[]) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const ids = cards.map((c) => c.id);
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    onReorder(arrayMove(ids, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id))));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6" data-testid="card-grid">
          {cards.map((c) => (
            <SortableTile key={c.id} card={c} isAdult={isAdult} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableTile({ card, isAdult }: { card: CardTileDTO; isAdult: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  return (
    <CardTile
      card={card}
      sortable
      isAdult={isAdult}
      selected={false}
      onToggle={() => {}}
      onOpen={() => {}}
      drag={{ ref: setNodeRef, style: { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }, handlers: { ...attributes, ...listeners }, isDragging }}
    />
  );
}
