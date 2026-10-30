"use client";

import { useId } from "react";
import { RadioGroup as RRadioGroup, Switch as RSwitch } from "radix-ui";
import { Check } from "@/ui/icons/glyphs";
import { focusRing } from "../focus";
import { cx } from "../variants";

/** Casilla nativa con el aspecto del sistema: la marca se pinta encima y la casilla se ve a través de ella. */
const box = cx(
  "ui-check peer size-[18px] shrink-0 cursor-pointer appearance-none rounded-s border border-ui-line bg-ui-rail transition-colors duration-[var(--duration-fast)]",
  "hover:border-ui-hover checked:border-ui-accent checked:bg-ui-accent disabled:cursor-not-allowed disabled:opacity-50",
  focusRing,
);

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "children"> {
  label: React.ReactNode;
  onCheckedChange?: (checked: boolean) => void;
}

/**
 * Spec 011, RF-4: casilla. Es un `<input type="checkbox">` nativo: responde al toque aunque la página aún no
 * haya cargado su JavaScript, y con `name` se envía en el formulario como un campo normal («on»).
 */
export function Checkbox({ label, className, onCheckedChange, onChange, id: idProp, ...rest }: CheckboxProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <div className={cx("relative flex items-start gap-3", className)}>
      <span className="relative mt-0.5 grid size-[18px] shrink-0">
        <input
          type="checkbox"
          id={id}
          className={box}
          onChange={(e) => {
            onChange?.(e);
            onCheckedChange?.(e.target.checked);
          }}
          {...rest}
        />
        <Check aria-hidden className="pointer-events-none absolute inset-0 m-auto size-3.5 text-ui-on-accent opacity-0 peer-checked:opacity-100" strokeWidth={3} />
      </span>
      <label htmlFor={id} className="text-sm text-ui-text">
        {label}
      </label>
    </div>
  );
}

export interface SwitchProps extends Omit<React.ComponentProps<typeof RSwitch.Root>, "children"> {
  label: React.ReactNode;
  description?: React.ReactNode;
}

/** Spec 011, RF-4: interruptor de encendido y apagado. */
export function Switch({ label, description, className, ...rest }: SwitchProps) {
  const id = useId();
  return (
    <div className={cx("relative flex items-center justify-between gap-4", className)}>
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-ui-text">
          {label}
        </label>
        {description && <p className="text-xs text-ui-text-3">{description}</p>}
      </div>
      <RSwitch.Root
        id={id}
        className={cx(
          "ui-switch relative h-6 w-10 shrink-0 rounded-full bg-ui-hover transition-colors duration-[var(--duration-fast)] data-[state=checked]:bg-ui-success disabled:opacity-50",
          focusRing,
        )}
        {...rest}
      >
        <RSwitch.Thumb className="block size-[18px] translate-x-[3px] rounded-full bg-ui-text shadow-1 transition-transform duration-[var(--duration-fast)] data-[state=checked]:translate-x-[19px]" />
      </RSwitch.Root>
    </div>
  );
}

export interface RadioGroupProps extends Omit<React.ComponentProps<typeof RRadioGroup.Root>, "children"> {
  label: React.ReactNode;
  options: { value: string; label: React.ReactNode; description?: React.ReactNode }[];
  /** «cards»: opciones como botones grandes (p. ej. 16+ / 18+). */
  appearance?: "list" | "cards";
}

/** Spec 011, RF-4: grupo de opciones excluyentes. */
export function RadioGroup({ label, options, appearance = "list", className, ...rest }: RadioGroupProps) {
  const id = useId();
  return (
    <div className={cx("relative space-y-2", className)}>
      <p id={id} className="text-xs font-semibold uppercase tracking-wide text-ui-text-2">
        {label}
      </p>
      <RRadioGroup.Root aria-labelledby={id} className={appearance === "cards" ? "flex flex-wrap gap-2" : "space-y-2"} {...rest}>
        {options.map((o) =>
          appearance === "cards" ? (
            <RRadioGroup.Item
              key={o.value}
              value={o.value}
              className={cx(
                "ui-option rounded-m border border-ui-line px-5 py-2.5 text-sm font-semibold text-ui-text-2 transition-colors duration-[var(--duration-fast)] hover:bg-ui-hover",
                "data-[state=checked]:border-ui-accent-text data-[state=checked]:bg-ui-accent/15 data-[state=checked]:text-ui-text",
                focusRing,
              )}
            >
              {o.label}
            </RRadioGroup.Item>
          ) : (
            <label key={o.value} className="flex cursor-pointer items-start gap-3 text-sm text-ui-text">
              <RRadioGroup.Item value={o.value} className={cx(box, "mt-0.5 rounded-full")}>
                <RRadioGroup.Indicator className="size-2 rounded-full bg-ui-on-accent" />
              </RRadioGroup.Item>
              <span>
                {o.label}
                {o.description && <span className="block text-xs text-ui-text-3">{o.description}</span>}
              </span>
            </label>
          ),
        )}
      </RRadioGroup.Root>
    </div>
  );
}
