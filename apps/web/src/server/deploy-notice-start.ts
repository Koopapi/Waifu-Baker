// Spec 035, RF-1 y RF-2: al arrancar una versión nueva, espera a que su comprobación de salud responda bien y avisa al
// grupo del equipo. Nada de esto puede tumbar el arranque (RF-10).
import { db } from "@/db/client";
import { getTelegram } from "@/server/adapters/telegram";
import { githubCompare } from "@/server/adapters/github";
import { notifyDeploy } from "@/server/services/deploy-notice";

const EVERY = 5_000;
const GIVE_UP = 2 * 60_000;
const g = globalThis as { __wbDeployNotice?: boolean };

async function healthy(port: string) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(4_000) });
    return r.ok && Boolean(((await r.json()) as { ok?: boolean }).ok);
  } catch {
    return false;
  }
}

export function startDeployNotice(env: NodeJS.ProcessEnv = process.env) {
  if (g.__wbDeployNotice || env.DEPLOY_NOTICE !== "1" || env.NODE_ENV !== "production") return;
  g.__wbDeployNotice = true;
  const port = env.PORT ?? "3000";
  const started = Date.now();
  const tick = async () => {
    if (!(await healthy(port))) {
      if (Date.now() - started < GIVE_UP) setTimeout(tick, EVERY).unref?.();
      else console.warn("[aviso de despliegue] la salud no respondió en 2 minutos: no se avisa");
      return;
    }
    try {
      const r = await notifyDeploy({ db, telegram: getTelegram(), compare: githubCompare, commit: env.SOURCE_COMMIT?.trim() || undefined, siteUrl: env.SITE_URL ?? "" });
      console.info("[aviso de despliegue]", r);
    } catch (e) {
      console.warn("[aviso de despliegue] falló:", (e as Error).message);
    }
  };
  setTimeout(tick, EVERY).unref?.();
}
