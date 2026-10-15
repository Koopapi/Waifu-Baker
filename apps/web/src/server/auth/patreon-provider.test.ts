import { describe, expect, it } from "vitest";
import { PATREON_IDENTITY_URL, patreonProfile, patreonProvider } from "./patreon-provider";

describe("login con Patreon", () => {
  it("pide la identidad a la API v2 con scope de membresías (la v1 responde 410)", () => {
    const p = patreonProvider() as unknown as { options: { userinfo: { url: string; params: Record<string, string> }; authorization: { params: { scope: string } } } };
    expect(p.options.userinfo.url).toBe(PATREON_IDENTITY_URL);
    expect(p.options.userinfo.url).toContain("/v2/");
    expect(p.options.userinfo.params["fields[user]"]).toBe("full_name,image_url");
    expect(p.options.authorization.params.scope).toBe("identity identity.memberships");
  });

  it("convierte la identidad v2 en un perfil sin email", () => {
    expect(patreonProfile({ data: { id: "123", attributes: { full_name: "Koopa", image_url: "https://x/y.png" } } })).toEqual({
      id: "123",
      name: "Koopa",
      email: null,
      image: "https://x/y.png",
    });
  });
});
