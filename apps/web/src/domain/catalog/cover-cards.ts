// Spec 028, RF-20 a RF-23: cartas de la portada pública. De 3 a 5, sin repetir y en el orden del abanico (de izquierda a
// derecha). Solo valen las de colecciones publicadas que no sean 18+ y con imagen pública. Puro.
import { z } from "zod";

export const COVER_MIN = 3;
export const COVER_MAX = 5;

export const coverIdsSchema = z.array(z.string().uuid()).max(COVER_MAX);

export type CoverProblem = "count" | "duplicate";

/** RF-20: lo que el administrador quiere guardar. Vacía también vale: quita el abanico (RF-23). */
export function coverSelectionProblem(ids: readonly string[]): CoverProblem | null {
  if (new Set(ids).size !== ids.length) return "duplicate";
  if (ids.length !== 0 && (ids.length < COVER_MIN || ids.length > COVER_MAX)) return "count";
  return null;
}

/** RF-20 y RF-22: una carta vale para la portada si su colección está publicada (no archivada) y no es 18+. */
export function isValidCover(c: { setStatus: string; setIsAdult: boolean; keyPublic: string | null }): boolean {
  return c.setStatus === "published" && !c.setIsAdult && Boolean(c.keyPublic);
}

/** Lo guardado en los ajustes (lista de ids) o vacía si no es válido. */
export function parseCoverIds(value: unknown): string[] {
  const r = coverIdsSchema.safeParse(value);
  return r.success ? [...new Set(r.data)] : [];
}
