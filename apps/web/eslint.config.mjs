import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".next-e2e/**",
      ".next-demo/**",
      ".next-build/**",
      ".next-demo-build/**",
      ".next-prod/**",
      "playwright-report/**",
      "test-results/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Script de terceros (paquete de diseño, carta por capas), copiado tal cual.
      "src/ui/game/carta-capas/carta-capas.js",
      // Spec 030: el sobre del paquete de diseño (sobre-capas.js), copiado con cambios pequeños marcados.
      "src/ui/game/sobre-capas/sobre-capas.js",
      "src/ui/game/sobre-capas/miniatura.js",
    ],
  },
];

export default eslintConfig;
