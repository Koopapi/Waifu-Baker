import { describe, expect, it } from "vitest";
import { isDevLoginEnabled, parseAdminIds, resolveRole } from "./access";

describe("RF-1 acceso al panel", () => {
  it("test_rf1_login de desarrollo solo con DEV_LOGIN=1 fuera de producción", () => {
    expect(isDevLoginEnabled({ DEV_LOGIN: "1", NODE_ENV: "development" })).toBe(true);
    expect(isDevLoginEnabled({ DEV_LOGIN: "1", NODE_ENV: "test" })).toBe(true);
    expect(isDevLoginEnabled({ DEV_LOGIN: "1", NODE_ENV: "production" })).toBe(false);
    expect(isDevLoginEnabled({ DEV_LOGIN: "0", NODE_ENV: "development" })).toBe(false);
    expect(isDevLoginEnabled({ NODE_ENV: "development" })).toBe(false);
  });

  it("test_rf1_lista de administradores: separada por comas, sin espacios ni vacíos", () => {
    expect(parseAdminIds(" 123, 456 ,,")).toEqual(new Set(["123", "456"]));
    expect(parseAdminIds(undefined)).toEqual(new Set());
  });

  it("test_rf1_rol admin solo si el id de Patreon está en la lista", () => {
    const admins = new Set(["123"]);
    expect(resolveRole({ patreonUserId: "123", adminIds: admins, devAdmin: false, devEnabled: false })).toBe("admin");
    expect(resolveRole({ patreonUserId: "999", adminIds: admins, devAdmin: false, devEnabled: false })).toBe("user");
  });

  it("test_rf1_el admin de desarrollo solo cuenta si el login de desarrollo está activo", () => {
    const none = new Set<string>();
    expect(resolveRole({ patreonUserId: "dev:ana", adminIds: none, devAdmin: true, devEnabled: true })).toBe("admin");
    expect(resolveRole({ patreonUserId: "dev:ana", adminIds: none, devAdmin: true, devEnabled: false })).toBe("user");
  });
});
