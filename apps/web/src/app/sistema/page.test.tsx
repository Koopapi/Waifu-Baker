import { afterEach, describe, expect, it, vi } from "vitest";

describe("catálogo del sistema de diseño", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("test_s011_rf15_en_produccion_la_pagina_no_existe", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { default: Page } = await import("./page");
    expect(() => Page()).toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/);
  });
});
