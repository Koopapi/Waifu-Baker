import { describe, expect, it } from "vitest";
import { signPatreonBody, verifyPatreonSignature } from "./webhook-signature";

describe("spec 001 — firma de los avisos de Patreon", () => {
  it("test_s001_rf16_acepta_la_firma_correcta_y_rechaza_cualquier_otra", () => {
    const body = JSON.stringify({ data: { id: "m1" } });
    const sig = signPatreonBody(body, "secreto");
    expect(sig).toMatch(/^[0-9a-f]{32}$/);
    expect(verifyPatreonSignature(body, sig, "secreto")).toBe(true);
    expect(verifyPatreonSignature(body, sig.toUpperCase(), "secreto")).toBe(true);
    expect(verifyPatreonSignature(body + " ", sig, "secreto")).toBe(false);
    expect(verifyPatreonSignature(body, sig, "otro")).toBe(false);
    expect(verifyPatreonSignature(body, null, "secreto")).toBe(false);
    expect(verifyPatreonSignature(body, "zz", "secreto")).toBe(false);
    expect(verifyPatreonSignature(body, sig, undefined)).toBe(false);
  });
});
