import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

/**
 * Envoltorio de React para carta-capas.js
 *
 *   import CartaCapas from './CartaCapas';
 *   import yuki from '../cartas/yuki.json';
 *
 *   const carta = useRef(null);
 *   <CartaCapas ref={carta} carta={yuki} holo={esHolo} style={{ width: 330 }} />
 *
 *   carta.current.ocultarSello();   // en la apertura, antes de voltear
 *   carta.current.entrar();         // al revelar: el sello rebota y pasa un destello
 *
 * - Copia carta-capas.js junto a este archivo (o ajusta la ruta del import).
 * - Solo se ejecuta en el navegador, así que funciona con Next.js / SSR.
 * - `carta` debe ser un objeto estable (importado de un JSON o con useMemo);
 *   si cambia en cada render, la carta se vuelve a montar.
 * - `zona` (opcional) es un ref al elemento donde se escucha el ratón; por defecto, el padre.
 */
const CartaCapas = forwardRef(function CartaCapas(
  { carta, holo = false, selloOculto = false, zona, className, style },
  ref
) {
  const caja = useRef(null);
  const inst = useRef(null);

  useEffect(() => {
    let vivo = true;
    import('./carta-capas.js').then((mod) => {
      const lib = (mod && mod.default && mod.default.montar) ? mod.default : window.CartaCapas;
      if (!vivo || !caja.current || !lib) return;
      inst.current = lib.montar(caja.current, {
        ...carta,
        holo,
        zona: zona && zona.current ? zona.current : undefined,
      });
      if (selloOculto) inst.current.ocultarSello();
    });
    return () => {
      vivo = false;
      if (inst.current) inst.current.destruir();
      inst.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carta]);

  useEffect(() => {
    if (inst.current) inst.current.set({ holo });
  }, [holo]);

  useImperativeHandle(ref, () => ({
    entrar: () => inst.current && inst.current.entrar(),
    ocultarSello: () => inst.current && inst.current.ocultarSello(),
    set: (cambios) => inst.current && inst.current.set(cambios),
    habilitarGiroscopio: () =>
      inst.current ? inst.current.habilitarGiroscopio() : Promise.resolve(false),
  }), []);

  return <div ref={caja} className={className} style={style} />;
});

export default CartaCapas;
