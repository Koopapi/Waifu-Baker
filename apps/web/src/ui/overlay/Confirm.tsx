"use client";

import { Suspense, createContext, lazy, useCallback, useContext, useReducer, useRef } from "react";
import { confirmReducer, type ConfirmRequest } from "./confirm-state";

// El modal (Radix AlertDialog) solo se descarga la primera vez que se pide una confirmación: no pesa en
// la carga de ninguna página (RNF de peso de la spec 011).
const ConfirmDialogView = lazy(() => import("./ConfirmDialogView").then((m) => ({ default: m.ConfirmDialogView })));

type Ask = (request: ConfirmRequest) => Promise<boolean>;
const ConfirmContext = createContext<Ask>(async () => false);

/**
 * Spec 011, RF-12: `const ok = await confirm({ title, body, confirmLabel, tone: "danger" })`. Sustituye a
 * `window.confirm` en toda la web.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(confirmReducer, { queue: [] });
  const resolvers = useRef(new Map<number, (ok: boolean) => void>());
  // Quién tenía el foco al pedir cada confirmación: lo recupera al cerrarse (RF-14).
  const openers = useRef(new Map<number, HTMLElement | null>());
  const seq = useRef(0);
  const ask = useCallback<Ask>(
    (request) =>
      new Promise<boolean>((resolve) => {
        const id = ++seq.current;
        resolvers.current.set(id, resolve);
        openers.current.set(id, document.activeElement as HTMLElement | null);
        dispatch({ type: "ask", id, request });
      }),
    [],
  );
  const current = state.queue[0];
  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      {current && (
        <Suspense fallback={null}>
          <ConfirmDialogView
          key={current.id}
          request={current.request}
          returnFocus={openers.current.get(current.id)}
          onAnswer={(ok) => {
            resolvers.current.get(current.id)?.(ok);
            resolvers.current.delete(current.id);
            openers.current.delete(current.id);
              dispatch({ type: "answered", id: current.id });
            }}
          />
        </Suspense>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
