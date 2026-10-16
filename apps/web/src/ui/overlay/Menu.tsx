"use client";

import { DropdownMenu, Tooltip as RTooltip } from "radix-ui";
import { cx } from "../variants";

export interface MenuItem {
  label: React.ReactNode;
  icon?: React.ReactNode;
  onSelect: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
}

export interface MenuProps {
  /** El elemento que abre el menú (normalmente un IconButton). */
  trigger: React.ReactElement;
  items: (MenuItem | "separator")[];
  align?: "start" | "end";
}

/** Spec 011, RF-6: menú contextual con teclado (flechas, Enter, Escape) y foco gestionado por Radix. */
export function Menu({ trigger, items, align = "end" }: MenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align={align} sideOffset={6} className="ui-pop z-[var(--z-overlay)] min-w-48 rounded-l border border-ui-line bg-ui-nav p-1 shadow-2" data-testid="menu">
          {items.map((it, i) =>
            it === "separator" ? (
              <DropdownMenu.Separator key={i} className="my-1 h-px bg-ui-line" />
            ) : (
              <DropdownMenu.Item
                key={i}
                disabled={it.disabled}
                onSelect={it.onSelect}
                className={cx(
                  "flex cursor-pointer items-center gap-2 rounded-m px-2.5 py-2 text-sm outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-ui-hover",
                  it.tone === "danger" ? "text-ui-danger-text" : "text-ui-text-2 data-[highlighted]:text-ui-text",
                )}
              >
                {it.icon}
                {it.label}
              </DropdownMenu.Item>
            ),
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** Spec 011, RF-6: descripción emergente al pasar el ratón o al enfocar. Para textos cortos, nunca imprescindibles. */
export function Tooltip({ content, children, side = "top" }: { content: React.ReactNode; children: React.ReactElement; side?: "top" | "right" | "bottom" | "left" }) {
  return (
    <RTooltip.Provider delayDuration={300}>
      <RTooltip.Root>
        <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
        <RTooltip.Portal>
          <RTooltip.Content side={side} sideOffset={6} className="ui-pop z-[var(--z-toast)] rounded-m bg-ui-rail px-2.5 py-1.5 text-xs font-medium text-ui-text shadow-2">
            {content}
          </RTooltip.Content>
        </RTooltip.Portal>
      </RTooltip.Root>
    </RTooltip.Provider>
  );
}
