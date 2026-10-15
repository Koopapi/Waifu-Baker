import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("quita acentos, espacios y símbolos", () => {
    expect(slugify("  Áiko  Ñandú! 2 ")).toBe("aiko-nandu-2");
    expect(slugify("---")).toBe("");
  });
});
