// Tipos de carta-capas.js v3 (paquete de diseño Street pop, docs/waifu-baker/codigo/carta-capas). El script es
// de terceros y se copia tal cual; si se actualiza, se revisan estos tipos con su LEEME.

export type CartaTier = "n" | "r" | "sr" | "ssr" | "ur";
export type Esquina = "sup-izq" | "sup-der" | "inf-izq" | "inf-der";

export interface CapaImagen {
  src: string;
  profundidad?: number;
  margen?: number;
  mezcla?: string;
  opacidad?: number;
  visible?: boolean;
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
  marco?: CartaTier | "ninguno" | string;
  borde?: number;
  aura?: string | null;
  sello?: Sello | null;
  holo?: boolean;
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
  destruir(): void;
}

export interface CartaCapasApi {
  /** Listas cerradas para lo que acaba dentro de `style` o de atributos (la config puede venir de la BD). */
  seguro: { mezcla(m: unknown): string; esquina(e: unknown): string; color(c: unknown): string | null };
  montar(el: HTMLElement, config: CartaConfig): CartaInstancia;
  montarRareza(el: HTMLElement, rareza: CartaTier, imagen: string | (CapaImagen | CapaParticulas)[], extra?: Partial<CartaConfig>): CartaInstancia;
  desdeRareza(rareza: CartaTier, imagen: string | (CapaImagen | CapaParticulas)[], extra?: Partial<CartaConfig>): CartaConfig;
  version: number;
}

declare const api: CartaCapasApi;
export default api;
