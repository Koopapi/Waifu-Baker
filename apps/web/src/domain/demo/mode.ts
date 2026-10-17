// Spec 010, RF-13 a RF-15: la demo local (portada con papeles, franja y entrada sin Patreon).

export interface DemoEnv {
  DEMO_MODE?: string;
  DEMO_LOCAL?: string;
  SITE_URL?: string;
  NODE_ENV?: string;
}

/**
 * Spec 014, RF-23: el build optimizado de `pnpm demo` en el Mac. Exige el permiso `DEMO_LOCAL=1` (solo lo pone
 * scripts/demo.mts) y que no haya `SITE_URL`, que la web publicada siempre tiene.
 */
export function isLocalDemoBuild(env: DemoEnv): boolean {
  return env.DEMO_MODE === "1" && env.DEMO_LOCAL === "1" && !env.SITE_URL;
}

/** Solo con `DEMO_MODE=1`; en producción, solo en el build local de la demo (spec 010, RF-15; spec 014, RF-23). */
export function isDemoEnabled(env: DemoEnv): boolean {
  return env.DEMO_MODE === "1" && (env.NODE_ENV !== "production" || isLocalDemoBuild(env));
}

/** Usuarios de la demo: entran con el login de desarrollo. */
export const DEMO_USERS = {
  collector: { name: "demo-collector", displayName: "Demo Collector" },
  admin: { name: "demo-admin", displayName: "Demo Admin" },
} as const;
export type DemoRole = keyof typeof DEMO_USERS;
