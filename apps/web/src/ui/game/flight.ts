// Spec 015, RF-1, RF-2 y RF-4: vuelo de pegatinas (galletas, sobres) desde donde se ganan hasta su destino. Es un
// almacén: `fly` apunta los premios en vuelo y `FlightLayer` los pinta y anima; al aterrizar, el destino rebota y
// la promesa se resuelve. Cada vuelo emite `wb:fly` para las pruebas E2E. Nada vuela con movimiento reducido.
import { useSyncExternalStore } from "react";
import { center, flightDestination, type Point, type Rect, type Size } from "@/domain/rewards/flight";
import type { StickerName } from "../icons/Sticker";

export interface FlightItem {
  id: number;
  sticker: StickerName;
  from: Point;
  to: Point;
  size: number;
  delay: number;
  duration: number;
}
export interface FlightRequest {
  /** De dónde sale (p. ej. `getBoundingClientRect()` de la pegatina del día o del botón). */
  from: Rect;
  /** Nombre del destino: los elementos con `data-fly-target="<nombre>"`. */
  to: string;
  sticker: StickerName;
  count?: number;
  size?: number;
}
export interface FlightTarget {
  rect: Rect;
  bounce(): void;
}
export interface FlightDeps {
  targets(name: string): FlightTarget[];
  viewport(): Size;
  reducedMotion(): boolean;
  emit(detail: string): void;
}

export const FLIGHT_MS = 700;
export const FLIGHT_STAGGER_MS = 90;
const EMPTY: FlightItem[] = [];

export function createFlightStore(deps: FlightDeps) {
  let items: FlightItem[] = EMPTY;
  let seq = 0;
  const listeners = new Set<() => void>();
  const pending = new Map<number, () => void>();
  const notify = () => listeners.forEach((l) => l());

  return {
    subscribe(l: () => void) {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    getItems: () => items,
    /** Resuelve cuando el último premio aterriza (o al momento con movimiento reducido). */
    fly(req: FlightRequest): Promise<{ landed: boolean }> {
      const targets = deps.targets(req.to);
      const from = center(req.from);
      const dest = flightDestination(
        targets.map((t) => t.rect),
        deps.viewport(),
        from,
      );
      deps.emit(`${req.sticker}>${req.to}`);
      if (deps.reducedMotion()) return Promise.resolve({ landed: dest.landed });
      const target = dest.index >= 0 ? targets[dest.index] : null;
      const count = Math.max(1, req.count ?? 1);
      return new Promise((resolve) => {
        let left = count;
        const added: FlightItem[] = [];
        for (let i = 0; i < count; i++) {
          const id = ++seq;
          added.push({ id, sticker: req.sticker, from, to: dest.point, size: req.size ?? 40, delay: i * FLIGHT_STAGGER_MS, duration: FLIGHT_MS });
          pending.set(id, () => {
            left -= 1;
            if (left > 0) return;
            target?.bounce();
            resolve({ landed: dest.landed });
          });
        }
        items = [...items, ...added];
        notify();
      });
    },
    /** La capa avisa de que un premio terminó su vuelo. */
    land(id: number) {
      if (!items.some((i) => i.id === id)) return;
      items = items.filter((i) => i.id !== id);
      if (items.length === 0) items = EMPTY;
      const done = pending.get(id);
      pending.delete(id);
      notify();
      done?.();
    },
  };
}

const BOUNCE: Keyframe[] = [{ transform: "scale(1)" }, { transform: "scale(1.22)", offset: 0.4 }, { transform: "scale(0.96)", offset: 0.75 }, { transform: "scale(1)" }];

const browserDeps: FlightDeps = {
  targets(name) {
    if (typeof document === "undefined") return [];
    return Array.from(document.querySelectorAll<HTMLElement>(`[data-fly-target="${name}"]`)).map((el) => ({
      rect: el.getBoundingClientRect(),
      bounce: () => {
        if (typeof el.animate === "function") el.animate(BOUNCE, { duration: 420, easing: "ease-out" });
      },
    }));
  },
  viewport: () => (typeof window === "undefined" ? { width: 0, height: 0 } : { width: window.innerWidth, height: window.innerHeight }),
  reducedMotion: () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  emit: (detail) => {
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("wb:fly", { detail }));
  },
};

export const flights = createFlightStore(browserDeps);

/** Los premios en vuelo, para la capa que los pinta (en el servidor, ninguno). */
export function useFlights() {
  return useSyncExternalStore(flights.subscribe, flights.getItems, () => EMPTY);
}
