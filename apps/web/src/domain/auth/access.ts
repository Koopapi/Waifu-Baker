// RF-1: quién puede entrar al panel. Reglas puras; el entorno se pasa como argumento.

export type Role = "user" | "admin";

export function isDevLoginEnabled(env: { DEV_LOGIN?: string; NODE_ENV?: string }): boolean {
  return env.DEV_LOGIN === "1" && env.NODE_ENV !== "production";
}

export function parseAdminIds(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export function resolveRole(input: {
  patreonUserId: string;
  adminIds: Set<string>;
  devAdmin: boolean;
  devEnabled: boolean;
}): Role {
  if (input.adminIds.has(input.patreonUserId)) return "admin";
  if (input.devEnabled && input.devAdmin && input.patreonUserId.startsWith("dev:")) return "admin";
  return "user";
}
