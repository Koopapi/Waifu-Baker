// Tipos de sobre-capas.js v1 (paquete de Bruno, docs/waifu-baker/sobres) con las opciones que añade la spec 030.
// El script expone `window.SobreCapas` y `module.exports`; necesita `CartaCapas.motor` (carta-capas.js) cargado antes.
import type { CapaImagen, CapaParticulas } from "../carta-capas/carta-capas";

export type SobreVista = "3d" | "plano";
export type SobreApertura = "rasgar" | "sticker";
export type SobreEstado = "cerrado" | "abriendo" | "abierto";

export interface SobreSellos {
  arriba?: string;
  abajo?: string;
  /** Imagen con transparencia (patrón holo); `null` = sin patrón. */
  patron?: string | null;
  /** % del ancho del sobre (40 por defecto). */
  patronTamano?: number;
}

/** El registro del sobre, en el formato del creador de Bruno (las imágenes ya son URL). */
export interface SobreRegistro {
  id?: string;
  nombre?: string;
  codigo?: string;
  cartas?: number;
  vista?: SobreVista;
  apertura?: SobreApertura;
  capas?: (CapaImagen | CapaParticulas)[];
  sellos?: SobreSellos;
  logo?: boolean | { src: string };
  insignia?: { texto: string; color?: string } | null;
  holo?: boolean;
  holoIntensidad?: number;
  foil?: boolean;
  foilIntensidad?: number;
  plastico?: number;
}

/** Spec 030: los textos del sobre (de los diccionarios del juego). */
export interface SobreTextos {
  rasgar?: { indicacion?: string; aria?: string };
  sticker?: { indicacion?: string; aria?: string };
  sobre?: string;
  carta?: string;
  cartas?: string;
  guiaSello?: string;
  guiaCorte?: string;
  guiaLogo?: string;
  guiaSet?: string;
}

export interface SobreOpciones extends SobreRegistro {
  inclinacion?: number;
  reposo?: boolean;
  flotar?: boolean;
  sonido?: boolean;
  zona?: HTMLElement | null;
  etiqueta?: string | null;
  alAbrir?: ((sobre: SobreInstancia) => void) | null;
  alPista?: ((sobre: SobreInstancia) => void) | null;
  /** Spec 030: vista fija (sin bucle de animación ni escuchas). */
  estatica?: boolean;
  /** Spec 030: `false` = no se abre con el dedo (solo teclado o `abrir()`). */
  gestos?: boolean;
  /** Spec 030: la vibración la decide el juego. */
  alVibrar?: ((patron: number | number[]) => void) | null;
  /** Spec 030: aviso de cada sonido que hace el sobre (`rasgon`). */
  alSonido?: ((nombre: "rasgon") => void) | null;
  textos?: SobreTextos | null;
}

export interface SobreInstancia {
  readonly elemento: HTMLElement;
  readonly estado: SobreEstado;
  readonly textoIndicacion: string;
  readonly opciones: SobreOpciones;
  abrir(): void;
  reiniciar(): void;
  ocultar(): Promise<void>;
  set(cambios: Partial<SobreOpciones>): void;
  guias(mostrar: boolean): void;
  destruir(): void;
}

export interface SobreCapasApi {
  montar(el: HTMLElement, opciones?: SobreOpciones): SobreInstancia;
  recursos: { brillo: string; sombra: string; silueta: string };
  aperturas: Record<SobreApertura, string>;
  zonas: {
    lienzo: [number, number];
    selloArriba: [number, number];
    selloAbajo: [number, number];
    corte: number;
    logo: [number, number];
    set: [number, number];
    margen: number;
  };
  version: number;
}

declare const api: SobreCapasApi;
export default api;
