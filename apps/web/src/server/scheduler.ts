// Spec 001: tareas periódicas en el propio servidor (una sola instancia, local y beta). En el
// despliegue con varias instancias pasarán a una cola (spec 007).
import { db } from "@/db/client";
import { getPatreonClient } from "@/server/patreon/make-client";
import { purgeExpiredAccounts } from "@/server/services/account";
import { reconcileAll } from "@/server/services/membership";

const HOUR = 60 * 60 * 1000;
const g = globalThis as { __wbScheduler?: boolean };

async function safely(name: string, fn: () => Promise<unknown>) {
  try {
    console.info(`[scheduler] ${name}:`, await fn());
  } catch (e) {
    console.warn(`[scheduler] ${name} falló:`, (e as Error).message);
  }
}

/** RF-17 cada 6 horas y RF-24 cada día; la primera vez, un minuto después de arrancar. */
export function startSchedulerIfEnabled() {
  if (g.__wbScheduler || process.env.PATREON_RECONCILE !== "1") return;
  g.__wbScheduler = true;
  const reconcile = () =>
    safely("revisión de Patreon", async () => {
      const { client } = getPatreonClient();
      return client ? reconcileAll(db, client) : "sin cliente de Patreon";
    });
  const purge = () => safely("borrado de cuentas vencidas", () => purgeExpiredAccounts(db));
  setTimeout(() => void reconcile(), 60_000);
  setTimeout(() => void purge(), 90_000);
  setInterval(() => void reconcile(), 6 * HOUR).unref();
  setInterval(() => void purge(), 24 * HOUR).unref();
}
