"use client";

// Spec 014, RF-13: confeti de pegatinas (estrellas y corazones con borde blanco) que sale de la carta revelada.
// Solo `transform` y `opacity`; se quita solo al terminar.
import { useEffect, useMemo, useState } from "react";

const STAR = "M7 0 L9 5 L14 7 L9 9 L7 14 L5 9 L0 7 L5 5 Z";
const HEART = "M7 12 C1 8 0 5 0 3.5 C0 1.5 1.6 0 3.5 0 C5 0 6.3 0.9 7 2.2 C7.7 0.9 9 0 10.5 0 C12.4 0 14 1.5 14 3.5 C14 5 13 8 7 12 Z";
const COLORS = ["#ff7eb6", "#b79cff", "#7ef0c9", "#7cc8ff", "#ffe27a", "#ffb38a"];

export interface ConfettiBurst {
  key: number;
  count: number;
  x: number;
  y: number;
}

export function Confetti({ burst }: { burst: ConfettiBurst | null }) {
  const [live, setLive] = useState<ConfettiBurst | null>(null);
  useEffect(() => {
    if (!burst) return;
    setLive(burst);
    const id = window.setTimeout(() => setLive(null), 1500);
    return () => window.clearTimeout(id);
  }, [burst]);
  const pieces = useMemo(
    () =>
      live
        ? Array.from({ length: live.count }, (_, i) => {
            const angle = (i / live.count) * Math.PI * 2 + Math.random() * 0.4;
            const dist = 110 + Math.random() * 120;
            return {
              heart: i % 3 === 0,
              color: COLORS[i % COLORS.length],
              size: 14 + Math.round(Math.random() * 12),
              tx: Math.cos(angle) * dist,
              ty: Math.sin(angle) * dist - 40,
              r: Math.round(Math.random() * 120 - 60),
              delay: Math.random() * 0.12,
            };
          })
        : [],
    [live],
  );
  if (!live) return null;
  return (
    <div className="confetti" aria-hidden data-testid="confetti" style={{ left: live.x, top: live.y }}>
      {pieces.map((p, i) => (
        <svg
          key={`${live.key}-${i}`}
          viewBox={p.heart ? "-2 -2 18 16" : "-2 -2 18 18"}
          className="confetti__piece"
          style={{ width: p.size, height: p.size, "--tx": `${p.tx}px`, "--ty": `${p.ty}px`, "--r": `${p.r}deg`, animationDelay: `${p.delay}s` } as React.CSSProperties}
        >
          <path d={p.heart ? HEART : STAR} fill={p.color} stroke="#ffffff" strokeWidth={2.5} paintOrder="stroke" strokeLinejoin="round" />
        </svg>
      ))}
    </div>
  );
}
