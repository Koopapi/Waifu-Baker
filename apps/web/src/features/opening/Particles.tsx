"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { Rarity } from "./fakePack";

export interface ParticlesHandle {
  burst(x: number, y: number, rarity: Rarity): void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
}

const COUNT: Record<Rarity, number> = { common: 0, rare: 40, epic: 80, legendary: 150, ex: 200 };
const COLORS: Record<Rarity, string[]> = {
  common: ["#9aa0a6"],
  rare: ["#60a5fa", "#bfdbfe", "#ffffff"],
  epic: ["#c084fc", "#f0abfc", "#ffffff"],
  legendary: ["#f5c451", "#fde68a", "#ffffff", "#f97316"],
  ex: ["#ff6ad5", "#7dd3fc", "#fde68a", "#86efac", "#ffffff"],
};

/** Un solo canvas a pantalla completa con un pool de partículas; se apaga solo al vaciarse. */
export const Particles = forwardRef<ParticlesHandle, { disabled?: boolean }>(function Particles({ disabled }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const parts = useRef<Particle[]>([]);
  const raf = useRef(0);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.floor(window.innerWidth * dpr);
      c.height = Math.floor(window.innerHeight * dpr);
      c.style.width = `${window.innerWidth}px`;
      c.style.height = `${window.innerHeight}px`;
      c.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  const loop = () => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const alive: Particle[] = [];
    for (const p of parts.current) {
      p.vy += 0.22;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.018;
      if (p.life <= 0) continue;
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      alive.push(p);
    }
    ctx.globalAlpha = 1;
    parts.current = alive;
    raf.current = alive.length ? requestAnimationFrame(loop) : 0;
  };

  useImperativeHandle(ref, () => ({
    burst(x, y, rarity) {
      if (disabled) return;
      const n = COUNT[rarity];
      const palette = COLORS[rarity];
      for (let i = 0; i < n; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 7;
        parts.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 4,
          life: 0.8 + Math.random() * 0.6,
          size: 2 + Math.random() * 4,
          color: palette[Math.floor(Math.random() * palette.length)],
        });
      }
      if (!raf.current) raf.current = requestAnimationFrame(loop);
    },
  }));

  return <canvas ref={canvas} className="particles" aria-hidden="true" />;
});
