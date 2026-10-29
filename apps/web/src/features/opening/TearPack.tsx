"use client";

import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { useDrag } from "@use-gesture/react";
import gsap from "gsap";
import { useT } from "@/i18n/client";
import { tearCommits, tearProgress } from "@/domain/opening/deck";
import { sound } from "@/features/sound/engine";
import { PackShell, PackStrip, type PackShellProps } from "@/features/packs/PackShell";
import type { Tilt, TiltMode } from "./useTiltSource";

interface Props {
  shell: Omit<PackShellProps, "state" | "className">;
  reducedMotion: boolean;
  /** Spec 013, RF-2: dentro del gesto que confirma el rasgado (soltar o el botón), donde el navegador deja sonar. */
  onCommit: () => void;
  /** RF-10: la tira ya salió; ahora se pide el contenido al servidor. */
  onOpen: () => void;
  mode: TiltMode;
  tiltTarget: MutableRefObject<Tilt>;
  /** RF-22: la apertura se retoma con el sobre ya abierto (sin tira). */
  startOpen?: boolean;
}

type Dir = "ltr" | "rtl";
interface Flake {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  rot: number;
  size: number;
  paper: boolean;
}

const MAX_RX = 8;
const MAX_RY = 12;
/** Cada cuánto progreso salta un trocito y vibra un poco (el papel «cruje»). */
const TICK = 0.07;
/** Tirando hasta aquí, la tira se arranca sola sin esperar a soltar. */
const AUTO_RIP = 0.94;
/** Ancho (en % del sobre) del blanco del papel que asoma en el corte. */
const FIBER = 0.9;

/** Borde roto irregular: picos de profundidad y altura distintas, fijos durante cada rasgado (ruido con semilla). */
function makeNoise() {
  return Array.from({ length: 11 }, (_, i) => ({ dx: (i % 2 ? 1 : -1) * (0.5 + Math.random() * 1.6), dy: i === 0 || i === 10 ? 0 : (Math.random() - 0.5) * 6 }));
}

function edge(cut: number, side: 1 | -1, noise: { dx: number; dy: number }[], extra = 0) {
  return noise.map((n, i) => `${(cut + (n.dx + extra) * side).toFixed(2)}% ${Math.min(100, Math.max(0, (i / (noise.length - 1)) * 100 + n.dy)).toFixed(1)}%`);
}

/**
 * Spec 023, RF-4 y RF-6 a RF-9: el sobre se inclina con el dedo o el ratón; al arrastrar por los dientes, la tira se
 * rompe por donde va el dedo (en cualquier sentido), con el borde irregular y el blanco del papel en el corte, se levanta
 * curvándose, el sobre se inclina hacia donde se tira y saltan trocitos de papel y foil. Al soltar desde el 60 % (o al
 * llegar casi al final) se arranca con la inercia del gesto y cae; antes, vuelve a su sitio. «Abrir sin deslizar» y la
 * tecla Intro hacen lo mismo. Con movimiento reducido (RF-23), solo el botón, sin animación.
 */
