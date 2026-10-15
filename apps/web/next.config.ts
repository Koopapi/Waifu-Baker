import type { NextConfig } from "next";

// Cabeceras básicas de docs/architecture.md (sección Seguridad). HSTS y CSP con nonce van con el
// despliegue (spec 007). El giroscopio se permite al propio sitio para el holo de las cartas.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "gyroscope=(self), accelerometer=(self), camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // El E2E levanta su propio servidor con otra carpeta de compilación para no chocar con `pnpm dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
