"use client";

import { useId } from "react";
import { RadioGroup as RRadioGroup } from "radix-ui";
import { focusRing } from "../focus";
import { cx } from "../variants";

export interface OptionCard {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  /** Miniatura de la opción (p. ej. cómo se ve un tema). */
  preview?: React.ReactNode;
}

export interface OptionCardsProps extends Omit<React.ComponentProps<typeof RRadioGroup.Root>, "children" | "onValueChange"> {
  label: React.ReactNode;
  options: OptionCard[];
  onValueChange?: (value: string) => void;
  /** Etiqueta que se muestra en la opción elegida (p. ej. «Activo»). */
  checkedLabel?: React.ReactNode;
  hideLabel?: boolean;
}

/** Spec 026, RF-4: opciones excluyentes como tarjetas con miniatura, nombre y descripción (el selector de tema). */
export function OptionCards({ label, options, checkedLabel, hideLabel = false, className, ...rest }: OptionCardsProps) {
  const id = useId();
  return (
    <div className={cx("space-y-2", className)}>
      <p id={id} className={hideLabel ? "sr-only" : "text-xs font-semibold uppercase tracking-wide text-ui-text-2"}>
        {label}
      </p>
      <RRadioGroup.Root aria-labelledby={id} className="grid grid-cols-2 gap-3" {...rest}>
        {options.map((o) => (
          <RRadioGroup.Item
            key={o.value}
            value={o.value}
            className={cx(
              "ui-option-card group flex min-w-0 flex-col gap-2.5 rounded-l border-2 border-ui-line bg-ui-raised p-3 text-left transition-[border-color,box-shadow] duration-[var(--duration-fast)] hover:border-ui-hover",
              "data-[state=checked]:border-ui-accent data-[state=checked]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--ui-accent)_35%,transparent)]",
              focusRing,
            )}
          >
            {o.preview}
            <span className="flex items-center gap-2">
              <span aria-hidden className="ui-option-card-dot grid size-[18px] shrink-0 place-items-center rounded-full border-2 border-ui-line group-data-[state=checked]:border-ui-accent">
                <span className="size-2 rounded-full bg-ui-accent opacity-0 group-data-[state=checked]:opacity-100" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-ui-text">{o.label}</span>
              {checkedLabel && (
                <span className="ui-option-card-tag hidden shrink-0 rounded-s bg-ui-accent px-1.5 text-[11px] font-bold text-ui-on-accent sm:group-data-[state=checked]:inline">{checkedLabel}</span>
              )}
            </span>
            {o.description && <span className="hidden text-xs text-ui-text-3 sm:block">{o.description}</span>}
          </RRadioGroup.Item>
        ))}
      </RRadioGroup.Root>
    </div>
  );
}
