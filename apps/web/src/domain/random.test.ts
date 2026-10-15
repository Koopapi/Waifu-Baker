import { describe, expect, it } from "vitest";
import { hmacRng } from "./random";

describe("RF-9 generador reproducible", () => {
  it("test_s004_rf9_la misma semilla da la misma secuencia y otra semilla, otra", () => {
    const seed = Buffer.alloc(32, 7);
    const a = hmacRng(seed);
    const b = hmacRng(seed);
    const c = hmacRng(Buffer.alloc(32, 8));
    const sa = Array.from({ length: 20 }, () => a.next());
    expect(Array.from({ length: 20 }, () => b.next())).toEqual(sa);
    expect(Array.from({ length: 20 }, () => c.next())).not.toEqual(sa);
    for (const v of sa) expect(v >= 0 && v < 1).toBe(true);
  });

  it("es uniforme en [0, 1) (media ≈ 0,5 en 20 000 valores)", () => {
    const r = hmacRng(Buffer.alloc(32, 1));
    let sum = 0;
    for (let i = 0; i < 20000; i++) sum += r.next();
    expect(Math.abs(sum / 20000 - 0.5)).toBeLessThan(0.01);
  });
});
