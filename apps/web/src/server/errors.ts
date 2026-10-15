/** Error esperado de negocio: `message` se muestra tal cual al administrador. */
export class AdminError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    /** Variables del mensaje, para traducirlo por código (spec 008). */
    public readonly params?: Record<string, string | number>,
  ) {
    super(message);
    this.name = "AdminError";
  }
}

export const isAdminError = (e: unknown): e is AdminError => e instanceof AdminError;

/** Detecta violaciones de unicidad de Postgres (23505), también envueltas por Drizzle. */
export function isUniqueViolation(e: unknown): boolean {
  const seen = new Set<unknown>();
  let cur: unknown = e;
  while (cur && typeof cur === "object" && !seen.has(cur)) {
    seen.add(cur);
    if ((cur as { code?: string }).code === "23505") return true;
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}

/** Mismo error para el lado del usuario: el mensaje se muestra tal cual. */
export { AdminError as AppError };
