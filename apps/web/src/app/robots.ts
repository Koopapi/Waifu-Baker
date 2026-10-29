import type { MetadataRoute } from "next";

// Spec 024, RF-9: el servidor de pruebas (SITE_NOINDEX=1) no se deja indexar; producción, sí (salvo las zonas privadas).
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  if (process.env.SITE_NOINDEX === "1") return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/login", "/sobres", "/cuenta", "/recompensas", "/coleccion"] } };
}
