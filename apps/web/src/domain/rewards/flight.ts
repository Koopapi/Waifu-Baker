// Spec 015, RF-1, RF-2 y RF-4: a dónde vuela un premio. Puro: recibe medidas y devuelve puntos; el navegador
// (`ui/game/flight.ts`) las toma del DOM.

export interface Point {
  x: number;
  y: number;
}
export interface Size {
  width: number;
  height: number;
}
export interface Rect extends Point, Size {}

export const center = (r: Rect): Point => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });

/** Se ve algo del elemento dentro de la pantalla. */
export function isVisible(r: Rect, viewport: Size) {
  return r.width > 0 && r.height > 0 && r.x < viewport.width && r.y < viewport.height && r.x + r.width > 0 && r.y + r.height > 0;
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const EDGE_INSET = 24;

export interface Destination {
  point: Point;
  /** Hay un destino a la vista: al llegar, rebota. */
  landed: boolean;
  /** Índice del destino elegido, o -1 si vuela hacia el borde. */
  index: number;
}

/**
 * RF-4: el destino visible más cercano al origen; si ninguno está a la vista, el punto del borde de la pantalla más
 * cercano al primero (el premio «se va» hacia donde está); sin destinos, hacia arriba.
 */
export function flightDestination(targets: Rect[], viewport: Size, from: Point): Destination {
  let best = -1;
  for (let i = 0; i < targets.length; i++) {
    if (!isVisible(targets[i], viewport)) continue;
    if (best < 0 || dist(center(targets[i]), from) < dist(center(targets[best]), from)) best = i;
  }
  if (best >= 0) return { point: center(targets[best]), landed: true, index: best };
  if (targets.length === 0) return { point: { x: from.x, y: EDGE_INSET }, landed: false, index: -1 };
  const c = center(targets[0]);
  const clamp = (v: number, max: number) => Math.min(Math.max(v, EDGE_INSET), max - EDGE_INSET);
  return { point: { x: clamp(c.x, viewport.width), y: clamp(c.y, viewport.height) }, landed: false, index: -1 };
}

/** Puntos de un arco (curva cuadrática que se eleva) entre dos puntos, para animar el vuelo con `transform`. */
export function arcPoints(from: Point, to: Point, steps = 12): Point[] {
  const lift = Math.min(Math.max(dist(from, to) * 0.35, 40), 220);
  const ctrl = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - lift };
  const out: Point[] = [];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    out.push({ x: a * from.x + b * ctrl.x + c * to.x, y: a * from.y + b * ctrl.y + c * to.y });
  }
  return out;
}
