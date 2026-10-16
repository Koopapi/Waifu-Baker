// Spec 011, RF-8: cálculos puros de las piezas de juego (sin reloj ni DOM).

/** Horas, minutos y segundos que faltan; `done` al llegar a cero. */
export function splitDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60, done: ms <= 0 };
}

/** Valor del contador animado en `progress` (0 a 1), con salida suave. */
export function counterAt(from: number, to: number, progress: number) {
  const p = Math.min(1, Math.max(0, progress));
  const eased = 1 - (1 - p) ** 3;
  return Math.round(from + (to - from) * eased);
}
