import { afterEach, describe, expect, it } from "vitest";
import { legalContact } from "./legal-contact";

describe("spec 007 — contacto de las páginas legales", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("test_s007_rf7_correo_configurado_o_si_falta_la_pagina_de_patreon", () => {
    process.env.CONTACT_EMAIL = "hola@waifubaker.example";
    expect(legalContact()).toEqual({ kind: "email", value: "hola@waifubaker.example", href: "mailto:hola@waifubaker.example" });
    process.env.CONTACT_EMAIL = "";
    delete process.env.PATREON_PAGE_URL;
    expect(legalContact()).toEqual({ kind: "patreon", value: "https://www.patreon.com/WaifuBaker", href: "https://www.patreon.com/WaifuBaker" });
  });
});
