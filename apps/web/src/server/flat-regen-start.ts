// Spec 037, RF-17: la regeneración de imágenes fijas arranca con el servidor (no depende de SCHEDULER, para que también
// pase en local y en pruebas) y se repite cada 10 minutos por si entran cartas atrasadas. FLAT_REGEN=0 la apaga (tests).
import { db } from "@/db/client";
import { getCardStore } from "@/server/cards/store-instance";
import { regenerateOutdated } from "@/server/services/flat-regen";

const g = globalThis as { __wbFlatRegen?: boolean };
let running = false;

async function pass() {
  if (running) return;
  running = true;
  try {
    const r = await regenerateOutdated(db, getCardStore());
    if (r.done || r.failed) console.info(`[imágenes fijas] ${r.done} regeneradas, ${r.failed} con error`);
  } catch (e) {
    console.warn("[imágenes fijas] la regeneración falló:", (e as Error).message);
  } finally {
    running = false;
  }
}

export function startFlatRegen() {
  if (g.__wbFlatRegen || process.env.FLAT_REGEN === "0") return;
  g.__wbFlatRegen = true;
  setTimeout(() => void pass(), 20_000).unref();
  setInterval(() => void pass(), 10 * 60_000).unref();
}
