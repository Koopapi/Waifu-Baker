'use client';
/**
 * Envoltorio de React + TypeScript para sobre-capas.js v1 (Next.js App Router).
 *
 *   const sobre = useRef<SobreCapasHandle>(null);
 *   <SobreCapas ref={sobre} registro={registro} onAbrir={() => setFase('revelando')} style={{ width: 300 }} />
 *   sobre.current?.abrir();      // botón «Abrir sin deslizar»
 *   await sobre.current?.ocultar();
 *
 * - carta-capas.js, sobre-capas.js y sus .d.ts van junto a este archivo (ajusta las rutas si no).
 *   sobre-capas.js usa el motor de carta-capas.js, así que se cargan en ese orden.
 * - Solo se ejecuta en el navegador: los import son dinámicos dentro de un efecto.
 * - `registro` debe ser estable (importado de JSON, de la base de datos o con useMemo):
 *   si cambia de identidad, el sobre se vuelve a dibujar cerrado.
 * - Las imágenes del plástico se buscan en SobreCapas.recursos (por defecto img/plastico-*.webp,
 *   relativo a la página). En Next.js ponlas en /public y pasa `recursos` con rutas absolutas.
 * - El contenedor necesita un ancho (style o className); el alto sale de la proporción 1000 × 1750.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, type CSSProperties, type RefObject } from 'react';
import type SobreCapasLib from './sobre-capas';
import type CartaCapasLib from './carta-capas';

type Registro = SobreCapasLib.Registro;
type Instancia = SobreCapasLib.Instancia;

export interface SobreCapasProps {
  registro: Registro;
  /** Rutas del plástico 3D, p. ej. { brillo: '/sobres/plastico-brillo.webp', ... }. */
  recursos?: Partial<SobreCapasLib.API['recursos']>;
  /** Patrón de fábrica del brillo «ondas», si alguna capa lo usa. */
  texturaOndas?: string;
  inclinacion?: number;
  reposo?: boolean;
  sonido?: boolean;
  guias?: boolean;
  zona?: RefObject<HTMLElement | null>;
  onAbrir?: () => void;
  onPista?: () => void;
  className?: string;
  style?: CSSProperties;
}

export interface SobreCapasHandle {
  abrir(): void;
  reiniciar(): void;
  ocultar(): Promise<void>;
  readonly estado: SobreCapasLib.Estado | null;
  readonly textoIndicacion: string;
}

async function cargarLibrerias(): Promise<SobreCapasLib.API | null> {
  const carta = (await import('./carta-capas.js')) as unknown as { default?: CartaCapasLib.API };
  if (!window.CartaCapas && carta?.default?.montar) window.CartaCapas = carta.default;
  const sobre = (await import('./sobre-capas.js')) as unknown as { default?: SobreCapasLib.API };
  return sobre?.default?.montar ? sobre.default : window.SobreCapas ?? null;
}

const SobreCapas = forwardRef<SobreCapasHandle, SobreCapasProps>(function SobreCapas(
  { registro, recursos, texturaOndas, inclinacion = 1, reposo = true, sonido = true, guias = false, zona, onAbrir, onPista, className, style },
  ref
) {
  const caja = useRef<HTMLDivElement>(null);
  const inst = useRef<Instancia | null>(null);
  const alAbrir = useRef(onAbrir);
  const alPista = useRef(onPista);
  alAbrir.current = onAbrir;
  alPista.current = onPista;

  useEffect(() => {
    let vivo = true;
    cargarLibrerias().then((lib) => {
      if (!vivo || !caja.current || !lib) return;
      if (recursos) Object.assign(lib.recursos, recursos);
      if (texturaOndas && window.CartaCapas) window.CartaCapas.texturas.ondas = texturaOndas;
      inst.current = lib.montar(caja.current, {
        ...registro,
        inclinacion,
        reposo,
        sonido,
        zona: zona?.current ?? null,
        alAbrir: () => alAbrir.current?.(),
        alPista: () => alPista.current?.(),
      });
      inst.current.guias(guias);
    });
    return () => {
      vivo = false;
      inst.current?.destruir();
      inst.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registro]);

  useEffect(() => {
    const op = inst.current?.opciones;
    if (op) { op.inclinacion = inclinacion; op.reposo = reposo; op.sonido = sonido; }
  }, [inclinacion, reposo, sonido]);

  useEffect(() => { inst.current?.guias(guias); }, [guias]);

  useImperativeHandle(ref, () => ({
    abrir: () => inst.current?.abrir(),
    reiniciar: () => inst.current?.reiniciar(),
    ocultar: () => inst.current?.ocultar() ?? Promise.resolve(),
    get estado() { return inst.current?.estado ?? null; },
    get textoIndicacion() { return inst.current?.textoIndicacion ?? ''; },
  }), []);

  return <div ref={caja} className={className} style={style} />;
});

export default SobreCapas;
