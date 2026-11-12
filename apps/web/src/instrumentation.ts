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
    // Spec 035: aviso en Telegram cuando la versión nueva ya responde (DEPLOY_NOTICE=1, solo en el servidor).
    const { startDeployNotice } = await import("./server/deploy-notice-start");
    startDeployNotice();
    // Spec 037, RF-17: regenera las imágenes fijas de receta anterior (FLAT_REGEN=0 la apaga).
    const { startFlatRegen } = await import("./server/flat-regen-start");
    startFlatRegen();
  }
}

/** Errores de las peticiones (páginas, acciones y rutas) hacia Sentry, si está configurado. */
export const onRequestError = Sentry.captureRequestError;
