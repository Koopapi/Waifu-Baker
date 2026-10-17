"use client";

import { useEffect, useId, useState } from "react";
import { cx } from "../variants";

export interface RingTimerProps {
  /** Instante en que se completa (ISO). */
  until: string;
  /** Hora del servidor al renderizar: corrige el desfase del reloj del dispositivo. */
  serverNow: string;
  /** Duración de una vuelta completa (ms). */
  totalMs: number;
  /** Nombre accesible del progreso. */
  label: string;
  /** Contenido del centro (p. ej. la cuenta atrás). */
  children?: React.ReactNode;
  className?: string;
}

const R = 44;
const C = 2 * Math.PI * R;

/** Spec 014, RF-16 y RF-17: anillo que se va llenando hasta `until` (menta → celeste) con contenido en el centro. */
export function RingTimer({ until, serverNow, totalMs, label, children, className }: RingTimerProps) {
  const gradient = useId();
  const at = (now: number) => Math.min(1, Math.max(0, 1 - (new Date(until).getTime() - now) / totalMs));
  // El primer valor sale solo de la hora del servidor: idéntico al pintar en el servidor y al hidratar.
  const [p, setP] = useState(() => at(new Date(serverNow).getTime()));
  useEffect(() => {
    const skew = new Date(serverNow).getTime() - Date.now();
    const tick = () => setP(Math.min(1, Math.max(0, 1 - (new Date(until).getTime() - (Date.now() + skew)) / totalMs)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [until, serverNow, totalMs]);
  const pct = Math.round(p * 100);
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className={cx("relative grid size-32 shrink-0 place-items-center", className)}>
      <svg viewBox="0 0 100 100" aria-hidden className="absolute inset-0 size-full -rotate-90">
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--ui-k-menta)" />
            <stop offset="1" stopColor="var(--ui-k-celeste)" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--ui-line)" strokeWidth="9" />
        <circle cx="50" cy="50" r={R} fill="none" stroke={`url(#${gradient})`} strokeWidth="9" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - p)} />
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
  );
}
