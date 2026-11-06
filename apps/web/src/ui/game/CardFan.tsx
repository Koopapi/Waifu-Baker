import { cx } from "../variants";

export interface CardFanItem {
  key: string;
  /** Imagen de la carta (pública con marca de agua en la portada; miniatura de la demo). */
  src: string;
}

/**
 * Posición de cada carta del abanico (de 1 a 5): giro de 7° y 95 px entre cartas y una caída que crece hacia los
 * lados (las de la portada de la demo, spec 010). La del centro queda delante.
 */
export function fanLayout(n: number): { rot: number; x: number; y: number; z: number }[] {
  const c = (n - 1) / 2;
  return Array.from({ length: n }, (_, i) => {
    const k = i - c;
    const a = Math.abs(k);
    return { rot: 7 * k, x: 95 * k, y: Math.round(7 * a * a + 3 * a), z: 10 - Math.round(a * 2) };
  });
}

/**
 * Spec 028, RF-21: abanico de cartas (de la portada de la demo, spec 010) para la portada pública y la de la demo. Es
 * decorativo: las cartas no tienen nombre para lectores de pantalla. Entra con `card-in` (respeta el movimiento
 * reducido) y se encoge en el teléfono.
 */
export function CardFan({ cards, className, "data-testid": testId }: { cards: CardFanItem[]; className?: string; "data-testid"?: string }) {
  const shown = cards.slice(0, 5);
  if (shown.length === 0) return null;
  const layout = fanLayout(shown.length);
  return (
    <div aria-hidden className={cx("relative h-[250px] w-full max-w-[560px] scale-[0.62] sm:scale-100", className)} data-testid={testId} data-count={shown.length}>
      {shown.map((c, i) => (
        // La posición va en el contenedor: la animación de entrada solo mueve la carta de dentro.
        <span
          key={c.key}
          className="absolute left-1/2 top-0 h-[210px] w-[150px]"
          style={{ transform: `translateX(calc(-50% + ${layout[i].x}px)) translateY(${layout[i].y}px) rotate(${layout[i].rot}deg)`, zIndex: layout[i].z }}
        >
          <span className="card-in block size-full overflow-hidden rounded-l border-2 border-ui-text/20 shadow-3" style={{ "--i": i } as React.CSSProperties}>
            {/* eslint-disable-next-line @next/next/no-img-element -- imagen servida por una ruta propia (pública con marca de agua o de la demo) */}
            <img src={c.src} alt="" className="size-full object-cover object-top" data-testid="card-fan-img" />
          </span>
        </span>
      ))}
    </div>
  );
}
