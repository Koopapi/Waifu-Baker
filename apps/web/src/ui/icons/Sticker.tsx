// Spec 014, RF-3: iconos clave como pegatinas kawaii (relleno pastel, borde blanco y sombra), dibujados igual que
// las pegatinas de la lámina «Kawaii (spec 014)» de Pencil. SVG en línea: sin imágenes y nítido a cualquier tamaño.
import { cx } from "../variants";

export const STICKERS = ["pack", "card", "cookie", "gift", "clock", "collection", "streak", "profile", "map"] as const;
export type StickerName = (typeof STICKERS)[number];

const INK = "var(--ui-k-tinta)";
const BLUSH = "var(--ui-k-rubor)";
// El borde blanco va por detrás del relleno (`paintOrder`), así solo se ve hacia fuera, como una pegatina recortada.
const out = { stroke: "var(--ui-k-blanco)", strokeWidth: 6, strokeLinejoin: "round" as const, paintOrder: "stroke" as const };
const STAR = "M7 0 L9 5 L14 7 L9 9 L7 14 L5 9 L0 7 L5 5 Z";
const HEART = "M7 12 C1 8 0 5 0 3.5 C0 1.5 1.6 0 3.5 0 C5 0 6.3 0.9 7 2.2 C7.7 0.9 9 0 10.5 0 C12.4 0 14 1.5 14 3.5 C14 5 13 8 7 12 Z";

/** Carita kawaii centrada en (cx, cy): ojos, rubor y boca. */
function Face({ cx: x, cy: y }: { cx: number; cy: number }) {
  return (
    <g>
      <ellipse cx={x - 5} cy={y + 2.5} rx={2} ry={2.5} fill={INK} />
      <ellipse cx={x + 5} cy={y + 2.5} rx={2} ry={2.5} fill={INK} />
      <ellipse cx={x - 10} cy={y + 6.5} rx={3} ry={1.5} fill={BLUSH} />
      <ellipse cx={x + 10} cy={y + 6.5} rx={3} ry={1.5} fill={BLUSH} />
      <path d={`M${x - 3} ${y + 6} Q${x} ${y + 9} ${x + 3} ${y + 6}`} fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
    </g>
  );
}

