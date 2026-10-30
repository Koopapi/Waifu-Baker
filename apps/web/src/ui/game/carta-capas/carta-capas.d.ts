// Tipos de carta-capas.js v4 (paquete de diseño Street pop, docs/waifu-baker/codigo/carta-capas). El script es
// de terceros y se copia tal cual; si se actualiza, se revisan estos tipos con su LEEME.

export type CartaTier = "n" | "r" | "sr" | "ssr" | "ur" | "ex";
/** v4: brillo que se pinta solo sobre el dibujo de una capa de imagen. */
export type TipoBrillo = "holo" | "destello" | "oro" | "plata";
export interface Brillo {
  tipo: TipoBrillo;
  /** 0 a 1 (0,7 por defecto). */
  intensidad?: number;
}
export type Esquina = "sup-izq" | "sup-der" | "inf-izq" | "inf-der";

/** Waifu Baker, spec 017: posición (x, y en %), escala, giro y ajuste de una capa de imagen. */
export interface Encuadre {
  x?: number;
  y?: number;
  escala?: number;
  giro?: number;
  ajuste?: "cubrir" | "contener";
}

export interface CapaImagen {
  src: string;
  encuadre?: Encuadre;
  profundidad?: number;
  margen?: number;
  mezcla?: string;
  opacidad?: number;
  visible?: boolean;
  brillo?: Brillo;
}

export interface CapaParticulas {
  particulas: string;
  cantidad?: number;
  tamano?: number;
  velocidad?: number;
  color?: string;
  semilla?: number;
  profundidad?: number;
  margen?: number;
  mezcla?: string;
  opacidad?: number;
  visible?: boolean;
}

export type Sello = { src: string; esquina?: Esquina; tamano?: number; recorte?: [number, number, number, number]; relacion?: number } | { texto: string; estilo?: string; esquina?: Esquina; tamano?: number };

export interface CartaConfig {
  capas?: (CapaImagen | CapaParticulas)[];
  /** `'ninguno'` cuando la imagen ya trae su marco (las cartas compuestas con el marco de Pencil). */
  marco?: CartaTier | "ninguno" | "personalizado" | string;
  /** Waifu Baker, spec 025: los dos colores (#rrggbb) del marco personalizado. */
  marcoColores?: { color: string; brillo: string };
  borde?: number;
  aura?: string | null;
  sello?: Sello | null;
  holo?: boolean;
  /** v4: 0 a 1 (0,4 por defecto). */
  holoIntensidad?: number;
  proporcion?: number;
  profundidad?: number;
  inclinacion?: number;
  reposo?: boolean;
  zona?: HTMLElement | null;
  etiqueta?: string;
  estatica?: boolean;
  aparecer?: boolean;
}

export interface CartaInstancia {
  elemento: HTMLElement;
  readonly listo: Promise<void>;
  set(cambios: Partial<CartaConfig>): void;
  ocultarSello(): void;
  entrar(): void;
  habilitarGiroscopio(): Promise<boolean>;
  /** Waifu Baker, spec 018: deja de seguir la inclinación del teléfono. */
  deshabilitarGiroscopio(): void;
  destruir(): void;
}

export interface CartaCapasApi {
  /** Listas cerradas para lo que acaba dentro de `style` o de atributos (la config puede venir de la BD). */
  seguro: { mezcla(m: unknown): string; esquina(e: unknown): string; color(c: unknown): string | null; encuadre(e: unknown): string; url(u: unknown): string | null };
  montar(el: HTMLElement, config: CartaConfig): CartaInstancia;
  montarRareza(el: HTMLElement, rareza: CartaTier, imagen: string | (CapaImagen | CapaParticulas)[], extra?: Partial<CartaConfig>): CartaInstancia;
  desdeRareza(rareza: CartaTier, imagen: string | (CapaImagen | CapaParticulas)[], extra?: Partial<CartaConfig>): CartaConfig;
  /** Marcos de cada escalón: degradado, aura y grosor. */
  marcos: Record<string, [string, string, number?]>;
  /** v4: nombres de los brillos por capa. */
  brillos: Record<TipoBrillo, string>;
  /** Spec 025: degradado y aura del marco personalizado, o null si los colores no son válidos. */
  marcoPersonalizado(c: { color?: string; brillo?: string } | null | undefined): [string, string] | null;
  version: number;
}

declare const api: CartaCapasApi;
export default api;
