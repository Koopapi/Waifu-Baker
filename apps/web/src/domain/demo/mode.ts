// Spec 010, RF-13 a RF-15: la demo local (portada con papeles, franja y entrada sin Patreon).

/** Solo con `DEMO_MODE=1` y nunca en producción (RF-15). */
export function isDemoEnabled(env: { DEMO_MODE?: string; NODE_ENV?: string }): boolean {
  return env.DEMO_MODE === "1" && env.NODE_ENV !== "production";
}

/** Usuarios de la demo: entran con el login de desarrollo. */
export const DEMO_USERS = {
  collector: { name: "demo-collector", displayName: "Demo Collector" },
  admin: { name: "demo-admin", displayName: "Demo Admin" },
} as const;
export type DemoRole = keyof typeof DEMO_USERS;
