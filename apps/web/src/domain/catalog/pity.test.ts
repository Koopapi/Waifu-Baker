import { describe, expect, it } from "vitest";
import { isEpicPlus, nextPityCounter, pityActive } from "./pity";

describe("RF-13 y RF-14 protección de mala suerte", () => {
  it("test_s004_rf13_actúa cuando el contador llega a N−1", () => {
    expect(pityActive(8, 10)).toBe(false);
    expect(pityActive(9, 10)).toBe(true);
    expect(pityActive(15, 10)).toBe(true);
  });

  it("test_s004_rf13_con N=0 nunca actúa y con N=1 actúa siempre", () => {
    expect(pityActive(500, 0)).toBe(false);
    expect(pityActive(0, 1)).toBe(true);
  });

  it("test_s004_rf14_el contador se reinicia con épica o superior y si no, sube uno", () => {
    expect(nextPityCounter(7, true)).toBe(0);
    expect(nextPityCounter(7, false)).toBe(8);
  });

  it("épica, legendaria y secreta cuentan como épica o superior", () => {
    expect(["common", "uncommon", "rare", "epic", "legendary", "secret"].map((r) => isEpicPlus(r as never))).toEqual([false, false, false, true, true, true]);
  });
});
