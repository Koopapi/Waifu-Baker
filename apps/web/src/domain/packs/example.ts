// Spec 030: el sobre de ejemplo FA01 del paquete de diseño (decisión 7: sus recursos se usan desde ya), adaptado al
// formato guardado: las capas son sus archivos (en `apps/web/assets/sobres/ejemplo/`) con los ajustes de su registro.
import type { PackDesign } from "./design";

export const PACK_EXAMPLE_FILES = ["sobre_fa01_fondo.webp", "sobre_fa01_personaje.webp", "sobre_fa01_efecto.webp", "carta-muestra.webp"] as const;
export const PACK_SAMPLE_CARD = "carta-muestra.webp";

/** El registro `fa01.json` del paquete de diseño, con un nombre de archivo en lugar de cada imagen (`ref` lo convierte). */
export function exampleDesign(ref: (file: string) => string): PackDesign {
  return {
    vista: "3d",
    apertura: "rasgar",
    capas: [
      { key: ref("sobre_fa01_fondo.webp"), nombre: "sobre_fa01_fondo.webp", profundidad: 0.25, margen: 3 },
      { particulas: "destellos-arcoiris", cantidad: 18, tamano: 0.9, velocidad: 1, semilla: 41, profundidad: 0.6, margen: 4 },
      { key: ref("sobre_fa01_personaje.webp"), nombre: "sobre_fa01_personaje.webp", profundidad: 1, margen: 2 },
      { key: ref("sobre_fa01_efecto.webp"), nombre: "sobre_fa01_efecto.webp", profundidad: 1.3, margen: 3, mezcla: "overlay" },
    ],
    sellos: { arriba: "#FF3EA5", abajo: "#C6F432", patron: null, patronTamano: 40 },
    logo: true,
    insignia: null,
    holo: false,
    holoIntensidad: 0.4,
    foil: true,
    foilIntensidad: 0.6,
    plastico: 1,
  };
}
