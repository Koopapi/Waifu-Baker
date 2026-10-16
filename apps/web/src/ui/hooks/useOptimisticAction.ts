"use client";

import { useCallback, useState } from "react";
import { useT } from "@/i18n/client";
import { useToast } from "../feedback/Toast";
import { runOptimistic, type ActionResult } from "./optimistic";

export interface OptimisticOptions<T, A> {
  /** Valor actual que viene del servidor. */
  value: T;
  /** Cómo queda el valor tras la acción. */
  apply: (value: T, arg: A) => T;
  run: (arg: A) => Promise<ActionResult>;
  /** Acción contraria: si existe, el aviso de éxito ofrece «Deshacer». */
  undo?: (arg: A) => Promise<ActionResult>;
  /** Título del aviso de éxito. */
  successTitle: string;
}

/**
 * Spec 011, RF-10 y RF-11: `const [value, act] = useOptimisticAction({ value, apply, run, undo, successTitle })`.
 * La interfaz muestra `value` ya cambiado mientras el servidor responde.
 */
export function useOptimisticAction<T, A>(o: OptimisticOptions<T, A>) {
  const toast = useToast();
  const t = useT().common;
  const [local, setLocal] = useState<{ base: T; value: T }>({ base: o.value, value: o.value });
  // Si el servidor manda un valor nuevo (p. ej. tras revalidar), manda él.
  const shown = local.base === o.value ? local.value : o.value;

  const act = useCallback(
    (arg: A) =>
      runOptimistic({
        prev: shown,
        next: o.apply(shown, arg),
        set: (v) => setLocal({ base: o.value, value: v }),
        run: () => o.run(arg),
        undo: o.undo ? () => o.undo!(arg) : undefined,
        notify: (n) =>
          toast({
            kind: n.kind,
            title: n.kind === "success" ? o.successTitle : (n.message ?? t.toast.failed),
            action: n.onAction ? { label: n.action === "undo" ? t.undo : t.retry, onAction: () => void n.onAction!() } : undefined,
          }),
      }),
    [o, shown, toast, t],
  );
  return [shown, act] as const;
}
