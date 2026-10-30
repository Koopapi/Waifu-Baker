"use client";

import { useId } from "react";
import { focusRing } from "../focus";
import { cx } from "../variants";

export interface ColorFieldProps {
  label: React.ReactNode;
  /** Color en hexadecimal (#rrggbb). */
  value: string;
  onValueChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
}

/** Spec 025, RF-14 y RF-16: muestra de color que abre el selector del sistema; el valor es siempre #rrggbb. */
export function ColorField({ label, value, onValueChange, disabled, className, ...rest }: ColorFieldProps) {
  const id = useId();
  return (
    <div className={cx("inline-flex items-center gap-2", disabled && "opacity-50", className)}>
      <input
        type="color"
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onValueChange(e.target.value.toLowerCase())}
        className={cx(
          "h-8 w-11 cursor-pointer rounded-s border-2 border-ui-line bg-ui-rail p-0.5 disabled:cursor-not-allowed [&::-webkit-color-swatch]:rounded-[3px] [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0",
          focusRing,
        )}
        data-testid={rest["data-testid"]}
      />
      <label htmlFor={id} className="text-sm text-ui-text">
        {label}
        <span className="ml-2 font-mono text-xs text-ui-text-3">{value}</span>
      </label>
    </div>
  );
}
