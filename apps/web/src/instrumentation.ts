import * as Sentry from "@sentry/nextjs";

// Next.js llama a register() una vez al arrancar el servidor. La condición va en línea para que Next
// deje fuera del paquete edge todo lo que usa Node (base de datos, Patreon, copias).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { sentryDsn, scrubEvent } = await import("./lib/sentry-scrub");
    const dsn = sentryDsn(process.env, "server");
    // Spec 007, RF-9 y RF-10: sin DSN no se envía nada.
    if (dsn) Sentry.init({ dsn, tracesSampleRate: 0, beforeSend: (e) => scrubEvent(e) });
    const { startSchedulerIfEnabled } = await import("./server/scheduler");
    startSchedulerIfEnabled();
  }
}

/** Errores de las peticiones (páginas, acciones y rutas) hacia Sentry, si está configurado. */
export const onRequestError = Sentry.captureRequestError;