// Funciones (no JSX al cargar el módulo): se dibujan al pintar.
const DRAWINGS: Record<StickerName, () => React.ReactNode> = {
  pack: () => (
    <>
      <rect x={14} y={10} width={36} height={46} rx={6} fill="var(--ui-k-chicle)" {...out} />
      <path transform="translate(14 6)" d="M0 8 L0 4 L3 0 L6 4 L9 0 L12 4 L15 0 L18 4 L21 0 L24 4 L27 0 L30 4 L33 0 L36 4 L36 8 Z" fill="var(--ui-k-chicle-claro)" {...out} />
      <rect x={14} y={44} width={36} height={5} fill="var(--ui-k-chicle-claro)" />
      <Face cx={32} cy={26} />
      <path transform="translate(42 2)" d={STAR} fill="var(--ui-k-limon)" {...out} strokeWidth={5} />
    </>
  ),
  card: () => (
    <>
      <rect x={16} y={8} width={32} height={46} rx={6} fill="var(--ui-k-lavanda)" transform="rotate(-8 16 8)" {...out} />
      <rect x={21} y={12} width={22} height={26} rx={4} fill="var(--ui-k-lavanda-claro)" transform="rotate(-8 21 12)" />
      <path transform="rotate(-8 25 18) translate(25 18)" d={HEART} fill="var(--ui-k-chicle)" />
      <path transform="translate(40 40) scale(0.857)" d={STAR} fill="var(--ui-k-limon)" {...out} strokeWidth={5} />
    </>
  ),
  cookie: () => (
    <>
      <circle cx={32} cy={32} r={24} fill="var(--ui-k-galleta)" {...out} />
      {[[16, 18], [42, 16], [14, 38], [44, 40], [30, 46]].map(([x, y]) => (
        <ellipse key={`${x}-${y}`} cx={x + 3} cy={y + 2.5} rx={3} ry={2.5} fill="var(--ui-k-chocolate)" />
      ))}
      <Face cx={32} cy={26} />
    </>
  ),
  gift: () => (
    <>
      <rect x={12} y={28} width={40} height={28} rx={5} fill="var(--ui-k-menta)" {...out} />
      <rect x={9} y={20} width={46} height={11} rx={4} fill="var(--ui-k-menta-claro)" {...out} />
      <rect x={29} y={20} width={6} height={36} fill="var(--ui-k-chicle)" />
      <ellipse cx={24.5} cy={15} rx={7.5} ry={6} fill="var(--ui-k-chicle)" transform="rotate(15 24.5 15)" {...out} />
      <ellipse cx={39.5} cy={11} rx={7.5} ry={6} fill="var(--ui-k-chicle)" transform="rotate(-15 39.5 11)" {...out} />
      <circle cx={32} cy={18} r={4} fill="var(--ui-accent-hover)" />
      <Face cx={32} cy={38} />
    </>
  ),
  clock: () => (
    <>
      <ellipse cx={15} cy={11} rx={7} ry={6} fill="var(--ui-k-celeste)" {...out} />
      <ellipse cx={49} cy={11} rx={7} ry={6} fill="var(--ui-k-celeste)" {...out} />
      <circle cx={32} cy={34} r={24} fill="var(--ui-k-celeste)" {...out} />
      <circle cx={32} cy={34} r={18} fill="var(--ui-k-celeste-claro)" />
      <path transform="translate(31 22)" d="M1 13 L1 1 M1 13 L10 8" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <ellipse cx={20} cy={39.5} rx={3} ry={1.5} fill={BLUSH} />
      <ellipse cx={44} cy={39.5} rx={3} ry={1.5} fill={BLUSH} />
    </>
  ),
  collection: () => (
    <>
      <rect x={20} y={6} width={32} height={42} rx={6} fill="var(--ui-k-lavanda)" transform="rotate(10 20 6)" {...out} />
      <rect x={12} y={14} width={38} height={44} rx={6} fill="var(--ui-k-limon)" {...out} />
      <rect x={12} y={14} width={8} height={44} rx={6} fill="var(--ui-k-limon-oscuro)" />
      <path transform="translate(25 24)" d="M9 0 L11.6 5.6 L18 6.4 L13.2 10.6 L14.6 17 L9 13.8 L3.4 17 L4.8 10.6 L0 6.4 L6.4 5.6 Z" fill="var(--ui-k-chicle)" />
    </>
  ),
  streak: () => (
    <>
      <path transform="translate(12 4)" d="M20 0 C28 12 40 18 40 34 C40 46 31 54 20 54 C9 54 0 46 0 34 C0 24 8 20 10 10 C14 16 16 18 18 20 C18 12 18 6 20 0 Z" fill="var(--ui-k-llama)" {...out} />
      <path transform="translate(22 28)" d="M10 0 C15 7 20 10 20 18 C20 24 15 28 10 28 C5 28 0 24 0 18 C0 12 5 10 10 0 Z" fill="var(--ui-k-limon)" />
      <Face cx={32} cy={40} />
    </>
  ),
  // Spec 020: «Juegos» (Expediciones). Un mapa doblado con el camino y una chincheta en forma de corazón.
  map: () => (
    <>
      <path d="M8 16 L24 10 L40 16 L56 10 L56 50 L40 56 L24 50 L8 56 Z" fill="var(--ui-k-celeste)" {...out} />
      <path d="M24 10 L24 50 M40 16 L40 56" stroke="var(--ui-k-celeste-claro)" strokeWidth={3} />
      <path d="M14 46 C20 38 26 42 30 34 S42 26 48 22" fill="none" stroke="var(--ui-k-blanco)" strokeWidth={2.5} strokeLinecap="round" strokeDasharray="1 5" />
      <path transform="translate(39 8) scale(1.2)" d={HEART} fill="var(--ui-k-chicle)" {...out} strokeWidth={4} />
      <ellipse cx={18} cy={30} rx={3} ry={1.5} fill={BLUSH} />
    </>
  ),
  profile: () => (
    <>
      <path transform="translate(12 8)" d="M0 18 L4 0 L16 12 Z" fill="var(--ui-k-rosa-claro)" {...out} />
      <path transform="translate(36 8)" d="M16 18 L12 0 L0 12 Z" fill="var(--ui-k-rosa-claro)" {...out} />
      <ellipse cx={32} cy={36} rx={22} ry={20} fill="var(--ui-k-rosa-claro)" {...out} />
      <Face cx={32} cy={32} />
    </>
  ),
};

export interface StickerProps {
  name: StickerName;
  className?: string;
  /** Texto para lectores de pantalla; sin él, la pegatina es decorativa. */
  title?: string;
}

/** Spec 014, RF-3: pegatina kawaii. El tamaño lo da la clase (`size-10` por defecto). */
export function Sticker({ name, className, title }: StickerProps) {
  return (
    <svg
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      viewBox="-4 -4 72 72"
      data-sticker={name}
      // El tamaño por defecto solo si no se pide otro (dos clases `size-*` compiten y gana la del CSS, no la última).
      className={cx("shrink-0 drop-shadow-[var(--shadow-sticker)]", /(^|\s)size-/.test(className ?? "") ? className : cx("size-10", className))}
    >
      {title && <title>{title}</title>}
      {DRAWINGS[name]()}
    </svg>
  );
}
