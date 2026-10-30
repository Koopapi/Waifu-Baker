"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cx } from "../variants";

export interface FocusViewProps {
  /** Nombre de la vista para lectores de pantalla. */
  label: string;
  /** Escape la cierra (si se da). */
  onClose?: () => void;
  className?: string;
  /** Solo para tests: sin portal. */
  inline?: boolean;
  children: React.ReactNode;
}

/**
 * Spec 011, RF-8: pantalla completa por encima de la estructura (modo foco): apertura de sobres, simulador y,
 * más adelante, juegos. Se monta en <body> para no depender de los contenedores de la página y bloquea el
 * desplazamiento de fondo.
 */
export function FocusView({ label, onClose, className, inline, children }: FocusViewProps) {
  const [mounted, setMounted] = useState(Boolean(inline));
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (inline) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [inline, onClose]);
  if (!mounted) return null;
  const view = (
    <div role="dialog" aria-modal="true" aria-label={label} data-theme="kawaii" className={cx("fixed inset-0 z-[var(--z-overlay)] overflow-hidden bg-ui-rail", className)} data-testid="focus-view">
      {children}
    </div>
  );
  return inline ? view : createPortal(view, document.body);
}
