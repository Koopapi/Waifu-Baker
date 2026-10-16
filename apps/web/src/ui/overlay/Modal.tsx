"use client";

import { useEffect, useRef } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { cx, variants } from "../variants";

const contentClasses = variants({
  base: "ui-modal fixed left-1/2 top-1/2 z-[var(--z-overlay)] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-ui-line bg-ui-nav p-6 shadow-3",
  variants: { size: { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-3xl" } },
  defaults: { size: "md" },
});

import { overlayClasses } from "./overlay-classes";
export { overlayClasses };

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Botones al pie, alineados a la derecha (el principal, el último). */
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** Identificador para las pruebas (por defecto «modal»). */
  testId?: string;
  /** Etiqueta del botón de cerrar (texto traducido). */
  closeLabel?: string;
  /** Solo para tests: sin portal, dentro del árbol. */
  inline?: boolean;
  children?: React.ReactNode;
}

/**
 * Spec 011, RF-6 y RF-14: ventana modal. Radix atrapa el foco, cierra con Escape o al pulsar fuera y devuelve el
 * foco al elemento que la abrió.
 */
export function Modal({ open, onOpenChange, title, description, footer, size, closeLabel = "Close", inline, testId = "modal", children }: ModalProps) {
  // Sin un Dialog.Trigger, Radix no sabe a quién devolver el foco: se recuerda quién lo tenía al abrir.
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open) opener.current = document.activeElement as HTMLElement | null;
  }, [open]);
  const body = (
    <>
      <Dialog.Overlay className={overlayClasses} />
      <Dialog.Content
        className={contentClasses({ size })}
        data-testid={testId}
        onCloseAutoFocus={(e) => {
          if (!opener.current) return;
          e.preventDefault();
          opener.current.focus();
        }}
      >
        <div className="mb-4 flex items-start gap-4">
          <div className="min-w-0 flex-1 space-y-1">
            <Dialog.Title className="text-lg font-bold text-ui-text">{title}</Dialog.Title>
            {description ? (
              <Dialog.Description className="text-sm text-ui-text-2">{description}</Dialog.Description>
            ) : (
              <Dialog.Description className="sr-only">{title}</Dialog.Description>
            )}
          </div>
          <Dialog.Close aria-label={closeLabel} className="-m-1 rounded-s p-1 text-ui-text-3 hover:bg-ui-hover hover:text-ui-text">
            <X aria-hidden className="size-5" />
          </Dialog.Close>
        </div>
        {children}
        {footer && <div className={cx("mt-6 flex flex-wrap justify-end gap-2")}>{footer}</div>}
      </Dialog.Content>
    </>
  );
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {inline ? body : <Dialog.Portal>{body}</Dialog.Portal>}
    </Dialog.Root>
  );
}
