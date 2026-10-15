"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { drawFakePack, RARITY_LABEL, type LabCard, type Rarity } from "./fakePack";
import { PackMesh } from "./PackMesh";
import { Card3D } from "./Card3D";
import { Particles, type ParticlesHandle } from "./Particles";
import { useTiltSource } from "./useTiltSource";
import "./opening.css";

type Phase = "idle" | "torn" | "fanned" | "summary";

const TRAY_SCALE = 0.3;
const FLASH_RARITIES: Rarity[] = ["epic", "legendary", "secret"];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

interface StageProps {
  /** Fuente de cartas del sobre. Por defecto, datos falsos del laboratorio. */
  draw?: () => Promise<LabCard[]>;
  packLabel?: string;
  /** Contenido extra en la barra inferior (p. ej. «Volver al panel»). */
  extraHud?: React.ReactNode;
  /** Se llama una vez cuando se han revelado todas las cartas del sobre. */
  onFinished?: (cards: LabCard[]) => void;
  /** Sustituye el botón «Abrir otro sobre» del resumen. Recibe la función para reiniciar. */
  renderSummaryActions?: (reset: () => void) => React.ReactNode;
  /** Muestra el modo de inclinación (solo en el laboratorio). */
  debug?: boolean;
}

export function OpeningStage({ draw, packLabel, extraHud, onFinished, renderSummaryActions, debug = false }: StageProps = {}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [cards, setCards] = useState<LabCard[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [packKey, setPackKey] = useState(0);
  const [flash, setFlash] = useState<Rarity | null>(null);
  const flipping = useRef(false);
  const reduced = usePrefersReducedMotion();
  const tilt = useTiltSource();
  const stage = useRef<HTMLDivElement>(null);
  const cardEls = useRef<(HTMLDivElement | null)[]>([]);
  const particles = useRef<ParticlesHandle>(null);

  const [error, setError] = useState<string | null>(null);
  const onTorn = useCallback(() => {
    // El contenido lo decide el servidor (o el sorteo falso del laboratorio); aquí solo se anima.
    void (async () => {
      try {
        const next = draw ? await draw() : drawFakePack();
        setCards(next);
        setRevealed(0);
        setPhase("torn");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo abrir el sobre.");
      }
    })();
  }, [draw]);

  // Las cartas emergen del sobre y se abren en abanico, boca abajo.
  useEffect(() => {
    if (phase !== "torn") return;
    const size = cards.length;
    const els = cardEls.current.slice(0, size).filter((e): e is HTMLDivElement => Boolean(e));
    if (size === 0 || els.length !== size) return;
    const inners = els.map((el) => el.querySelector<HTMLElement>(".card3d__inner"));
    gsap.set(inners, { rotationY: 180 });
    gsap.set(els, { y: 140, scale: 0.6, opacity: 0, rotation: 0, x: 0 });
    const tl = gsap.timeline({ onComplete: () => setPhase("fanned") });
    els.forEach((el, i) => {
      const k = i - (size - 1) / 2;
      tl.to(
        el,
        { y: 0, x: k * 10, scale: 1, opacity: 1, rotation: k * 4, duration: reduced ? 0.2 : 0.55, ease: "back.out(1.4)" },
        reduced ? 0 : 0.25 + i * 0.06,
      );
    });
    return () => {
      tl.kill();
    };
  }, [phase, reduced, cards.length]);

  // Bandeja superior: todas las cartas reveladas deben caber en el ancho del escenario.
  const trayLayout = useCallback(
    (i: number, el: HTMLDivElement) => {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const stageW = stage.current?.clientWidth ?? window.innerWidth;
    const stageH = stage.current?.clientHeight ?? window.innerHeight;
    const gap = 8;
    const margin = 16;
    const size = cards.length;
    const fit = (stageW - margin * 2 - gap * (size - 1)) / (size * w);
    const scale = Math.min(TRAY_SCALE, fit);
    return {
      scale,
      x: (i - (size - 1) / 2) * (w * scale + gap),
      y: -stageH / 2 + (h * scale) / 2 + 52,
    };
    },
    [cards.length],
  );

  const flipTop = useCallback(() => {
    if (phase !== "fanned" || flipping.current) return;
    const i = revealed;
    const el = cardEls.current[i];
    const inner = el?.querySelector<HTMLElement>(".card3d__inner");
    if (!el || !inner) return;
    flipping.current = true;
    const card = cards[i];

    const reveal = () => {
      const r = el.getBoundingClientRect();
      particles.current?.burst(r.left + r.width / 2, r.top + r.height / 2, card.rarity);
      if (FLASH_RARITIES.includes(card.rarity) && !reduced) {
        setFlash(card.rarity);
        window.setTimeout(() => setFlash(null), 400);
      }
      el.classList.add("card3d--revealed");
      const pos = trayLayout(i, el);
      gsap.to(el, {
        delay: reduced ? 0.4 : 1.1,
        duration: reduced ? 0.2 : 0.55,
        ease: "power2.inOut",
        x: pos.x,
        y: pos.y,
        scale: pos.scale,
        rotation: 0,
        onComplete: () => {
          el.classList.remove("card3d--revealed");
          flipping.current = false;
          setRevealed(i + 1);
          if (i + 1 === cards.length) setPhase("summary");
        },
      });
    };

    if (reduced) {
      gsap.to(inner, { rotationY: 0, duration: 0.2, ease: "none", onComplete: reveal });
      return;
    }
    gsap
      .timeline({ onComplete: reveal })
      .to(el, { scale: 1.08, y: -18, rotation: 0, duration: 0.25, ease: "power2.out" }, 0)
      .to(inner, { rotationY: 0, duration: 0.7, ease: "power2.inOut" }, 0.05)
      .to(el, { scale: 1, y: 0, duration: 0.3, ease: "power2.in" }, 0.55);
  }, [phase, revealed, cards, reduced, trayLayout]);

  const finishedRef = useRef(false);
  useEffect(() => {
    if (phase === "summary" && !finishedRef.current) {
      finishedRef.current = true;
      onFinished?.(cards);
    }
    if (phase !== "summary") finishedRef.current = false;
  }, [phase, cards, onFinished]);

  const reset = () => {
    setError(null);
    setCards([]);
    setRevealed(0);
    setPhase("idle");
    setPackKey((k) => k + 1);
    cardEls.current = [];
  };

  const hint =
    phase === "idle"
      ? reduced
        ? "Pulsa el botón para abrir el sobre"
        : "Desliza la tira del sobre hacia la derecha"
      : phase === "fanned"
        ? `Toca la carta de arriba · ${revealed + 1} de ${cards.length}`
        : phase === "torn"
          ? "..."
          : "";

  return (
    <div ref={stage} className="stage" data-phase={phase} data-revealed={revealed} onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave}>
      <p className="hint" aria-live="polite">
        {error ?? hint}
      </p>

      <div className="stage__center">{(phase === "idle" || phase === "torn") && <PackMesh key={packKey} onTorn={onTorn} reducedMotion={reduced} label={packLabel} />}</div>

      <div className="cards">
        {cards.map((c, i) => (
          <Card3D
            key={`${packKey}-${i}`}
            ref={(el) => {
              cardEls.current[i] = el;
            }}
            card={c}
            active={phase === "fanned" && i === revealed}
            mode={tilt.mode}
            tiltTarget={tilt.target}
            style={{ zIndex: cards.length - i }}
            onClick={phase === "fanned" && i === revealed ? flipTop : undefined}
          />
        ))}
      </div>

      <Particles ref={particles} disabled={reduced} />
      {flash && <div className={`flash rarity-${flash}`} aria-hidden="true" />}

      {phase === "summary" && (
        <div className="summary">
          <div className="summary__card">
            <h2 className="summary__title">Sobre abierto</h2>
            {cards.map((c, i) => (
              <div key={i} className={`summary__row rarity-${c.rarity}`}>
                <span>
                  {c.name}
                  {c.note && <small className="summary__note">{c.note}</small>}
                </span>
                <span className="badge">
                  {RARITY_LABEL[c.rarity]}
                  {c.holo ? " · holo" : ""}
                </span>
              </div>
            ))}
            {renderSummaryActions ? (
              <div className="summary__actions">{renderSummaryActions(reset)}</div>
            ) : (
              <button type="button" className="hud__btn hud__btn--primary summary__again" onClick={reset}>
                Abrir otro sobre
              </button>
            )}
          </div>
        </div>
      )}

      <div className="hud">
        {extraHud}
        {tilt.gyroAvailable && tilt.mode !== "gyro" && (
          <button type="button" className="hud__btn" onClick={() => void tilt.requestGyro()}>
            Activar giroscopio
          </button>
        )}
        {debug && <span className="hud__chip">inclinación: {tilt.mode}</span>}
        {debug && reduced && <span className="hud__chip">movimiento reducido</span>}
      </div>
    </div>
  );
}
