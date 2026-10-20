"use client";

import { useEffect, useRef, useState } from "react";
import { counterAt } from "./time";

/** Spec 011, RF-8: número que sube (o baja) hasta su valor nuevo; sin animación con movimiento reducido. */
export function AnimatedCounter({
  value,
  duration = 600,
  format = (n: number) => n.toLocaleString(),
  className,
  ...rest
}: { value: number; duration?: number; format?: (n: number) => string; className?: string } & Omit<React.HTMLAttributes<HTMLSpanElement>, "children">) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (start === value) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = (t - t0) / duration;
      setShown(counterAt(start, value, p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return (
    <span className={className ? `tabular-nums ${className}` : "tabular-nums"} aria-live="polite" {...rest}>
      {format(shown)}
    </span>
  );
}
