// Spec 006, RF-9 y RF-12: reglas del álbum público. Puras.

export const MAX_FEATURED = 5;

type Verdict<T> = { ok: true; value: T } | { ok: false; message: string };

export function validateAlias(raw: string): Verdict<string> {
  const value = raw.trim().replace(/\s+/g, " ");
  if (value.length < 2 || value.length > 30) return { ok: false, message: "El alias debe tener entre 2 y 30 caracteres." };
  return { ok: true, value };
}

/** Destacadas: hasta 5, sin repetir y todas dentro de las permitidas (propias y SFW). */
export function validateFeatured(ids: string[], allowed: Set<string>): Verdict<string[]> {
  if (ids.length > MAX_FEATURED) return { ok: false, message: `Puedes destacar hasta ${MAX_FEATURED} cartas.` };
  if (new Set(ids).size !== ids.length) return { ok: false, message: "Has elegido la misma carta dos veces." };
  if (ids.some((id) => !allowed.has(id))) return { ok: false, message: "Solo puedes destacar cartas SFW que tengas." };
  return { ok: true, value: ids };
}
