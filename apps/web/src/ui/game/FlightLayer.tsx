"use client";

import { useEffect, useRef } from "react";
import { arcPoints } from "@/domain/rewards/flight";
import { Sticker } from "../icons/Sticker";
import { flights, useFlights, type FlightItem } from "./flight";

/**
 * Spec 015, RF-1, RF-2 y RF-4: capa fija que pinta los premios en vuelo. No reserva sitio ni bloquea nada
 * (`pointer-events: none`); solo `transform` y `opacity`.
 */
export function FlightLayer() {
  const items = useFlights();
  return (
    <div aria-hidden data-testid="flights" className="pointer-events-none fixed inset-0 z-[var(--z-toast)] overflow-hidden">
      {items.map((i) => (
        <Flying key={i.id} item={i} />
      ))}
    </div>
  );
}

function Flying({ item }: { item: FlightItem }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pts = arcPoints(item.from, item.to);
    const last = pts.length - 1;
    const frames: Keyframe[] = pts.map((p, k) => ({
      transform: `translate(${p.x - item.from.x}px, ${p.y - item.from.y}px) scale(${1 - 0.4 * (k / last)})`,
      opacity: k === last ? 0.3 : 1,
    }));
    const done = () => flights.land(item.id);
    if (typeof el.animate !== "function") {
      const t = window.setTimeout(done, item.delay + item.duration);
      return () => window.clearTimeout(t);
    }
    const anim = el.animate(frames, { duration: item.duration, delay: item.delay, easing: "cubic-bezier(.3,.7,.4,1)", fill: "forwards" });
    anim.onfinish = done;
    return () => {
      // Si se desmonta antes (p. ej. el doble montaje de desarrollo), se corta sin dar el vuelo por terminado.
      anim.onfinish = null;
      anim.cancel();
    };
  }, [item]);
  return (
    <span
      ref={ref}
      data-testid="flight"
      data-sticker={item.sticker}
      className="absolute will-change-transform"
      style={{ left: item.from.x - item.size / 2, top: item.from.y - item.size / 2, width: item.size, height: item.size }}
    >
      <Sticker name={item.sticker} className="size-full" />
    </span>
  );
}
