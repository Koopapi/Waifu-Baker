/** Spec 007, RF-7: el correo de contacto configurado o, si falta, la página de Patreon. */
export function legalContact() {
  const email = process.env.CONTACT_EMAIL?.trim();
  if (email) return { kind: "email" as const, value: email, href: `mailto:${email}` };
  const url = process.env.PATREON_PAGE_URL?.trim() || "https://www.patreon.com/WaifuBaker";
  return { kind: "patreon" as const, value: url, href: url };
}
