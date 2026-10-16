// Spec 011, RF-12: cola de confirmaciones. Si se piden dos a la vez, se muestran de una en una.

export interface ConfirmRequest {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** «danger»: acción irreversible, botón en rojo. */
  tone?: "danger" | "default";
}

export interface ConfirmState {
  queue: { id: number; request: ConfirmRequest }[];
}

export type ConfirmAction = { type: "ask"; id: number; request: ConfirmRequest } | { type: "answered"; id: number };

export function confirmReducer(s: ConfirmState, a: ConfirmAction): ConfirmState {
  if (a.type === "ask") return { queue: [...s.queue, { id: a.id, request: a.request }] };
  return { queue: s.queue.filter((q) => q.id !== a.id) };
}
