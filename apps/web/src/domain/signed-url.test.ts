import { describe, expect, it } from "vitest";
import { signImage, verifyImage } from "./signed-url";

const SECRET = "secreto-de-prueba";

describe("RF-20 enlaces firmados de imágenes", () => {
  const params = { cardId: "c1", size: "mid" as const, userId: "u1", expires: 1_000_000 };

  it("test_s004_rf20_un enlace válido se acepta antes de caducar", () => {
    const sig = signImage(params, SECRET);
    expect(verifyImage({ ...params, sig }, SECRET, 999_999)).toBe(true);
  });

  it("test_s004_rf20_caducado, de otro usuario o manipulado se rechaza", () => {
    const sig = signImage(params, SECRET);
    expect(verifyImage({ ...params, sig }, SECRET, 1_000_001)).toBe(false);
    expect(verifyImage({ ...params, userId: "u2", sig }, SECRET, 0)).toBe(false);
    expect(verifyImage({ ...params, cardId: "c2", sig }, SECRET, 0)).toBe(false);
    expect(verifyImage({ ...params, size: "full", sig }, SECRET, 0)).toBe(false);
    expect(verifyImage({ ...params, sig: sig.slice(0, -2) + "00" }, SECRET, 0)).toBe(false);
    expect(verifyImage({ ...params, sig }, "otro-secreto", 0)).toBe(false);
  });
});
