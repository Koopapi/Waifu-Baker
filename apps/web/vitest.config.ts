import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  // tsconfig deja el JSX sin transformar (lo hace Next); los tests de componentes (spec 011) lo necesitan.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["src/**/*.test.{ts,tsx}"] },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["tests/integration/global-setup.ts"],
          // Procesan imágenes reales con sharp: la primera composición carga fuente y marcos (~1,5 s).
          testTimeout: 20000,
          fileParallelism: false,
        },
      },
    ],
  },
});
