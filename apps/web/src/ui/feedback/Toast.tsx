"use client";

import { createContext, useCallback, useContext, useEffect, useReducer } from "react";
import { X } from "lucide-react";
import { useT } from "@/i18n/client";
import { dismissToast, expireToasts, pushToast, type ToastInput, type ToastState } from "./toast-queue";

type Action = { type: "push"; toast: ToastInput } | { type: "dismiss"; id: number } | { type: "tick" };

function reducer(s: ToastState, a: Action): ToastState {
  if (a.type === "push") return pushToast(s, a.toast, Date.now());
  if (a.type === "dismiss") return dismissToast(s, a.id);
  return expireToasts(s, Date.now());
}

const ToastContext = createContext<(t: ToastInput) => void>(() => {});

/** Spec 010, RF-8 y spec 011, RF-5: avisos que entran animados y desaparecen solos; se anuncian a los lectores de pantalla. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [], seq: 0 });
  const t = useT().common;
  const toast = useCallback((toast: ToastInput) => dispatch({ type: "push", toast }), []);

  useEffect(() => {
    if (state.items.length === 0) return;
    const next = Math.min(...state.items.map((i) => i.expiresAt)) - Date.now();
    const id = setTimeout(() => dispatch({ type: "tick" }), Math.max(next, 0) + 20);
    return () => clearTimeout(id);
  }, [state.items]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-3 bottom-20 z-[var(--z-toast)] flex flex-col items-end gap-2 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-80"
        data-testid="toasts"
      >
        {state.items.map((i) => (
          <div
            key={i.id}
            role={i.kind === "error" ? "alert" : "status"}
            className="toast-in pointer-events-auto flex w-full items-start gap-3 rounded-lg border border-ui-line bg-ui-raised px-3.5 py-3 shadow-2"
            data-testid="toast"
            data-kind={i.kind}
          >
            <span
              aria-hidden
              className={`mt-0.5 h-9 w-1 shrink-0 rounded-full ${i.kind === "error" ? "bg-ui-danger" : i.kind === "success" ? "bg-ui-success" : "bg-ui-info"}`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ui-text">{i.title}</p>
              {i.description && <p className="text-xs text-ui-text-2">{i.description}</p>}
            </div>
            {i.action && (
              <button
                type="button"
                onClick={() => {
                  i.action!.onAction();
                  dispatch({ type: "dismiss", id: i.id });
                }}
                className="shrink-0 rounded-s px-2 py-1 text-sm font-semibold text-ui-accent-text hover:bg-ui-hover"
                data-testid="toast-action"
              >
                {i.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => dispatch({ type: "dismiss", id: i.id })}
              aria-label={t.close}
              className="rounded p-1 text-ui-text-3 hover:bg-ui-hover hover:text-ui-text"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
