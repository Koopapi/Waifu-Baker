"use client";

import { useEffect, useRef, useState } from "react";
import { useDrag } from "@use-gesture/react";
import gsap from "gsap";
import { useT } from "@/i18n/client";

interface Props {
  /** Se llama una sola vez, cuando la tira termina de salir. */
  onTorn: () => void;
  /** Spec 013, RF-2: se llama dentro del gesto que rasga (soltar o «Abrir»), donde el navegador deja sonar. */
  onCommit?: () => void;
  reducedMotion: boolean;
  /** Texto bajo el logo del sobre, p. ej. el código de la colección. */
  label?: string;
}

const TEAR_DISTANCE = 180; // px de arrastre para completar el rasgado
const COMMIT_AT = 0.55; // progreso a partir del cual, al soltar, se completa solo

export function PackMesh({ onTorn, onCommit, reducedMotion, label = "BOOSTER · WB01" }: Props) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const done = useRef(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const t = gsap.timeline({ paused: true });
    // 0 → 0.6: la tira se desplaza y se arruga (scrub con el dedo)
    t.to(strip.current, { x: 140, rotation: 5, skewX: -6, duration: 0.6, ease: "power1.in" }, 0);
    // 0.6 → 0.9: la tira sale volando; aquí se avisa al escenario
    t.to(strip.current, { x: 260, y: -60, rotation: 18, opacity: 0, duration: 0.3, ease: "power2.in" }, 0.6);
    t.call(
      () => {
        if (!done.current) {
          done.current = true;
          onTorn();
        }
      },
      [],
      0.9,
    );
    // 0.9 → 1.4: el cuerpo del sobre cae y se desvanece mientras salen las cartas
    t.to(root.current, { y: 90, scale: 0.92, opacity: 0, duration: 0.5, ease: "power2.in" }, 0.9);
    tl.current = t;
    return () => {
      t.kill();
    };
  }, [onTorn]);

  const bind = useDrag(
    ({ movement: [mx], active, last }) => {
      const t = tl.current;
      if (!t || done.current) return;
      const scrub = Math.min(Math.max(mx / TEAR_DISTANCE, 0), 1) * 0.6;
      if (active) {
        setDragging(true);
        t.pause();
        t.progress(scrub / t.duration() * 1); // progress es 0..1 sobre la duración total
      }
      if (last) {
        setDragging(false);
        if (scrub >= COMMIT_AT) {
          onCommit?.();
          t.play();
        } else t.reverse();
      }
    },
    { axis: "x", filterTaps: true, pointer: { touch: true } },
  );

  const openWithoutGesture = () => {
    if (done.current) return;
    onCommit?.();
    tl.current?.play(0.6);
  };

  return (
    <div ref={root} className="pack">
      <div className="pack__body">
        <div className="pack__foil" />
        <div className="pack__logo">
          {t.common.brand}
          <span>{label}</span>
        </div>
      </div>
      <div
        ref={strip}
        className={`pack__strip${dragging ? " pack__strip--dragging" : ""}`}
        {...bind()}
        style={{ touchAction: "none" }}
        // Con teclado: Intro o Espacio abren el sobre sin arrastrar.
        role="button"
        tabIndex={0}
        aria-label={t.packs.stage.stripAria}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openWithoutGesture();
          }
        }}
      >
        <span className="pack__strip-hint">{reducedMotion ? t.packs.stage.stripHintReduced : t.packs.stage.stripHint}</span>
      </div>
      {reducedMotion && (
        <button type="button" className="pack__cta" onClick={openWithoutGesture}>
          {t.packs.stage.openPack}
        </button>
      )}
    </div>
  );
}
