import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const src = (f: string) => readFileSync(path.resolve(__dirname, "..", f), "utf8");

describe("spec 013 — Sentry fuera de la primera carga", () => {
  it("test_s013_rf11_el_navegador_no_importa_sentry_de_forma_estatica", () => {
    // Con un import estático, el SDK (decenas de kB) entra en la base de todas las páginas.
    for (const f of ["instrumentation-client.ts", "app/error.tsx", "lib/sentry-client.ts"])
      expect(src(f), f).not.toMatch(/^import[^;]*["']@sentry\/nextjs["']/m);
    expect(src("lib/sentry-client.ts")).toMatch(/import\("@sentry\/nextjs"\)/);
  });

  it("test_s013_rf11_sin_dsn_no_se_carga_el_sdk", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    vi.resetModules();
    const { loadSentry, captureClientError } = await import("./sentry-client");
    expect(loadSentry()).toBeNull();
    expect(() => captureClientError(new Error("x"))).not.toThrow();
    vi.unstubAllEnvs();
  });
});
