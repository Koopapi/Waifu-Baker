import * as Sentry from "@sentry/nextjs";
import { scrubEvent, sentryDsn } from "./lib/sentry-scrub";

// Spec 007, RF-9 y RF-10: errores del navegador, solo con DSN público configurado.
const dsn = sentryDsn({ NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN }, "client");
if (dsn) Sentry.init({ dsn, tracesSampleRate: 0, beforeSend: (e) => scrubEvent(e) });

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
