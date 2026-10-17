// Spec 007, RF-9 y RF-10, y spec 013, RF-11: Sentry en el navegador. El SDK se pide con `import()` solo si hay
// DSN, así no entra en el JavaScript de la primera carga de ninguna página.
import { scrubEvent, sentryDsn } from "./sentry-scrub";

type SentrySdk = typeof import("@sentry/nextjs");

let sdk: Promise<SentrySdk> | null = null;

/** Carga e inicia Sentry una sola vez; sin DSN devuelve `null` y no descarga nada. */
export function loadSentry(): Promise<SentrySdk> | null {
  const dsn = sentryDsn({ NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN }, "client");
  if (!dsn) return null;
  sdk ??= import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({ dsn, tracesSampleRate: 0, beforeSend: (e) => scrubEvent(e) });
    return Sentry;
  });
  return sdk;
}

export function captureClientError(error: unknown) {
  void loadSentry()?.then((Sentry) => Sentry.captureException(error));
}
