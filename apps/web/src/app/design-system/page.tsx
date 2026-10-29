import { notFound } from "next/navigation";
import { Catalog } from "./Catalog";

export const metadata = { title: "Design system" };

/**
 * Spec 011, RF-15: catálogo vivo del sistema de diseño. Herramienta de desarrollo (en inglés, sin diccionario):
 * en producción no existe. Solo importa de `@/ui`, para poder pasarlo a Storybook sin cambios.
 */
export default function SistemaPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Catalog />;
}
