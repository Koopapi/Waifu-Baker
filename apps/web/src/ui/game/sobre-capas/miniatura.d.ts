// Tipos de miniatura.js (spec 030: la receta de la miniatura del creador de sobres del paquete de diseño).
import type { SobreRegistro } from "./sobre-capas";

export const MINIATURA: { width: 500; height: 875 };
export interface MiniaturaTextos {
  carta: string;
  cartas: string;
}
/** Dibuja la miniatura del sobre cerrado (PNG de 500 × 875); `null` si no se pudo. */
export function dibujarMiniatura(registro: SobreRegistro, textos?: MiniaturaTextos): Promise<Blob | null>;
