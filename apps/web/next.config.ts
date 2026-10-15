import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El E2E levanta su propio servidor con otra carpeta de compilación para no chocar con `pnpm dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
