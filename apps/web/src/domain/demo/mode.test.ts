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
