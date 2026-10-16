// Spec 010, RF-8: cola de avisos emergentes. Pura: la hora llega como argumento.

export type ToastKind = "success" | "error" | "info";
export interface ToastInput {
  kind: ToastKind;
  title: string;
  description?: string;
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

export function pushToast(s: ToastState, t: ToastInput, now: number): ToastState {
  const id = s.seq + 1;
  const items = [...s.items, { id, ...t, expiresAt: now + TOAST_MS[t.kind] }].slice(-MAX_TOASTS);
  return { items, seq: id };
}

export function dismissToast(s: ToastState, id: number): ToastState {
  return { ...s, items: s.items.filter((t) => t.id !== id) };
}

export function expireToasts(s: ToastState, now: number): ToastState {
  const items = s.items.filter((t) => t.expiresAt > now);
  return items.length === s.items.length ? s : { ...s, items };
}
