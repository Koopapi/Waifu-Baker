"use client";

import { useId } from "react";
import { RadioGroup as RRadioGroup } from "radix-ui";
import { focusRing } from "../focus";
import { cx } from "../variants";

export interface ChipOption {
  value: string;
  label: React.ReactNode;
  /** Fondo CSS de la muestra (p. ej. el degradado del marco de una rareza). */
  swatch?: string;
}

export interface ChipGroupProps extends Omit<React.ComponentProps<typeof RRadioGroup.Root>, "children" | "onValueChange"> {
  label: React.ReactNode;
  options: ChipOption[];
  onValueChange?: (value: string) => void;
  /** Oculta la etiqueta (queda para los lectores de pantalla). */
  hideLabel?: boolean;
}

/** Spec 025, RF-25: opciones excluyentes como fichas con su muestra de color (los escalones de rareza y sus marcos). */
export function ChipGroup({ label, options, hideLabel = false, className, ...rest }: ChipGroupProps) {
  const id = useId();
  return (
    <div className={cx("space-y-2", className)}>
      <p id={id} className={hideLabel ? "sr-only" : "text-xs font-semibold uppercase tracking-wide text-ui-text-2"}>
        {label}
      </p>
      <RRadioGroup.Root aria-labelledby={id} className="flex flex-wrap gap-2" {...rest}>
        {options.map((o) => (
          <RRadioGroup.Item
            key={o.value}
            value={o.value}
            className={cx(
              "ui-chip inline-flex items-center gap-2 rounded-m border-2 border-ui-line px-3 py-1.5 text-xs font-extrabold uppercase italic tracking-wide text-ui-text-2 transition-colors duration-[var(--duration-fast)] hover:border-ui-hover hover:text-ui-text",
              "data-[state=checked]:border-ui-accent data-[state=checked]:bg-ui-accent data-[state=checked]:text-ui-on-accent",
              focusRing,
            )}
          >
            {o.swatch !== undefined && <span aria-hidden className="size-3 shrink-0 rounded-[3px] border border-ui-rail" style={{ background: o.swatch }} />}
            {o.label}
          </RRadioGroup.Item>
        ))}
      </RRadioGroup.Root>
    </div>
  );
}
