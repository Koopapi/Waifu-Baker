import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // `server-only` corta la compilación de Next si un módulo de servidor llega al navegador; en los tests no aplica.
  resolve: { alias: { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "tests/server-only.ts") } },
  // tsconfig deja el JSX sin transformar (lo hace Next); los tests de componentes (spec 011) lo necesitan.
  oxc: { jsx: { runtime: "automatic" } },
  // Los componentes importan su CSS; en los tests no hace falta Tailwind (sin esto, se carga postcss.config.mjs).
  css: { postcss: { plugins: [] } },
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
          setupFiles: ["tests/integration/setup.ts"],
          // Procesan imágenes reales con sharp: la primera composición carga fuente y marcos (~1,5 s).
          testTimeout: 20000,
          fileParallelism: false,
        },
      },
    ],
  },
});
