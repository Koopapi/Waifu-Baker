/**
 * Tipos de sobre-capas.js v1 (Waifu Baker).
 * El archivo JS define `window.SobreCapas` y, en entornos CommonJS, `module.exports`.
 * Necesita carta-capas.js v7 o posterior cargado antes (usa `CartaCapas.motor`).
 */
import type CartaCapas from './carta-capas';

declare namespace SobreCapas {
  /** 3D: plástico con brillos, arrugas y silueta de almohada. Plano: sobre recortado con dientes, sin plástico. */
  type Vista = '3d' | 'plano';
  /** rasgar: se desliza por la línea punteada y la tira sale volando. sticker: la tira de arriba se despega doblándose. */
  type Apertura = 'rasgar' | 'sticker';
  type Estado = 'cerrado' | 'abriendo' | 'abierto';

  interface Sellos {
    /** Color del sello de arriba (cualquier color CSS). Por defecto '#FF3EA5'. */
    arriba?: string;
    /** Color del sello de abajo. Por defecto '#C6F432'. */
    abajo?: string;
    /** Imagen con transparencia: dentro de lo opaco va un arcoíris que se mueve al revés que el metal. null = sin patrón. */
    patron?: string | null;
    /** Tamaño del patrón en % del ancho (se repite). Por defecto 40. */
    patronTamano?: number;
  }

  /** El registro del sobre, tal como lo exporta creador-sobres.html. */
  interface Registro {
    id?: string;
    /** Texto grande de la banda, p. ej. 'FAN ART · VOL. 1'. Si pasa de 17 letras se achica solo. */
    nombre?: string;
    /** Código del set, p. ej. 'FA01'. */
    codigo?: string;
    /** Cartas por sobre (solo se muestra en la banda). */
    cartas?: number;
    vista?: Vista;
    apertura?: Apertura;
    /** Las mismas capas que una carta (imagen o partículas, con brillo, mezcla, profundidad…), sobre un lienzo de 1000 × 1750 px. */
    capas?: CartaCapas.Capa[];
    sellos?: Sellos;
    /** true = logo de texto «WAIFU BAKER»; { src } = imagen; false = sin logo. */
    logo?: boolean | { src: string };
    /** Etiqueta inclinada bajo el logo, p. ej. { texto: 'Edición especial' }. */
    insignia?: { texto: string; color?: string } | null;
    /** Holo de carta encima de todo el sobre. */
    holo?: boolean;
    holoIntensidad?: number;
    /** Foil arriba y abajo. Por defecto true; intensidad 0.6 (se pinta al 70 % de ese valor). */
    foil?: boolean;
    foilIntensidad?: number;
    /** Multiplica la opacidad de los brillos y sombras del plástico (0 a 1.5). Solo en 3D. */
    plastico?: number;
  }

  interface Opciones extends Registro {
    /** Cuánto se inclina con el puntero (0 a 2). Por defecto 1. */
    inclinacion?: number;
    /** Se balancea solo cuando nadie lo toca. Por defecto true. */
    reposo?: boolean;
    /** Flota arriba y abajo. Por defecto true. */
    flotar?: boolean;
    /** Sonidos generados con Web Audio (sin archivos). Por defecto true. */
    sonido?: boolean;
    /** Elemento que escucha el puntero para inclinar. Por defecto el padre del sobre. */
    zona?: HTMLElement | null;
    /** Texto accesible; por defecto «Sobre <nombre> <código>». */
    etiqueta?: string | null;
    /** Se llama en el momento en que el sobre se abre (arrastrando, con Enter o con abrir()). Aquí se sacan las cartas. */
    alAbrir?: ((sobre: Instancia) => void) | null;
    /** Se llama cuando el jugador toca sin deslizar: buen momento para sacudir la indicación. */
    alPista?: ((sobre: Instancia) => void) | null;
  }

  interface Instancia {
    /** El elemento con foco y rol de botón. */
    readonly elemento: HTMLElement;
    readonly estado: Estado;
    /** «Desliza el dedo por la línea» o «Despega el sticker de arriba →», según la apertura. */
    readonly textoIndicacion: string;
    /** Las opciones vivas: se pueden cambiar `inclinacion`, `reposo` y `sonido` directamente. */
    readonly opciones: Opciones;
    /** Abre con animación, como si el jugador deslizara solo. */
    abrir(): void;
    /** Vuelve a cerrarlo (y a mostrarlo si se ocultó). */
    reiniciar(): void;
    /** Lo baja y lo desvanece (después de sacar las cartas). Se resuelve al terminar. */
    ocultar(): Promise<void>;
    /** Cambia opciones y lo vuelve a dibujar; si estaba abierto, lo cierra. */
    set(cambios: Partial<Opciones>): void;
    /** Muestra u oculta las guías del lienzo (sellos, línea de rasgado, logo, banda, márgenes). */
    guias(mostrar: boolean): void;
    destruir(): void;
  }

  interface API {
    montar(el: HTMLElement, opciones?: Opciones): Instancia;
    /** Imágenes del plástico 3D. Cámbialas una vez si las sirves desde otra ruta. */
    recursos: { brillo: string; sombra: string; silueta: string };
    aperturas: Record<Apertura, string>;
    /** Zonas del lienzo en px (1000 × 1750). */
    zonas: {
      lienzo: [number, number]; selloArriba: [number, number]; selloAbajo: [number, number];
      corte: number; logo: [number, number]; set: [number, number]; margen: number;
    };
    version: 1;
  }
}

declare const SobreCapas: SobreCapas.API;
export = SobreCapas;
export as namespace SobreCapas;

declare global {
  interface Window { SobreCapas: SobreCapas.API }
}
