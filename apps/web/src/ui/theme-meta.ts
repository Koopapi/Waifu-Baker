// Spec 026: color de la barra del sistema y esquema de los controles nativos de cada tema.
import type { Theme } from "@/domain/ui/theme";

export const THEME_META: Record<Theme, { themeColor: string; colorScheme: "dark" | "light" }> = {
  kawaii: { themeColor: "#241b29", colorScheme: "dark" },
  street: { themeColor: "#ECE4FA", colorScheme: "light" },
};
