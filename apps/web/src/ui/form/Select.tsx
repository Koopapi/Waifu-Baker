"use client";

import { Suspense, lazy, useId } from "react";
import { ChevronDown } from "lucide-react";
import { cx } from "../variants";
import { inputClasses } from "./Field";

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
}

export interface SelectProps {
  label: React.ReactNode;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  /** Muestra un buscador dentro de la lista (recomendado a partir de ~8 opciones). */
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Para enviar el valor en un formulario normal. */
  name?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  hideLabel?: boolean;
  disabled?: boolean;
  className?: string;
}

// Spec 011 (RNF de peso): Radix Popover y cmdk no entran en la carga inicial de la página; mientras se
// descargan, se ve un disparador idéntico (no se puede abrir durante esos milisegundos).
const SelectImpl = lazy(() => import("./SelectImpl").then((m) => ({ default: m.SelectImpl })));

function StaticSelect(p: SelectProps) {
  const id = useId();
  const current = p.options.find((o) => o.value === (p.value ?? p.defaultValue ?? ""));
  return (
    <div className={cx("relative space-y-1.5", p.className)}>
      <label htmlFor={id} className={p.hideLabel ? "sr-only" : "block text-xs font-semibold uppercase tracking-wide text-ui-text-2"}>
        {p.label}
      </label>
      <button id={id} type="button" role="combobox" aria-expanded={false} aria-controls={`${id}-list`} disabled className={cx(inputClasses, "flex h-10 items-center gap-2 text-left disabled:opacity-100")}>
        {current?.icon}
        <span className={cx("min-w-0 flex-1 truncate", !current && "text-ui-text-3")}>{current?.label ?? p.placeholder ?? ""}</span>
        <ChevronDown aria-hidden className="size-4 shrink-0 text-ui-text-3" />
      </button>
      {p.name && <input type="hidden" name={p.name} value={p.value ?? p.defaultValue ?? ""} />}
    </div>
  );
}

/** Spec 011, RF-4: desplegable propio, igual en todas partes, con buscador e iconos cuando hace falta. */
export function Select(p: SelectProps) {
  return (
    <Suspense fallback={<StaticSelect {...p} />}>
      <SelectImpl {...p} />
    </Suspense>
  );
}
