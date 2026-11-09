"use client";

import { useId } from "react";
import { focusRing } from "../focus";
import { cx } from "../variants";

export interface ToggleChipOption {
  value: string;
  label: React.ReactNode;
  /** Cuántos elementos tiene la opción (spec 033, RF-4). */
  count?: number;
  /** Fondo CSS de la muestra (p. ej. el color de una rareza). */
  swatch?: string;
}

export interface ToggleChipsProps {
  label: React.ReactNode;
  options: ToggleChipOption[];
  value: readonly string[];
  onValueChange: (value: string[]) => void;
  hideLabel?: boolean;
  className?: string;
  "data-testid"?: string;
}

/**
 * Spec 033: fichas de varias opciones (filtros). Cada ficha es un botón con `aria-pressed`; mismo aspecto que
 * `ChipGroup`, que es de una sola opción.
 */
export function ToggleChips({ label, options, value, onValueChange, hideLabel = false, className, "data-testid": testId }: ToggleChipsProps) {
  const id = useId();
  const toggle = (v: string) => onValueChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className={cx("space-y-2", className)} data-testid={testId}>
      <p id={id} className={hideLabel ? "sr-only" : "text-xs font-semibold uppercase tracking-wide text-ui-text-2"}>
        {label}
      </p>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              data-value={o.value}
              onClick={() => toggle(o.value)}
              className={cx(
                "ui-chip inline-flex items-center gap-2 rounded-m border-2 border-ui-line px-3 py-1.5 text-xs font-extrabold uppercase italic tracking-wide text-ui-text-2 transition-colors duration-[var(--duration-fast)] hover:border-ui-hover hover:text-ui-text",
                "aria-pressed:border-ui-accent aria-pressed:bg-ui-accent aria-pressed:text-ui-on-accent",
                focusRing,
              )}
            >
              {o.swatch !== undefined && <span aria-hidden className="size-3 shrink-0 rounded-[3px] border border-ui-rail" style={{ background: o.swatch }} />}
              {o.label}
              {o.count !== undefined && <span className="tabular-nums opacity-70">{o.count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
