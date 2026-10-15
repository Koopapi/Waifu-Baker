import type { Dict } from "./index";
import type { MsgParams } from "./types";

/**
 * Spec 008, RF-5: traduce un error de negocio o un problema de validación por su código. Si falta la
 * traducción (el test de RF-10 debería impedirlo) se usa el mensaje original.
 */
export function translateError(t: Dict, e: { code?: string; message?: string; params?: MsgParams }): string {
  const m = e.code ? t.errors[e.code] : undefined;
  if (typeof m === "function") return m(e.params ?? {});
  if (typeof m === "string") return m;
  const unknown = t.errors.unknown;
  return e.message || (typeof unknown === "function" ? unknown({}) : unknown);
}
