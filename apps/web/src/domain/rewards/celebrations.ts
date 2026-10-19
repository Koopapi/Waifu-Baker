// Spec 015, RF-9: cola de celebraciones. Puro: de una en una, en el orden en que se ganaron, nunca repetida y
// nunca encima de la apertura de un sobre.

export interface Celebrable {
  /** Identidad de la celebración (p. ej. `arrivals:<ids>`), para no encolarla dos veces. */
  key: string;
}

export function enqueue<T extends Celebrable>(queue: readonly T[], item: T): T[] {
  return queue.some((q) => q.key === item.key) ? [...queue] : [...queue, item];
}

export function dismiss<T>(queue: readonly T[]): T[] {
  return queue.slice(1);
}

/** La que toca mostrar, o ninguna si la pantalla actual no admite celebraciones. */
export function current<T>(queue: readonly T[], blocked: boolean): T | null {
  return blocked ? null : (queue[0] ?? null);
}

/** Las rutas de la apertura (`/sobres/<id>` y `/sobres/<id>/todos`): ahí no sale ninguna celebración. */
export function isOpeningRoute(path: string): boolean {
  return /^\/sobres\/[^/]+(\/todos)?\/?$/.test(path);
}
