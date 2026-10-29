"use client";

import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { useDrag } from "@use-gesture/react";
import gsap from "gsap";
import { useT } from "@/i18n/client";
import { tearCommits, tearProgress } from "@/domain/opening/deck";
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
const JAG = 1.4; // % del ancho: profundidad de los picos del borde roto
const MAX_RX = 8;
const MAX_RY = 12;

/** Borde roto en zigzag a la altura `cut` (en % del ancho), de arriba abajo. */
function jagged(cut: number, side: 1 | -1) {
  const pts: string[] = [];
  for (let i = 0; i <= 6; i++) pts.push(`${(cut + (i % 2 ? JAG : -JAG) * side).toFixed(2)}% ${((i / 6) * 100).toFixed(1)}%`);
  return pts;
}

/**
 * Spec 023, RF-4 y RF-6 a RF-9: el sobre se inclina con el dedo o el ratón; al arrastrar por los dientes, la tira se
 * rompe por donde va el dedo (en cualquier sentido). Al soltar desde el 60 % se arranca y cae; antes, vuelve a su sitio.
 * «Abrir sin deslizar» y la tecla Intro hacen lo mismo. Con movimiento reducido (RF-23), solo el botón, sin animación.
 */
export function TearPack({ shell, reducedMotion, onCommit, onOpen, mode, tiltTarget, startOpen = false }: Props) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const p = useRef({ v: 0 });
  const done = useRef(startOpen);
  const [dir, setDir] = useState<Dir>("ltr");
  const [phase, setPhase] = useState<"whole" | "tearing" | "off">(startOpen ? "off" : "whole");
  const [shaking, setShaking] = useState(false);

  // Escribe el corte en variables CSS (sin re-render en cada movimiento del dedo).
  const paint = (v: number, d: Dir = dir) => {
    const el = root.current;
    if (!el) return;
    const cut = d === "ltr" ? v * 100 : 100 - v * 100;
    const flap = d === "ltr" ? ["0% 0%", ...jagged(cut, 1), "0% 100%"] : [...jagged(cut, -1), "100% 100%", "100% 0%"];
    const rest = d === "ltr" ? [...jagged(cut, 1), "100% 100%", "100% 0%"] : ["0% 0%", ...jagged(cut, -1), "0% 100%"];
    el.style.setProperty("--flap-clip", `polygon(${flap.join(",")})`);
    el.style.setProperty("--rest-clip", `polygon(${rest.join(",")})`);
    el.style.setProperty("--cut", `${cut}%`);
    el.style.setProperty("--tear", v.toFixed(3));
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

  // RF-8: termina de arrancar la tira, la deja caer y avisa para pedir el contenido.
  const finish = (d: Dir) => {
    if (done.current) return;
    done.current = true;
    onCommit();
    setPhase("tearing");
    const go = () => {
      setPhase("off");
      window.setTimeout(onOpen, reducedMotion ? 0 : 420);
    };
    if (reducedMotion) return go();
    gsap.to(p.current, { v: 1, duration: 0.22, ease: "power2.out", onUpdate: () => paint(p.current.v, d), onComplete: go });
  };

  const bind = useDrag(
    ({ movement: [mx], first, active, last, tap }) => {
      if (done.current || reducedMotion) return;
      if (tap) return setShaking(true);
      const width = root.current?.offsetWidth ?? 250;
      const d: Dir = mx < 0 ? "rtl" : "ltr";
      if (first || d !== dir) setDir(d);
      if (active) {
        gsap.killTweensOf(p.current);
        setPhase("tearing");
        p.current.v = tearProgress(mx, width);
        paint(p.current.v, d);
      }
      if (last) {
        // RF-7: por debajo del 60 %, la tira vuelve a su sitio y el sobre sigue cerrado.
        if (tearCommits(p.current.v)) finish(d);
        else
          gsap.to(p.current, {
            v: 0,
            duration: 0.3,
            ease: "back.out(2)",
            onUpdate: () => paint(p.current.v, d),
            onComplete: () => setPhase("whole"),
          });
      }
    },
    { axis: "x", filterTaps: true, pointer: { touch: true } },
  );

  const classes = ["tear", `tear--${dir}`, `tear--${phase}`, shaking ? "tear--shake" : "", reducedMotion ? "tear--reduced" : ""].join(" ");
  return (
    <div className="tear-wrap">
      <div ref={root} className={classes} data-testid="tear-pack" onAnimationEnd={() => setShaking(false)}>
        <div className="tear__tilt">
          <PackShell {...shell} state={phase === "whole" ? "whole" : "open"} className="tear__shell" />
          {(phase === "tearing" || (phase === "off" && !startOpen)) && (
            <span className={`tear__strips pack-shell--${shell.kind}`} aria-hidden>
              <PackStrip kindLabel={shell.kindLabel} className="tear__rest" />
              <PackStrip kindLabel={shell.kindLabel} className="tear__flap" />
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
