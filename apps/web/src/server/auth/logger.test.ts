import { describe, expect, it, vi } from "vitest";
import { authLogger } from "./logger";

describe("registro de Auth.js", () => {
  it("una cookie de sesión que no se puede leer es un aviso, no un error", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    authLogger.error(Object.assign(new Error("no se pudo descifrar"), { type: "JWTSessionError" }));
    expect(error).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledOnce();
    authLogger.error(Object.assign(new Error("otro"), { type: "OAuthCallbackError" }));
    expect(error).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });
});
