"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useT } from "@/i18n/client";
import { drawFakePack, type LabCard, type Rarity } from "./fakePack";
import { PackMesh } from "./PackMesh";
import { Card3D } from "./Card3D";
import { Particles, type ParticlesHandle } from "./Particles";
import { useTiltSource } from "./useTiltSource";
import { celebrates, confettiCount, revealSound, teaseLevel, vibrationPattern } from "@/domain/opening/feedback";
import { Confetti, type ConfettiBurst } from "@/ui/game/Confetti";
import { Sticker } from "@/ui/icons/Sticker";
import { SoundToggle } from "@/ui/game/SoundToggle";
import { sound, useSoundMuted } from "@/features/sound/engine";
import "./opening.css";

type Phase = "idle" | "torn" | "fanned" | "summary";

const TRAY_SCALE = 0.3;
/** Spec 014, RF-9: destellos del fondo (posición en %, tamaño, color y retardo). */
const SPARKLES: [number, number, number, string, number][] = [
  [10, 14, 10, "#ffe27a", 0], [84, 19, 14, "#ff9ecb", 0.6], [15, 74, 12, "#7ef0c9", 1.1], [82, 66, 10, "#ffffff", 0.3],
  [51, 11, 8, "#7cc8ff", 1.6], [90, 83, 12, "#b79cff", 0.9], [7, 45, 8, "#ffffff", 1.9], [91, 39, 9, "#ffe27a", 0.4],
  [30, 88, 9, "#ff9ecb", 1.3], [64, 92, 8, "#7ef0c9", 0.2], [25, 28, 6, "#ffffff", 2.1], [72, 30, 6, "#ffffff", 1.4],
];
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
  /** Spec 014: el sobre de la colección ya dibujado (PackArt). */
  packArt?: React.ReactNode;
  /** Contenido extra en la barra inferior (p. ej. «Volver al panel»). */
  extraHud?: React.ReactNode;
  /** Se llama una vez cuando se han revelado todas las cartas del sobre. */
  onFinished?: (cards: LabCard[]) => void;
  /** Sustituye el botón «Abrir otro sobre» del resumen. Recibe la función para reiniciar. */
  renderSummaryActions?: (reset: () => void) => React.ReactNode;
  /** Muestra el modo de inclinación (solo en el laboratorio). */
  debug?: boolean;
}

