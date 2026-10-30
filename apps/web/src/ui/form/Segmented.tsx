"use client";

import { useId } from "react";
import { RadioGroup as RRadioGroup } from "radix-ui";
import { focusRing } from "../focus";
import { cx } from "../variants";

export interface SegmentedProps extends Omit<React.ComponentProps<typeof RRadioGroup.Root>, "children" | "onValueChange"> {
  label: React.ReactNode;
  options: { value: string; label: React.ReactNode }[];
  onValueChange?: (value: string) => void;
}

/** Spec 025, RF-25: pocas opciones excluyentes juntas en una barra (p. ej. el sello: ninguno, texto o imagen). */
export function Segmented({ label, options, className, ...rest }: SegmentedProps) {
  const id = useId();
  return (
    <div className={cx("flex flex-wrap items-center justify-between gap-2", className)}>
      <p id={id} className="text-sm font-medium text-ui-text">
        {label}
      </p>
      <RRadioGroup.Root aria-labelledby={id} orientation="horizontal" className="ui-seg inline-flex overflow-hidden rounded-m border-2 border-ui-line" {...rest}>
        {options.map((o, i) => (
          <RRadioGroup.Item
            key={o.value}
            value={o.value}
            className={cx(
              "px-3 py-1.5 text-xs font-extrabold uppercase italic tracking-wide text-ui-text-2 transition-colors duration-[var(--duration-fast)] hover:bg-ui-hover hover:text-ui-text",
              "data-[state=checked]:bg-ui-text data-[state=checked]:text-ui-rail",
              i > 0 && "border-l-2 border-ui-line",
              focusRing,
            )}
          >
            {o.label}
          </RRadioGroup.Item>
        ))}
      </RRadioGroup.Root>
    </div>
  );
}