export function TearPack({ shell, reducedMotion, onCommit, onOpen, mode, tiltTarget, startOpen = false }: Props) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const flapFly = useRef<HTMLSpanElement>(null);
  const p = useRef({ v: 0 });
  const done = useRef(startOpen);
  const noise = useRef(makeNoise());
  const ticks = useRef(0);
  const flakeId = useRef(0);
  const [dir, setDir] = useState<Dir>("ltr");
  const [phase, setPhase] = useState<"whole" | "tearing" | "off">(startOpen ? "off" : "whole");
  const [shaking, setShaking] = useState(false);
  const [flakes, setFlakes] = useState<Flake[]>([]);

  // Escribe el corte en variables CSS (sin re-render en cada movimiento del dedo).
  const paint = (v: number, d: Dir = dir) => {
    const el = root.current;
    if (!el) return;
    const side = d === "ltr" ? 1 : -1;
    const cut = d === "ltr" ? v * 100 : 100 - v * 100;
    const n = noise.current;
    const near = d === "ltr" ? ["0% 0%"] : ["100% 0%"];
    const nearEnd = d === "ltr" ? ["0% 100%"] : ["100% 100%"];
    const far = d === "ltr" ? ["100% 100%", "100% 0%"] : ["0% 100%", "0% 0%"];
    const poly = (pts: string[]) => `polygon(${pts.join(",")})`;
    // La tira arrancada va del borde por donde se empezó hasta el corte; el blanco asoma un poco más allá.
    el.style.setProperty("--flap-clip", poly([...near, ...edge(cut, side, n), ...nearEnd]));
    el.style.setProperty("--flap-fiber", poly([...near, ...edge(cut, side, n, FIBER), ...nearEnd]));
    el.style.setProperty("--rest-clip", poly([...edge(cut, side, n), ...far]));
    el.style.setProperty("--rest-fiber", poly([...edge(cut, side, n, -FIBER), ...far]));
    el.style.setProperty("--cut", `${cut}%`);
    el.style.setProperty("--tear", v.toFixed(3));
    el.style.setProperty("--tug", (side * v).toFixed(3));
  };

  // Trocitos de papel y foil en el punto de rotura, con un pulso de vibración: el papel «cruje».
  const crackle = (v: number, d: Dir) => {
    if (reducedMotion) return;
    const step = Math.floor(v / TICK);
    if (step <= ticks.current) return;
    ticks.current = step;
    sound.vibrate([6]);
    const side = d === "ltr" ? 1 : -1;
    const cut = d === "ltr" ? v * 100 : 100 - v * 100;
    const born: Flake[] = Array.from({ length: 3 }, (_, k) => ({
      id: flakeId.current++,
      x: cut,
      y: 30 + Math.random() * 60,
      dx: side * (10 + Math.random() * 40),
      dy: -20 - Math.random() * 50,
      rot: (Math.random() - 0.5) * 540,
      size: 1.2 + Math.random() * 1.8,
      paper: k !== 1,
    }));
    setFlakes((f) => [...f.slice(-24), ...born]);
  };

  // RF-4: inclinación y brillo del foil siguiendo el puntero o el giroscopio (o un balanceo suave si no hay).
  useEffect(() => {
    const el = root.current;
    if (!el || reducedMotion) return;
    const cur: Tilt = { x: 0, y: 0 };
    const t0 = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      let { x, y } = tiltTarget.current;
      if (mode === "auto" || (mode === "pointer" && x === 0 && y === 0)) {
        const s = (now - t0) / 1000;
        x = Math.sin(s * 0.8) * 0.3;
        y = Math.cos(s * 0.6) * 0.2;
      }
      cur.x += (x - cur.x) * 0.1;
      cur.y += (y - cur.y) * 0.1;
      el.style.setProperty("--rx", `${(-cur.y * MAX_RX).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(cur.x * MAX_RY).toFixed(2)}deg`);
      el.style.setProperty("--px", ((cur.x + 1) / 2).toFixed(3));
      el.style.setProperty("--py", ((cur.y + 1) / 2).toFixed(3));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mode, tiltTarget, reducedMotion]);

  // RF-8: termina de arrancar la tira, que sale con la inercia del gesto, gira y cae; después se pide el contenido.
  const finish = (d: Dir, speed = 0.6) => {
    if (done.current) return;
    done.current = true;
    onCommit();
    sound.vibrate([18, 30, 12]);
    setPhase("tearing");
    const go = () => {
      setPhase("off");
      window.setTimeout(onOpen, reducedMotion ? 0 : 520);
    };
    if (reducedMotion) return go();
    const side = d === "ltr" ? 1 : -1;
    const w = root.current?.offsetWidth ?? 250;
    const v = Math.min(Math.max(speed, 0.4), 3);
    gsap.to(p.current, {
      v: 1,
      duration: 0.16,
      ease: "power2.out",
      onUpdate: () => paint(p.current.v, d),
      onComplete: () => {
        paint(1, d);
        go();
        const fly = flapFly.current;
        if (!fly) return;
        // Primero sale disparada hacia donde se tiraba (y algo hacia arriba), luego cae girando con gravedad.
        gsap
          .timeline()
          .to(fly, { x: side * w * (0.35 + v * 0.25), y: -w * (0.25 + v * 0.08), rotation: side * (25 + v * 15), duration: 0.22, ease: "power2.out" })
          .to(fly, { y: w * 3, rotation: side * (140 + v * 60), duration: 0.75, ease: "power2.in" })
          .to(fly, { opacity: 0, duration: 0.25 }, "-=0.25");
      },
    });
  };

  const bind = useDrag(
    ({ movement: [mx], first, active, last, tap, velocity: [vx] }) => {
      if (done.current || reducedMotion) return;
      if (tap) return setShaking(true);
      const width = root.current?.offsetWidth ?? 250;
      const d: Dir = mx < 0 ? "rtl" : "ltr";
      if (first) {
        noise.current = makeNoise();
        ticks.current = 0;
      }
      if (first || d !== dir) setDir(d);
      if (active) {
        gsap.killTweensOf(p.current);
        setPhase("tearing");
        p.current.v = tearProgress(mx, width);
        paint(p.current.v, d);
        crackle(p.current.v, d);
        // Tirando casi hasta el final, la tira se arranca sola.
        if (p.current.v >= AUTO_RIP) return finish(d, vx);
      }
      if (last) {
        // RF-7: por debajo del 60 %, la tira vuelve a su sitio y el sobre sigue cerrado.
        if (tearCommits(p.current.v)) finish(d, vx);
        else
          gsap.to(p.current, {
            v: 0,
            duration: 0.35,
            ease: "back.out(2.2)",
            onUpdate: () => paint(p.current.v, d),
            onComplete: () => {
              setPhase("whole");
              ticks.current = 0;
            },
          });
      }
    },
    { axis: "x", filterTaps: true, pointer: { touch: true } },
  );

  const classes = ["tear", `tear--${dir}`, `tear--${phase}`, shaking ? "tear--shake" : "", reducedMotion ? "tear--reduced" : ""].join(" ");
  const showStrips = phase === "tearing" || (phase === "off" && !startOpen);
  return (
    <div className="tear-wrap">
      <div ref={root} className={classes} data-testid="tear-pack" onAnimationEnd={(e) => e.target === e.currentTarget && setShaking(false)}>
        <div className="tear__tilt">
          <PackShell {...shell} state={phase === "whole" ? "whole" : "open"} className="tear__shell" />
          {/* El destello que sale de la boca del sobre al abrirse. */}
          {phase === "off" && !startOpen && <span aria-hidden className={`tear__burst pack-shell--${shell.kind}`} />}
          {showStrips && (
            <span className={`tear__strips pack-shell--${shell.kind}`} aria-hidden>
              <PackStrip kindLabel={shell.kindLabel} className="tear__fiber tear__fiber--rest" />
              <PackStrip kindLabel={shell.kindLabel} className="tear__rest" />
              <span ref={flapFly} className="tear__fly">
                <span className="tear__peel">
                  <PackStrip kindLabel={shell.kindLabel} className="tear__fiber tear__fiber--flap" />
                  <PackStrip kindLabel={shell.kindLabel} className="tear__flap" />
                </span>
              </span>
              {flakes.map((f) => (
                <span
                  key={f.id}
                  className={`tear__flake${f.paper ? "" : " tear__flake--foil"}`}
                  style={{ left: `${f.x}%`, top: `${f.y}%`, "--dx": `${f.dx}px`, "--dy": `${f.dy}px`, "--rot": `${f.rot}deg`, "--s": `${f.size}cqw` } as React.CSSProperties}
                  onAnimationEnd={() => setFlakes((all) => all.filter((x) => x.id !== f.id))}
                />
              ))}
            </span>
          )}
        </div>
        {/* RF-6: la zona de los dientes; con teclado, Intro o Espacio abren sin arrastrar (RF-9). */}
        <div
          className="pack__strip tear__hit"
          {...(reducedMotion ? {} : bind())}
          style={{ touchAction: "none" }}
          role="button"
          tabIndex={0}
          aria-label={t.packs.stage.stripAria}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              finish(dir);
            }
          }}
        />
      </div>
      {/* RF-9: siempre a mano; con movimiento reducido es la única forma de abrir (RF-23). */}
      <button type="button" className="pack__cta tear__cta" onClick={() => finish(dir)} disabled={phase !== "whole"} data-testid="open-without-swipe">
        {t.packs.stage.openWithoutSwipe}
      </button>
    </div>
  );
}
