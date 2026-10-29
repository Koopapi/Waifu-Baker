// Spec 001: tareas periódicas en el propio servidor (una sola instancia, local y beta). En el
// despliegue con varias instancias pasarán a una cola (spec 007).
import { db } from "@/db/client";
import { getPatreonClient } from "@/server/patreon/make-client";
import { purgeExpiredAccounts } from "@/server/services/account";
import { backupConfigFromEnv, runBackup } from "@/server/services/backups";
import { reconcileAll } from "@/server/services/membership";
import { purgeTempLayers } from "@/server/cards/layer-images";
import { getCardStore } from "@/server/cards/store-instance";

const HOUR = 60 * 60 * 1000;
const g = globalThis as { __wbScheduler?: boolean };

async function safely(name: string, fn: () => Promise<unknown>) {
  try {
    console.info(`[scheduler] ${name}:`, await fn());
  } catch (e) {
    console.warn(`[scheduler] ${name} falló:`, (e as Error).message);
  }
}

/**
 * Spec 001: revisión de Patreon cada 6 h y borrado de cuentas vencidas cada día. Spec 007: copia de
 * seguridad cada día. Spec 016: limpieza diaria de capas temporales. Se activa con SCHEDULER=1 (PATREON_RECONCILE=1 se sigue aceptando).
 */
export function startSchedulerIfEnabled() {
  if (g.__wbScheduler || (process.env.SCHEDULER !== "1" && process.env.PATREON_RECONCILE !== "1")) return;
  g.__wbScheduler = true;
  const reconcile = () =>
    safely("revisión de Patreon", async () => {
      const { client } = getPatreonClient();
      return client ? reconcileAll(db, client) : "sin cliente de Patreon";
    });
  const purge = () => safely("borrado de cuentas vencidas", () => purgeExpiredAccounts(db));
  setTimeout(() => void reconcile(), 60_000);
  setTimeout(() => void purge(), 90_000);
  const backup = () => safely("copia de seguridad", () => runBackup(db, backupConfigFromEnv()));
  setTimeout(() => void backup(), 120_000);
  setInterval(() => void backup(), 24 * HOUR).unref();
  setInterval(() => void reconcile(), 6 * HOUR).unref();
  setInterval(() => void purge(), 24 * HOUR).unref();
  // Spec 016: capas subidas al editor y nunca guardadas.
  const purgeLayers = () => safely("limpieza de capas temporales", () => purgeTempLayers(getCardStore(), new Date()));
  setTimeout(() => void purgeLayers(), 150_000);
  setInterval(() => void purgeLayers(), 24 * HOUR).unref();
}
