'use client';
/**
 * Envoltorio de React + TypeScript para carta-capas.js v4 (Next.js App Router).
 *
 *   <CartaCapas ref={carta} carta={config} holo={esHolo} style={{ width: 330 }} />
 *   carta.current?.ocultarSello();   // en la apertura, antes de voltear
 *   carta.current?.entrar();         // al revelar
 *
 * - carta-capas.js y carta-capas.d.ts van junto a este archivo (ajusta la ruta si no).
 * - Solo se ejecuta en el navegador: el import es dinámico dentro de un efecto.
 * - `carta` debe ser estable (importado de JSON, de la base de datos o con useMemo):
 *   si cambia de identidad, la carta se vuelve a montar.
 * - En rejillas pasa `estatica` para ahorrar recursos.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, type CSSProperties, type RefObject } from 'react';
import type CartaCapasLib from './carta-capas';

type Opciones = CartaCapasLib.Opciones;
type Instancia = CartaCapasLib.Instancia;

export interface CartaCapasProps {
  carta: Opciones;
  holo?: boolean;
  holoIntensidad?: number;
  estatica?: boolean;
  selloOculto?: boolean;
  zona?: RefObject<HTMLElement | null>;
  className?: string;
  style?: CSSProperties;
}

export interface CartaCapasHandle {
  entrar(): void;
  ocultarSello(): void;
  set(cambios: Partial<Opciones>): void;
  habilitarGiroscopio(): Promise<boolean>;
}

const CartaCapas = forwardRef<CartaCapasHandle, CartaCapasProps>(function CartaCapas(
  { carta, holo, holoIntensidad, estatica = false, selloOculto = false, zona, className, style },
  ref
) {
  const caja = useRef<HTMLDivElement>(null);
  const inst = useRef<Instancia | null>(null);

  useEffect(() => {
    let vivo = true;
    import('./carta-capas.js').then((mod: unknown) => {
      const m = mod as { default?: CartaCapasLib.API };
      const lib = m?.default?.montar ? m.default : window.CartaCapas;
      if (!vivo || !caja.current || !lib) return;
      inst.current = lib.montar(caja.current, {
        ...carta,
        holo: holo ?? carta.holo,
        holoIntensidad: holoIntensidad ?? carta.holoIntensidad,
        estatica,
        zona: zona?.current ?? undefined,
      });
      if (selloOculto) inst.current.ocultarSello();
    });
    return () => {
      vivo = false;
      inst.current?.destruir();
      inst.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carta, estatica]);

  useEffect(() => {
    if (holo !== undefined) inst.current?.set({ holo });
  }, [holo]);

  useEffect(() => {
    if (holoIntensidad !== undefined) inst.current?.set({ holoIntensidad });
  }, [holoIntensidad]);

  useImperativeHandle(ref, () => ({
    entrar: () => inst.current?.entrar(),
    ocultarSello: () => inst.current?.ocultarSello(),
    set: (cambios) => inst.current?.set(cambios),
    habilitarGiroscopio: () => (inst.current ? inst.current.habilitarGiroscopio() : Promise.resolve(false)),
  }), []);

  return <div ref={caja} className={className} style={style} />;
});

export default CartaCapas;
