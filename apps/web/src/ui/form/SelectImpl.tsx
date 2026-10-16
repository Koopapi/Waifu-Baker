"use client";

import { useId, useState } from "react";
import { Popover } from "radix-ui";
import { Command } from "cmdk";
import { Check, ChevronDown, Search } from "lucide-react";
import { focusRing } from "../focus";
import { cx } from "../variants";
import { inputClasses } from "./Field";
import type { SelectProps } from "./Select";

/**
 * Spec 011, RF-4: implementación del desplegable (Radix Popover pone el foco, el cierre con Escape y la
 * posición; cmdk filtra y navega con el teclado). Se usa a través de `Select`, que la carga aparte.
 */
export function SelectImpl(p: SelectProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [inner, setInner] = useState(p.defaultValue ?? "");
  const value = p.value ?? inner;
  const current = p.options.find((o) => o.value === value);
  const hintId = p.hint ? `${id}-hint` : undefined;
  const errorId = p.error ? `${id}-error` : undefined;

  const choose = (v: string) => {
    if (p.value === undefined) setInner(v);
    p.onValueChange?.(v);
    setOpen(false);
  };

  return (
    <div className={cx("relative space-y-1.5", p.className)}>
      <label htmlFor={id} className={p.hideLabel ? "sr-only" : "block text-xs font-semibold uppercase tracking-wide text-ui-text-2"}>
        {p.label}
      </label>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-controls={`${id}-list`}
            aria-invalid={p.error ? true : undefined}
            aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
            disabled={p.disabled}
            className={cx(inputClasses, "flex h-10 items-center gap-2 text-left")}
          >
            {current?.icon}
            <span className={cx("min-w-0 flex-1 truncate", !current && "text-ui-text-3")}>{current?.label ?? p.placeholder ?? ""}</span>
            <ChevronDown aria-hidden className={cx("size-4 shrink-0 text-ui-text-3 transition-transform duration-[var(--duration-fast)]", open && "rotate-180")} />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            id={`${id}-list`}
            align="start"
            sideOffset={6}
            className="ui-pop z-[var(--z-overlay)] w-[var(--radix-popover-trigger-width)] min-w-56 overflow-hidden rounded-l border border-ui-line bg-ui-nav shadow-2"
          >
            <Command loop className="flex max-h-80 flex-col">
              {p.searchable && (
                <div className="flex items-center gap-2 border-b border-ui-line px-3">
                  <Search aria-hidden className="size-4 text-ui-text-3" />
                  <Command.Input autoFocus placeholder={p.searchPlaceholder} className="h-10 w-full bg-transparent text-sm text-ui-text outline-none placeholder:text-ui-text-3 focus-visible:outline-none" />
                </div>
              )}
              <Command.List className="overflow-y-auto p-1">
                <Command.Empty className="px-3 py-6 text-center text-sm text-ui-text-3">{p.emptyText}</Command.Empty>
                {p.options.map((o) => (
                  <Command.Item
                    key={o.value}
                    value={`${o.label} ${o.value}`}
                    onSelect={() => choose(o.value)}
                    className={cx(
                      "flex cursor-pointer items-center gap-2 rounded-m px-2.5 py-2 text-sm text-ui-text-2 data-[selected=true]:bg-ui-hover data-[selected=true]:text-ui-text",
                      focusRing,
                    )}
                  >
                    {o.icon}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{o.label}</span>
                      {o.description && <span className="block truncate text-xs text-ui-text-3">{o.description}</span>}
                    </span>
                    {o.value === value && <Check aria-hidden className="size-4 text-ui-accent-text" />}
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {p.name && <input type="hidden" name={p.name} value={value} />}
      {p.hint && (
        <p id={hintId} className="text-xs text-ui-text-3">
          {p.hint}
        </p>
      )}
      {p.error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-ui-danger-text">
          {p.error}
        </p>
      )}
    </div>
  );
}
