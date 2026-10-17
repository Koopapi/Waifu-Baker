import { readFileSync } from "node:fs";
import path from "node:path";
import { isDevLoginEnabled } from "../auth/access";
import { describe, expect, it } from "vitest";
import { isDemoEnabled } from "./mode";

describe("modo demo", () => {
  it("test_s010_rf13_solo_con_DEMO_MODE_1", () => {
    expect(isDemoEnabled({ DEMO_MODE: "1", NODE_ENV: "development" })).toBe(true);
    expect(isDemoEnabled({ NODE_ENV: "development" })).toBe(false);
    expect(isDemoEnabled({ DEMO_MODE: "true", NODE_ENV: "development" })).toBe(false);
  });

  it("test_s010_rf15_nunca_en_produccion", () => {
    expect(isDemoEnabled({ DEMO_MODE: "1", NODE_ENV: "production" })).toBe(false);
  });
});

describe("spec 014 — demo optimizada en local", () => {
  const prod = { NODE_ENV: "production" as const };
  it("test_s014_rf23_el_build_local_de_la_demo_funciona_en_produccion", () => {
    expect(isDemoEnabled({ ...prod, DEMO_MODE: "1", DEMO_LOCAL: "1" })).toBe(true);
    expect(isDevLoginEnabled({ ...prod, DEV_LOGIN: "1", DEMO_MODE: "1", DEMO_LOCAL: "1" })).toBe(true);
  });

  it("test_s014_rf23_la_web_publicada_nunca_activa_la_demo", () => {
    // Sin el permiso local, o con la URL pública del sitio, la demo y la entrada sin Patreon no existen.
    expect(isDemoEnabled({ ...prod, DEMO_MODE: "1" })).toBe(false);
    expect(isDemoEnabled({ ...prod, DEMO_MODE: "1", DEMO_LOCAL: "1", SITE_URL: "https://waifubaker.example" })).toBe(false);
    expect(isDevLoginEnabled({ ...prod, DEV_LOGIN: "1" })).toBe(false);
    expect(isDevLoginEnabled({ ...prod, DEV_LOGIN: "1", DEMO_MODE: "1", DEMO_LOCAL: "1", SITE_URL: "https://waifubaker.example" })).toBe(false);
    const example = readFileSync(path.resolve(__dirname, "../../../.env.example"), "utf8");
    expect(example).not.toMatch(/^\s*(DEMO_LOCAL|DEMO_MODE)=/m);
  });

  it("test_s014_rf23_pnpm_demo_arranca_la_version_optimizada", () => {
    const script = readFileSync(path.resolve(__dirname, "../../../scripts/demo.mts"), "utf8");
    expect(script).toMatch(/"next", "build"/);
    expect(script).toMatch(/"next", "start"/);
    expect(script).toContain('DEMO_LOCAL: "1"');
    expect(script).toContain("--dev");
  });
});
