"use client";

import { useId } from "react";
import { focusRing } from "../focus";
import { cx } from "../variants";

/**
 * Spec 025, RF-23: lista de capas con la de adelante arriba, entre las marcas «Adelante» y «Atrás» (como el
 * configurador de Bruno). Los hijos son `LayerRow`.
 */
export function LayerList({ frontLabel, backLabel, action, children, className, ...rest }: { frontLabel: React.ReactNode; backLabel: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string; "data-testid"?: string }) {
  const mark = "text-[11px] font-extrabold uppercase italic tracking-[.14em] text-ui-accent-text";
  return (
    <div className={cx("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className={mark}>{frontLabel}</span>
        {action}
      </div>
      <ol className="space-y-2" data-testid={rest["data-testid"]}>
        {children}
      </ol>
      <span className={cx("block", mark)}>{backLabel}</span>
    </div>
  );
}

export interface LayerRowProps {
  thumb: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Botones de la fila (ocultar, adelante, atrás, quitar): quedan fuera del botón que abre la fila. */
  actions?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ajustes de la capa, visibles con la fila abierta. */
  children?: React.ReactNode;
  className?: string;
  "data-testid"?: string;
}

/** Spec 025, RF-23 y RF-24: fila de una capa; al abrirla muestra sus ajustes debajo y queda resaltada. */
export function LayerRow({ thumb, title, subtitle, actions, open, onOpenChange, children, className, ...rest }: LayerRowProps) {
  const panel = useId();
  return (
    <li
      className={cx(
        "overflow-hidden rounded-m border-2 bg-ui-nav transition-[border-color,box-shadow] duration-[var(--duration-fast)]",
        open ? "border-ui-accent shadow-[4px_4px_0_var(--ui-k-menta)]" : "border-ui-line",
        className,
      )}
      data-open={open || undefined}
      data-testid={rest["data-testid"]}
    >
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panel}
          onClick={() => onOpenChange(!open)}
          className={cx("flex min-w-0 flex-1 items-center gap-3 rounded-s text-left", focusRing)}
        >
          <span aria-hidden className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-s border border-ui-line bg-[repeating-conic-gradient(var(--ui-hover)_0_25%,var(--ui-raised)_0_50%)] bg-[length:10px_10px]">
            {thumb}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-ui-text">{title}</span>
            {subtitle && <span className="block truncate text-xs text-ui-text-3">{subtitle}</span>}
          </span>
        </button>
        {actions && <div className="flex shrink-0 items-center gap-0.5">{actions}</div>}
      </div>
      {open && children && (
        <div id={panel} className="space-y-4 border-t-2 border-ui-line p-3">
          {children}
        </div>
      )}
    </li>
  );
}
