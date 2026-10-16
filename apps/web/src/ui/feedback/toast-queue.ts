// Spec 010, RF-8 y spec 011, RF-5 y RF-11: cola de avisos emergentes. Pura: la hora llega como argumento.

export type ToastKind = "success" | "error" | "info";
export interface ToastInput {
  kind: ToastKind;
  title: string;
  description?: string;
  /** Spec 011, RF-11: «Deshacer» (o «Reintentar» en un error); al pulsarla, el aviso se cierra. */
  action?: { label: string; onAction: () => void };
}
export interface Toast extends ToastInput {
  id: number;
  expiresAt: number;
}
export interface ToastState {
  items: Toast[];
  seq: number;
}

/** Cuánto se ve cada aviso: los errores, más tiempo para poder leerlos. */
export const TOAST_MS: Record<ToastKind, number> = { success: 4_000, info: 4_000, error: 7_000 };
export const MAX_TOASTS = 3;
/** Con una acción (deshacer, reintentar) el aviso dura más, para dar tiempo a pulsarla. */
export const UNDO_MS = 6_000;

export function pushToast(s: ToastState, t: ToastInput, now: number): ToastState {
  const id = s.seq + 1;
  const items = [...s.items, { id, ...t, expiresAt: now + (t.action ? UNDO_MS : TOAST_MS[t.kind]) }].slice(-MAX_TOASTS);
  return { items, seq: id };
}

export function dismissToast(s: ToastState, id: number): ToastState {
  return { ...s, items: s.items.filter((t) => t.id !== id) };
}

export function expireToasts(s: ToastState, now: number): ToastState {
  const items = s.items.filter((t) => t.expiresAt > now);
  return items.length === s.items.length ? s : { ...s, items };
}
