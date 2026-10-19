"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { Button } from "../action/Button";
import { overlayClasses } from "../overlay/overlay-classes";
import { cx } from "../variants";
import { Confetti, type ConfettiBurst } from "./Confetti";
import "./celebration.css";

export interface CelebrationProps {
  open: boolean;
  onClose: () => void;
  /** Píldora de arriba («UN REGALO PARA TI», «DÍA 7 DE LA RACHA»). */
  kicker?: string;
  kickerTone?: "lemon" | "mint";
  title: string;
  detail?: string;
  /** Cuántos premios son; con más de uno sale un contador sobre el premio. */
  count?: number;
  /** Botón principal (p. ej. ir a «Mis sobres»); el de cerrar siempre está. */
  primary?: { label: string; onAction: () => void };
  closeLabel: string;
  /** Al mostrarse: sonido, marcar como celebrada… Lo decide quien la abre. */
  onShown?: () => void;
  /** Solo para tests: sin portal, dentro del árbol. */
  inline?: boolean;
  testId?: string;
  /** El premio en grande (el sobre de la colección). */
  children: React.ReactNode;
}

const CONFETTI = 70;

/**
 * Spec 015, RF-5 y RF-6: celebración central. Es un diálogo (Radix atrapa el foco, Escape cierra y el foco vuelve
 * a donde estaba) con el premio en grande, confeti al abrirse y botones; nunca sale sola dos veces.
 */
export function Celebration({ open, onClose, kicker, kickerTone = "lemon", title, detail, count, primary, closeLabel, onShown, inline, testId = "celebration-dialog", children }: CelebrationProps) {
  const opener = useRef<HTMLElement | null>(null);
  const [burst, setBurst] = useState<ConfettiBurst | null>(null);
  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement as HTMLElement | null;
    onShown?.();
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setBurst({ key: Date.now(), count: CONFETTI, x: window.innerWidth / 2, y: window.innerHeight * 0.32 });
    }
    // Solo al abrirse: `onShown` cambia en cada render de quien la usa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const body = (
    <>
      <Dialog.Overlay className={cx(overlayClasses, "bg-ui-rail/80 backdrop-blur-[2px]")} />
      <Dialog.Content
        className="celebration fixed left-1/2 top-1/2 z-[var(--z-overlay)] max-h-[calc(100dvh-2rem)] w-[min(92vw,360px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[28px] border border-k-blanco/20 bg-linear-to-b from-ui-raised to-ui-nav p-6 text-center shadow-[var(--shadow-glow)]"
        data-testid={testId}
        onCloseAutoFocus={(e) => {
          if (!opener.current) return;
          e.preventDefault();
          opener.current.focus();
        }}
      >
        {kicker && (
          <span className={cx("inline-block rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-k-tinta", kickerTone === "mint" ? "bg-k-menta" : "bg-k-limon")} data-testid="celebration-kicker">
            {kicker}
          </span>
        )}
        <Dialog.Title className="mt-3 font-display text-[26px] font-bold leading-tight text-ui-text">{title}</Dialog.Title>
        <div className="relative mx-auto mt-4 w-fit">
          {children}
          {count !== undefined && count > 1 && (
            <span className="absolute -right-3 -top-2 rounded-full border-[3px] border-k-blanco bg-ui-accent-hover px-3 py-0.5 font-display text-lg font-bold text-k-blanco shadow-2" data-testid="celebration-count">
              ×{count}
            </span>
          )}
        </div>
        {detail ? (
          <Dialog.Description className="mt-4 text-sm font-bold text-ui-text-2">{detail}</Dialog.Description>
        ) : (
          <Dialog.Description className="sr-only">{title}</Dialog.Description>
        )}
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          {primary && (
            <Button size="lg" width="full" onClick={primary.onAction} data-testid="celebration-primary">
              {primary.label}
            </Button>
          )}
          <Dialog.Close asChild>
            <Button size="lg" width="full" variant={primary ? "secondary" : "primary"} data-testid="celebration-close">
              {closeLabel}
            </Button>
          </Dialog.Close>
        </div>
      </Dialog.Content>
      <Confetti burst={burst} />
    </>
  );
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      {inline ? body : <Dialog.Portal>{body}</Dialog.Portal>}
    </Dialog.Root>
  );
}
