"use client";

import { AlertDialog } from "radix-ui";
import { useT } from "@/i18n/client";
import { buttonClasses } from "../action/classes";
import { cx } from "../variants";
import type { ConfirmRequest } from "./confirm-state";
import { overlayClasses } from "./overlay-classes";

/** Vista del modal de confirmación; `onAnswer(true)` al confirmar. */
export function ConfirmDialogView({ request, onAnswer, inline, returnFocus }: { request: ConfirmRequest; onAnswer: (ok: boolean) => void; inline?: boolean; returnFocus?: HTMLElement | null }) {
  const t = useT().common;
  const danger = request.tone === "danger";
  const body = (
    <>
      <AlertDialog.Overlay className={overlayClasses} />
      <AlertDialog.Content
        className="ui-modal fixed left-1/2 top-1/2 z-[var(--z-overlay)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-ui-line bg-ui-nav p-6 shadow-3"
        data-testid="confirm-dialog"
        onCloseAutoFocus={(e) => {
          if (!returnFocus) return;
          e.preventDefault();
          returnFocus.focus();
        }}
      >
        <AlertDialog.Title className="text-lg font-bold text-ui-text">{request.title}</AlertDialog.Title>
        {request.body ? (
          <AlertDialog.Description className="mt-2 text-sm text-ui-text-2">{request.body}</AlertDialog.Description>
        ) : (
          <AlertDialog.Description className="sr-only">{request.title}</AlertDialog.Description>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <AlertDialog.Cancel className={buttonClasses({ variant: "ghost" })} onClick={() => onAnswer(false)}>
            {request.cancelLabel ?? t.cancel}
          </AlertDialog.Cancel>
          <AlertDialog.Action className={cx(buttonClasses({ variant: danger ? "danger" : "primary" }))} onClick={() => onAnswer(true)} data-testid="confirm-accept">
            {request.confirmLabel ?? t.confirm}
          </AlertDialog.Action>
        </div>
      </AlertDialog.Content>
    </>
  );
  return (
    <AlertDialog.Root open onOpenChange={(open) => !open && onAnswer(false)}>
      {inline ? body : <AlertDialog.Portal>{body}</AlertDialog.Portal>}
    </AlertDialog.Root>
  );
}
