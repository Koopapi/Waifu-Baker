// Spec 011, RF-10 y RF-11: flujo de una acción optimista, sin React (se prueba con funciones falsas).

export type ActionResult = { ok: boolean; error?: string };

export interface OptimisticNotice {
  kind: "success" | "error";
  /** Mensaje del servidor (en los errores). */
  message?: string;
  /** «undo» en el éxito de una acción reversible; «retry» en un error. */
  action?: "undo" | "retry";
  onAction?: () => Promise<void>;
}

export interface OptimisticFlow<T> {
  prev: T;
  next: T;
  /** Pinta un valor en la interfaz. */
  set: (value: T) => void;
  /** La server action. */
  run: () => Promise<ActionResult>;
  /** La acción contraria, si la acción es reversible. */
  undo?: () => Promise<ActionResult>;
  notify: (notice: OptimisticNotice) => void;
}

const attempt = async (fn: () => Promise<ActionResult>): Promise<ActionResult> => {
  try {
    return await fn();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : undefined };
  }
};

/**
 * Aplica `next` al instante y llama al servidor. Si falla (o no hay conexión), vuelve a `prev` y avisa con
 * «Reintentar». Si sale bien y hay `undo`, el aviso de éxito ofrece «Deshacer», que vuelve a `prev` al momento
 * y, si el servidor no puede deshacerla, regresa a `next` y lo avisa.
 */
export async function runOptimistic<T>(f: OptimisticFlow<T>): Promise<ActionResult> {
  f.set(f.next);
  const r = await attempt(f.run);
  if (!r.ok) {
    f.set(f.prev);
    f.notify({
      kind: "error",
      message: r.error,
      action: "retry",
      onAction: async () => {
        await runOptimistic(f);
      },
    });
    return r;
  }
  const undo = f.undo;
  f.notify(
    undo
      ? {
          kind: "success",
          action: "undo",
          onAction: async () => {
            f.set(f.prev);
            const u = await attempt(undo);
            if (!u.ok) {
              f.set(f.next);
              f.notify({ kind: "error", message: u.error });
            }
          },
        }
      : { kind: "success" },
  );
  return r;
}
