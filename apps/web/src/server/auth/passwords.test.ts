import { describe, expect, it } from "vitest";
import { generatePassword, hashPassword, verifyPassword } from "./passwords";

describe("spec 024 — contraseñas", () => {
  it("test_s024_rf20_se_guardan_con_hash_y_sal_y_se_comprueban", async () => {
    const h = await hashPassword("una-contraseña-larga");
    expect(h).toMatch(/^scrypt\$/);
    expect(h).not.toContain("una-contraseña-larga");
    expect(await hashPassword("una-contraseña-larga")).not.toBe(h);
    expect(await verifyPassword("una-contraseña-larga", h)).toBe(true);
    expect(await verifyPassword("otra", h)).toBe(false);
    expect(generatePassword()).toMatch(/^[A-Za-z2-9]{20}$/);
  });
});
