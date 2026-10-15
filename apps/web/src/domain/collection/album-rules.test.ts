import { describe, expect, it } from "vitest";
import { MAX_FEATURED, validateAlias, validateFeatured } from "./album-rules";

describe("RF-9 alias", () => {
  it("test_s006_rf9_recorta y acepta de 2 a 30 caracteres", () => {
    expect(validateAlias("  Koopa  ")).toEqual({ ok: true, value: "Koopa" });
    expect(validateAlias("a").ok).toBe(false);
    expect(validateAlias("   ").ok).toBe(false);
    expect(validateAlias("x".repeat(31)).ok).toBe(false);
    expect(validateAlias("x".repeat(30)).ok).toBe(true);
  });
});

describe("RF-12 destacadas", () => {
  const allowed = new Set(["a", "b", "c", "d", "e", "f"]);
  it("test_s006_rf12_hasta 5, propias y SFW, sin repetir, en el orden elegido", () => {
    expect(validateFeatured(["c", "a"], allowed)).toEqual({ ok: true, value: ["c", "a"] });
    expect(validateFeatured(["a", "b", "c", "d", "e", "f"], allowed).ok).toBe(false);
    expect(validateFeatured(["a", "a"], allowed).ok).toBe(false);
    expect(validateFeatured(["a", "zzz"], allowed).ok).toBe(false);
    expect(MAX_FEATURED).toBe(5);
  });
});
