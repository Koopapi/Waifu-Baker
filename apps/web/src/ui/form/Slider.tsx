"use client";

import { useId } from "react";
import { focusRing } from "../focus";
import { cx } from "../variants";

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange" | "min" | "max" | "step"> {
  label: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Texto del valor a la derecha (por defecto, el número con su unidad). */
  format?: (v: number) => string;
  unit?: string;
  onValueChange: (v: number) => void;
}

/**
 * Spec 025, RF-22: deslizador con su nombre a la izquierda y su valor a la derecha (como el configurador de Bruno).
 * Es un `<input type="range">` nativo: las flechas del teclado lo mueven paso a paso y los lectores de pantalla leen el
 * valor con su unidad.
 */
export function Slider({ label, value, min, max, step = 1, format, unit = "", onValueChange, className, id: idProp, disabled, ...rest }: SliderProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const text = format ? format(value) : `${value}${unit}`;
  const fill = max > min ? ((Math.min(max, Math.max(min, value)) - min) / (max - min)) * 100 : 0;
  return (
    <div className={cx("space-y-1.5", disabled && "opacity-50", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ui-text">
          {label}
        </label>
        <output htmlFor={id} className="shrink-0 font-mono text-xs font-semibold tabular-nums text-ui-accent-text">
          {text}
        </output>
      </div>
      <input
        type="range"
        id={id}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={text}
        onChange={(e) => onValueChange(Number(e.target.value))}
        style={{ "--fill": `${fill}%` } as React.CSSProperties}
        className={cx(
          "ui-slider block h-2 w-full cursor-pointer appearance-none rounded-full bg-[linear-gradient(to_right,var(--ui-accent)_var(--fill),var(--ui-hover)_var(--fill))] disabled:cursor-not-allowed",
          "[&::-webkit-slider-thumb]:size-[18px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-ui-on-accent [&::-webkit-slider-thumb]:bg-ui-accent [&::-webkit-slider-thumb]:shadow-1",
          "[&::-moz-range-thumb]:size-[14px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-ui-on-accent [&::-moz-range-thumb]:bg-ui-accent",
          focusRing,
        )}
        {...rest}
      />
    </div>
  );
}
