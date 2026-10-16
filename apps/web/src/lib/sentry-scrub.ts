// Spec 007, RF-9 y RF-10: qué se manda a Sentry. Puro: lo usan el servidor y el navegador.

type Ev = {
  user?: { id?: string | number; [k: string]: unknown } | null;
  request?: { cookies?: unknown; headers?: unknown; data?: unknown; query_string?: unknown; [k: string]: unknown };
  extra?: Record<string, unknown>;
  [k: string]: unknown;
};

/** Sin DSN no se inicia nada y la web funciona igual (RF-10). */
export function sentryDsn(env: Record<string, string | undefined>, side: "server" | "client") {
  const dsn = side === "server" ? env.SENTRY_DSN || env.NEXT_PUBLIC_SENTRY_DSN : env.NEXT_PUBLIC_SENTRY_DSN;
  return dsn?.trim() || null;
}

/** RF-9: deja al usuario solo con su identificador interno y quita cookies, cabeceras, cuerpos e IP. */
export function scrubEvent<T extends object>(input: T): T {
  const event = input as unknown as Ev;
  if (event.user) {
    const id = event.user.id;
    event.user = id !== undefined && id !== null ? { id: String(id) } : undefined;
  }
  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.data;
    delete event.request.query_string;
  }
  return input;
}