export function OpeningStage({ draw, packLabel, packArt, extraHud, onFinished, renderSummaryActions, debug = false }: StageProps = {}) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>("idle");
  const [cards, setCards] = useState<LabCard[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [packKey, setPackKey] = useState(0);
  const [flash, setFlash] = useState<Rarity | null>(null);
  // Spec 014, RF-13: confeti y celebración al revelar una rara o mejor.
  const [burst, setBurst] = useState<ConfettiBurst | null>(null);
  const [party, setParty] = useState<Rarity | null>(null);
  const flipping = useRef(false);
  const reduced = usePrefersReducedMotion();
  const tilt = useTiltSource();
  const stage = useRef<HTMLDivElement>(null);
  const cardEls = useRef<(HTMLDivElement | null)[]>([]);
  const particles = useRef<ParticlesHandle>(null);

  const muted = useSoundMuted();
  // Spec 013, RF-6: los sonidos se descargan al entrar en la apertura, sin retrasar la animación.
  useEffect(() => {
    void sound.preload();
  }, []);
  const onCommit = useCallback(() => {
    sound.unlock();
    sound.play("tear");
  }, []);

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
        // Cadena vacía = error sin mensaje: se muestra el texto genérico en el idioma activo.
        setError(e instanceof Error ? e.message : "");
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

    sound.play("flip");
    const reveal = () => {
      // Spec 013, RF-4 y RF-9: las raras o mejores suenan y vibran según su nivel.
      const extra = revealSound(card.rarity);
      if (extra) sound.play(extra);
      sound.vibrate(vibrationPattern(card.rarity));
      const r = el.getBoundingClientRect();
      particles.current?.burst(r.left + r.width / 2, r.top + r.height / 2, card.rarity);
      if (!reduced && confettiCount(card.rarity) > 0) setBurst({ key: Date.now(), count: confettiCount(card.rarity), x: r.left + r.width / 2, y: r.top + r.height / 2 });
      if (!reduced && celebrates(card.rarity)) {
        setParty(card.rarity);
        window.setTimeout(() => setParty(null), 1600);
      }
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
        ? t.packs.stage.hintButton
        : t.packs.stage.hintSwipe
      : phase === "fanned"
        ? t.packs.stage.hintTap(revealed + 1, cards.length)
        : phase === "torn"
          ? "..."
          : "";

  return (
    <div ref={stage} className="stage" data-phase={phase} data-revealed={revealed} onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave}>
      <div className="stage__sparkles" aria-hidden>
        {SPARKLES.map(([x, y, size, color, delay], i) => (
          <span key={i} className="sparkle" style={{ left: `${x}%`, top: `${y}%`, "--s": `${size}px`, "--c": color, "--d": `${delay}s` } as React.CSSProperties} />
        ))}
      </div>
      <p className="hint" aria-live="polite">
        {error === "" ? t.packs.stage.openFailed : (error ?? hint)}
      </p>

      <div className="stage__center">{(phase === "idle" || phase === "torn") && <PackMesh key={packKey} onTorn={onTorn} onCommit={onCommit} art={packArt} reducedMotion={reduced} label={packLabel} />}</div>

      <div className="cards">
        {cards.map((c, i) => (
          <Card3D
            key={`${packKey}-${i}`}
            ref={(el) => {
              cardEls.current[i] = el;
            }}
            card={c}
            active={phase === "fanned" && i === revealed}
            tease={phase === "fanned" && i === revealed ? teaseLevel(c.rarity) : 0}
            mode={tilt.mode}
            tiltTarget={tilt.target}
            style={{ zIndex: cards.length - i }}
            onClick={phase === "fanned" && i === revealed ? flipTop : undefined}
          />
        ))}
      </div>

      <Particles ref={particles} disabled={reduced} />
      {flash && <div className={`flash rarity-${flash}`} aria-hidden="true" />}
      <Confetti burst={burst} />
      {party && (
        <div className={`celebrate rarity-${party}`} aria-hidden data-testid="celebration">
          <span className="celebrate__ribbon">{t.packs.stage.celebrate(t.common.rarity[party])}</span>
        </div>
      )}

      {phase === "summary" && (
        <div className="summary">
          <div className="summary__card">
            <h2 className="summary__title">
              <Sticker name="card" className="size-9" />
              {t.packs.stage.summaryTitle}
            </h2>
            {/* Spec 014, RF-14: las cartas en miniatura con su rareza y la etiqueta «¡Nueva!». */}
            <div className="summary__grid">
              {cards.map((c, i) => (
                <div key={i} className={`summary__row rarity-${c.rarity}`}>
                  <span className="summary__thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element -- imagen firmada de la carta */}
                    <img src={c.image} alt="" draggable={false} />
                  </span>
                  <span className="badge">
                    {t.common.rarity[c.rarity]}
                    {c.holo ? t.packs.stage.holoSuffix : ""}
                  </span>
                  <span className="summary__name">{c.name}</span>
                  {c.note && <small className="summary__note">{c.note}</small>}
                </div>
              ))}
            </div>
            {renderSummaryActions ? (
              <div className="summary__actions">{renderSummaryActions(reset)}</div>
            ) : (
              <button type="button" className="hud__btn hud__btn--primary summary__again" onClick={reset}>
                {t.packs.stage.openAnother}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="hud">
        {extraHud}
        <SoundToggle muted={muted} onToggle={(m) => sound.setMuted(m)} variant="ghost" className="hud__sound" data-testid="sound-toggle" />
        {tilt.gyroAvailable && tilt.mode !== "gyro" && (
          <button type="button" className="hud__btn" onClick={() => void tilt.requestGyro()}>
            {t.packs.stage.enableGyro}
          </button>
        )}
        {debug && <span className="hud__chip">{t.packs.stage.tiltMode(tilt.mode)}</span>}
        {debug && reduced && <span className="hud__chip">{t.packs.stage.reducedMotion}</span>}
      </div>
    </div>
  );
}
