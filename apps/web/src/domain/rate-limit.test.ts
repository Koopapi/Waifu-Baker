import { describe, expect, it } from "vitest";
import { SlidingWindowLimiter } from "./rate-limit";

describe("RF-21 límite de aperturas", () => {
  it("test_s004_rf21_permite 10 por minuto y rechaza la 11.ª hasta que pase la ventana", () => {
    let now = 0;
    const lim = new SlidingWindowLimiter(10, 60_000, () => now);
    for (let i = 0; i < 10; i++) expect(lim.take("u1")).toBe(true);
    expect(lim.take("u1")).toBe(false);
    expect(lim.take("u2")).toBe(true);
    now = 59_999;
    expect(lim.take("u1")).toBe(false);
    now = 60_001;
    expect(lim.take("u1")).toBe(true);
  });
});
