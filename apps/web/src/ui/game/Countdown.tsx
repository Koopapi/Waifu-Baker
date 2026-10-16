"use client";

import { useEffect, useState } from "react";
import { splitDuration } from "./time";

const pad = (n: number) => String(n).padStart(2, "0");

export interface CountdownProps {
  /** Instante final (ISO). */
  until: string;
  /** Hora del servidor al renderizar: corrige el desfase del reloj del dispositivo. */
  serverNow?: string;
  /** Formato; por defecto «hh:mm:ss». */
  format?: (h: number, m: number, s: number) => string;
  onDone?: () => void;
  className?: string;
}

/** Spec 011, RF-8: cuenta atrás que se actualiza cada segundo y avisa al terminar. */
export function Countdown({ until, serverNow, format, onDone, className }: CountdownProps) {
  const [skew] = useState(() => (serverNow ? new Date(serverNow).getTime() - Date.now() : 0));
  const [left, setLeft] = useState(() => new Date(until).getTime() - (Date.now() + skew));
  useEffect(() => {
    const id = window.setInterval(() => {
      const ms = new Date(until).getTime() - (Date.now() + skew);
      setLeft(ms);
      if (ms <= 0) {
        window.clearInterval(id);
        onDone?.();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [until, skew, onDone]);
  const { h, m, s } = splitDuration(left);
  return (
    <span className={className ? `tabular-nums ${className}` : "tabular-nums"} data-testid="countdown">
      {format ? format(h, m, s) : `${pad(h)}:${pad(m)}:${pad(s)}`}
    </span>
  );
}
