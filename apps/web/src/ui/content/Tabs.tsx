"use client";

import { Tabs as RTabs } from "radix-ui";
import { focusRing } from "../focus";
import { cx } from "../variants";

export interface TabsProps {
  label: string;
  items: { value: string; label: React.ReactNode; content: React.ReactNode }[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  className?: string;
}

/** Spec 011, RF-7: pestañas (flechas para moverse, Tab para entrar en el contenido). */
export function Tabs({ label, items, className, ...rest }: TabsProps) {
  return (
    <RTabs.Root className={className} {...rest}>
      <RTabs.List aria-label={label} className="flex gap-1 border-b border-ui-line">
        {items.map((i) => (
          <RTabs.Trigger
            key={i.value}
            value={i.value}
            className={cx(
              "-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-ui-text-2 transition-colors duration-[var(--duration-fast)] hover:text-ui-text data-[state=active]:border-ui-accent data-[state=active]:text-ui-text",
              focusRing,
            )}
          >
            {i.label}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
      {items.map((i) => (
        <RTabs.Content key={i.value} value={i.value} className={cx("pt-4", focusRing)}>
          {i.content}
        </RTabs.Content>
      ))}
    </RTabs.Root>
  );
}
