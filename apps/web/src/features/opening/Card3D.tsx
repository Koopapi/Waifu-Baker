"use client";

import { forwardRef, useEffect, useRef } from "react";
import type { CSSProperties, MutableRefObject } from "react";
import { useT } from "@/i18n/client";
import type { LabCard } from "./fakePack";
import type { Tilt, TiltMode } from "./useTiltSource";

interface Props {
  card: LabCard;
  /** Solo la carta activa sigue la inclinación; las demás quedan planas. */
  active: boolean;
  mode: TiltMode;
  tiltTarget: MutableRefObject<Tilt>;
  style?: CSSProperties;
  /** Si existe, la carta es un botón (ratón, dedo o Intro/Espacio con teclado). */
  onClick?: () => void;
}

const MAX_RX = 10; // grados
const MAX_RY = 14;

/**
 * Carta con tres niveles de transformación para que no se pisen:
 *   .card3d        posición, escala y giro en el plano (GSAP)
 *   .card3d__tilt  inclinación por ratón/giroscopio (variables CSS)
 *   .card3d__inner volteo rotationY (GSAP)
 */
export const Card3D = forwardRef<HTMLDivElement, Props>(function Card3D(
  { card, active, mode, tiltTarget, style, onClick },
  ref,
) {
  const t = useT();
  const el = useRef<HTMLDivElement | null>(null);

  const setRefs = (node: HTMLDivElement | null) => {
    el.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  // Con teclado, el foco pasa solo a la siguiente carta por voltear.
  const clickable = Boolean(onClick);
  useEffect(() => {
    if (!clickable || !active) return;
    const a = document.activeElement;
    if (!a || a === document.body || a.classList.contains("card3d") || a.classList.contains("pack__strip")) el.current?.focus({ preventScroll: true });
  }, [clickable, active]);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    if (!active) {
      node.style.setProperty("--rx", "0deg");
      node.style.setProperty("--ry", "0deg");
      node.style.setProperty("--px", "0.5");
      node.style.setProperty("--py", "0.5");
      return;
    }
    const cur: Tilt = { x: 0, y: 0 };
    const t0 = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      let { x, y } = tiltTarget.current;
      const idle = mode === "auto" || (mode === "pointer" && x === 0 && y === 0);
      if (idle) {
        const t = (now - t0) / 1000;
        x = Math.sin(t * 0.9) * 0.35;
        y = Math.cos(t * 0.7) * 0.25;
      }
      cur.x += (x - cur.x) * 0.12;
      cur.y += (y - cur.y) * 0.12;
      const s = node.style;
      s.setProperty("--rx", `${(-cur.y * MAX_RX).toFixed(2)}deg`);
      s.setProperty("--ry", `${(cur.x * MAX_RY).toFixed(2)}deg`);
      s.setProperty("--px", ((cur.x + 1) / 2).toFixed(3));
      s.setProperty("--py", ((cur.y + 1) / 2).toFixed(3));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, mode, tiltTarget]);

  const classes = ["card3d", `rarity-${card.rarity}`, card.holo ? "card3d--holo" : "", card.framed ? "card3d--framed" : ""].join(" ");

  return (
    <div
      ref={setRefs}
      className={classes}
      style={style}
      onClick={onClick}
      data-card={card.id}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? t.packs.stage.flipCard : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="card3d__tilt">
        <div className="card3d__inner">
          <div className="card3d__face card3d__back">
            <div className="card3d__backart">
              <b>WB</b>
              <small>WAIFU BAKER</small>
            </div>
          </div>
          <div className="card3d__face card3d__front">
            {/* eslint-disable-next-line @next/next/no-img-element -- la carta real irá por URL firmada, sin optimizador */}
            <img src={card.image} alt="" draggable={false} decoding="async" />
            <div className="holo holo--shine" />
            <div className="holo holo--glare" />
            {card.holo && <div className="holo holo--foil" />}
            {!card.framed && (
              <>
                <div className="card3d__frame" />
                <span className="card3d__rarity">
                  {t.common.rarity[card.rarity]}
                  {card.holo ? t.packs.stage.holoSuffix : ""}
                </span>
                <span className="card3d__name">{card.name}</span>
                <span className="card3d__num">{String(card.number).padStart(3, "0")}/032</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
