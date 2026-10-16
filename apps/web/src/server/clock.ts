// Hora del servidor. En desarrollo y E2E se puede adelantar (ruta /api/dev/clock) para probar
// esperas de horas y rachas de días sin esperar de verdad. En producción el desfase es siempre 0.
const g = globalThis as { __wbClockOffsetMs?: number };

export function now() {
  return new Date(Date.now() + (process.env.NODE_ENV === "production" ? 0 : (g.__wbClockOffsetMs ?? 0)));
}

export function setClockOffset(ms: number) {
  g.__wbClockOffsetMs = ms;
}

export function clockOffset() {
  return g.__wbClockOffsetMs ?? 0;
}
