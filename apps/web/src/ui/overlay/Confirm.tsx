"use client";

import { Suspense, createContext, lazy, useCallback, useContext, useReducer, useRef } from "react";
import { confirmReducer, type ConfirmAnswer, type ConfirmRequest } from "./confirm-state";

// El modal (Radix AlertDialog) solo se descarga la primera vez que se pide una confirmación: no pesa en
// la carga de ninguna página (RNF de peso de la spec 011).
const ConfirmDialogView = lazy(() => import("./ConfirmDialogView").then((m) => ({ default: m.ConfirmDialogView })));

type Ask = (request: ConfirmRequest) => Promise<ConfirmAnswer>;
const ConfirmContext = createContext<Ask>(async () => "cancel");

/**
 * Spec 011, RF-12: `const ok = await confirm({ title, body, confirmLabel, tone: "danger" })`. Sustituye a
 * `window.confirm` en toda la web. Spec 027, RF-7: `useChoice` devuelve también la opción secundaria.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(confirmReducer, { queue: [] });
  const resolvers = useRef(new Map<number, (answer: ConfirmAnswer) => void>());
  // Quién tenía el foco al pedir cada confirmación: lo recupera al cerrarse (RF-14).
  const openers = useRef(new Map<number, HTMLElement | null>());
  const seq = useRef(0);
  const ask = useCallback<Ask>(
    (request) =>
      new Promise<ConfirmAnswer>((resolve) => {
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
            onAnswer={(answer) => {
              resolvers.current.get(current.id)?.(answer);
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

/** Spec 027, RF-7: la pregunta con hasta tres opciones; devuelve cuál se eligió. */
export const useChoice = () => useContext(ConfirmContext);

/** Spec 011, RF-12: la pregunta de sí o no (true solo al confirmar). */
export function useConfirm() {
  const ask = useChoice();
  return useCallback(async (request: ConfirmRequest) => (await ask(request)) === "confirm", [ask]);
}
