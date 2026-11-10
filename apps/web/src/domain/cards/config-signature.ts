// Spec 034: la firma de cómo se ve una carta. Va aparte de `final-card.ts` para que `CartaCapas` (que la usa en todas
// las pantallas del coleccionista) no arrastre el esquema de las capas ni zod.

/** Lo que no cambia cómo se ve la carta (enlaces, entrada, zona del puntero, etiqueta). */
const IGNORED = new Set(["src", "aparecer", "zona", "etiqueta", "estatica"]);

function stable(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.keys(v as object)
        .filter((k) => !IGNORED.has(k) && (v as Record<string, unknown>)[k] !== undefined)
        .sort()
        .map((k) => [k, stable((v as Record<string, unknown>)[k])]),
    );
  return v;
}

/**
 * Firma de cómo se ve una carta, sin los enlaces (cambian en cada pantalla). Dos pantallas con la misma firma muestran
 * la misma carta: la E2E compara la del armador con la de la apertura, «Abrir todos» y la ficha.
 */
export function configSignature(cfg: object): string {
  const s = JSON.stringify(stable(cfg));
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, "0");
}

/** RF-7 y RF-15: la carta se ve holo si la copia es holo o si se guardó con el holo activado. */
export const effectiveHolo = (copyHolo: boolean, config: { holo?: boolean } | null | undefined) => copyHolo || Boolean(config?.holo);
