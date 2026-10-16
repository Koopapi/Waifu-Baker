"use client";

import { useId } from "react";
import { cx } from "../variants";
import { focusRing } from "../focus";

/** Aspecto común de los campos de texto (RF-4): borde, fondo, foco y estado de error. */
export const inputClasses = cx(
  "w-full rounded-m border border-ui-line bg-ui-rail px-3 text-sm text-ui-text placeholder:text-ui-text-3",
  "transition-colors duration-[var(--duration-fast)] hover:border-ui-hover focus-visible:border-ui-accent-text",
  "aria-[invalid=true]:border-ui-danger disabled:cursor-not-allowed disabled:opacity-50",
  focusRing,
);

export interface FieldProps {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  /** Oculta la etiqueta a la vista (sigue para lectores de pantalla). */
  hideLabel?: boolean;
  className?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => React.ReactNode;
}

/** Spec 011, RF-4: etiqueta, ayuda y error enlazados al control por id y aria-describedby. */
export function Field({ label, hint, error, hideLabel, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cx("relative space-y-1.5", className)}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "block text-xs font-semibold uppercase tracking-wide text-ui-text-2"}>
        {label}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && (
        <p id={hintId} className="text-xs text-ui-text-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-ui-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}
