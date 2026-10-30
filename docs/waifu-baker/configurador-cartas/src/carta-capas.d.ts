/**
 * Tipos de carta-capas.js v4 (Waifu Baker).
 * El archivo JS define `window.CartaCapas` y, en entornos CommonJS, `module.exports`.
 */
declare namespace CartaCapas {
  /** Escalones visuales. 'ur' es sinónimo de 'ex'; 'comun', 'rara' y 'epica' son alias de 'n', 'r' y 'sr'. */
  type Rareza = 'n' | 'r' | 'sr' | 'ssr' | 'ex' | 'ur' | 'comun' | 'rara' | 'epica';

  /** Un escalón, 'ninguno' (sin marco) o cualquier gradiente CSS (marco personalizado). */
  type Marco = Rareza | 'ninguno' | (string & {});

  type Mezcla =
    | 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'hard-light'
    | 'color-dodge' | 'color-burn' | 'lighten' | 'darken' | 'difference' | 'exclusion'
    | 'hue' | 'saturation' | 'color' | 'luminosity';

  type TipoParticulas =
    | 'destellos-dorados' | 'destellos-arcoiris' | 'confeti' | 'burbujas' | 'bokeh'
    | 'corazones' | 'nieve' | 'chispas' | 'petalos';

  /** v4: efecto que se pinta solo sobre el dibujo de una capa de imagen. */
  type TipoBrillo = 'holo' | 'destello' | 'oro' | 'plata';

  type Esquina = 'sup-izq' | 'sup-der' | 'inf-izq' | 'inf-der';
  type EstiloSello = 'oro' | 'plata' | 'arcoiris' | 'rosa' | 'azul' | 'morado';

  interface CapaComun {
    /** Cuánto se mueve con la inclinación. 0 = fija, 1 = normal, hasta 2.5. */
    profundidad?: number;
    /** Porcentaje extra en cada lado para que no se vean bordes al moverse (0 a 15). */
    margen?: number;
    mezcla?: Mezcla;
    /** 0 a 1. */
    opacidad?: number;
    /** false = la capa no se dibuja. */
    visible?: boolean;
  }

  interface CapaImagen extends CapaComun {
    src: string;
    /** v4. */
    brillo?: { tipo: TipoBrillo; /** 0 a 1, 0.7 por defecto. */ intensidad?: number } | null;
  }

  interface CapaParticulas extends CapaComun {
    particulas: TipoParticulas;
    /** 0 a 200. */
    cantidad?: number;
    /** Multiplicador de tamaño (0.3 a 2.5). */
    tamano?: number;
    /** Multiplicador de velocidad (0.3 a 3). */
    velocidad?: number;
    /** Un solo color para todas las partículas (hex). */
    color?: string;
    /** Misma semilla = mismas posiciones. */
    semilla?: number;
  }

  type Capa = CapaImagen | CapaParticulas;

  interface SelloImagen {
    src: string;
    esquina?: Esquina;
    /** Ancho en % del ancho de la carta (10 a 60, 36 por defecto). */
    tamano?: number;
    /** Recorte [x, y, ancho, alto] en fracciones de 0 a 1, para sellos que vienen en un lienzo completo. */
    recorte?: [number, number, number, number];
    /** Ancho / alto del recorte en píxeles. */
    relacion?: number;
  }

  interface SelloTexto {
    texto: string;
    estilo?: EstiloSello;
    esquina?: Esquina;
    /** Tamaño de letra en % del ancho de la carta (8 a 26, 14 por defecto). */
    tamano?: number;
  }

  interface Opciones {
    /** Nombre accesible de la carta (aria-label). */
    etiqueta?: string;
    marco?: Marco;
    /** Color del resplandor alrededor de la carta; por defecto el del marco. */
    aura?: string | null;
    /** Grosor del marco en % del ancho (0.8 a 5, 2.2 por defecto). */
    borde?: number;
    /** Ancho / alto de la carta (0.7064 = 700 × 991). */
    proporcion?: number;
    /** De atrás hacia adelante. */
    capas?: Capa[];
    sello?: SelloImagen | SelloTexto | null;
    holo?: boolean;
    /** v4: 0 a 1, 0.4 por defecto. */
    holoIntensidad?: number;
    /** Profundidad del parallax en px (0 a 30, 14 por defecto). */
    profundidad?: number;
    /** Inclinación máxima en grados (0 a 26, 14 por defecto). */
    inclinacion?: number;
    /** true = se balancea sola cuando nadie la toca. */
    reposo?: boolean;
    /** Elemento donde se escucha el ratón; por defecto, el padre de la carta. */
    zona?: HTMLElement | null;
    /** true = aparece con un fundido cuando cargan las imágenes. */
    aparecer?: boolean;
    /** true = sin inclinación ni listeners y con menos partículas (rejillas). */
    estatica?: boolean;
  }

  interface Instancia {
    elemento: HTMLElement;
    /** Se cumple cuando cargaron todas las imágenes (o a los 4 s). */
    readonly listo: Promise<void>;
    /** Cambia cualquier opción en vivo. holo, holoIntensidad, profundidad, inclinacion y reposo no redibujan. */
    set(cambios: Partial<Opciones>): void;
    ocultarSello(): void;
    /** El sello aparece con rebote y pasa un destello por la carta. */
    entrar(): void;
    /** Llamar desde un toque del jugador: iOS pide permiso. */
    habilitarGiroscopio(): Promise<boolean>;
    destruir(): void;
  }

  interface Preset {
    marco: Rareza;
    particulas: Partial<CapaParticulas> | null;
    sello: SelloTexto | null;
    holo: boolean;
  }

  interface API {
    montar(el: HTMLElement, opciones: Opciones): Instancia;
    /** imagen: una ruta (carta de una sola imagen) o un arreglo de capas ya armadas. */
    montarRareza(el: HTMLElement, rareza: Rareza, imagen: string | Capa[], extra?: Partial<Opciones>): Instancia;
    desdeRareza(rareza: Rareza, imagen: string | Capa[], extra?: Partial<Opciones>): Opciones;
    presets: Record<string, Preset>;
    marcos: Record<string, [string, string]>;
    sellos: Record<EstiloSello, [string, string]>;
    particulas: Record<TipoParticulas, { nombre: string; formas: string[]; anim: string; cantidad: number; colores: string[]; brillo?: string }>;
    brillos: Record<TipoBrillo, string>;
    version: 4;
  }
}

declare const CartaCapas: CartaCapas.API;
export = CartaCapas;
export as namespace CartaCapas;

declare global {
  interface Window { CartaCapas: CartaCapas.API }
}
