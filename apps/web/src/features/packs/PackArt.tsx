// Spec 014, RF-5 a RF-8: el sobre de una colección, igual en «Mis sobres», la apertura y «Abrir todos». Se compone
// con HTML y CSS (forma de sobre con dientes, portada, foil, nombre y pegatinas) o muestra el sobre hecho a mano.
import { Sticker } from "@/ui/icons/Sticker";
import { cx } from "@/ui/variants";
import "./pack-art.css";

export interface PackArtData {
  /** Cambia cuando cambia la portada (evita la caché). `null` = la colección no tiene portada posible. */
  coverVersion: string | null;
  /** Clave del sobre hecho a mano, o `null` para el compuesto. */
  packImage: string | null;
}

export interface PackArtProps {
  setId: string;
  code: string;
  name: string;
  art: PackArtData;
  className?: string;
}

const STAR = "M7 0 L9 5 L14 7 L9 9 L7 14 L5 9 L0 7 L5 5 Z";
const HEART = "M7 12 C1 8 0 5 0 3.5 C0 1.5 1.6 0 3.5 0 C5 0 6.3 0.9 7 2.2 C7.7 0.9 9 0 10.5 0 C12.4 0 14 1.5 14 3.5 C14 5 13 8 7 12 Z";
const TEETH = Array.from({ length: 13 }, (_, i) => `L${i * 20 + 10} 0 L${i * 20 + 20} 9`).join(" ");

function Teeth({ bottom }: { bottom?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 260 18" preserveAspectRatio="none" className={cx("pack-art__teeth", bottom && "pack-art__teeth--bottom")}>
      <path d={`M0 18 L0 9 ${TEETH} L260 18 Z`} />
    </svg>
  );
}

/** El ancho lo da la clase (p. ej. `w-[220px]`); todo lo demás escala con él. */
export function PackArt({ setId, code, name, art, className }: PackArtProps) {
  const label = `${name} (${code})`;
  if (art.packImage) {
    return (
      <div role="img" aria-label={label} className={cx("pack-art pack-art--custom", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen privada servida por la API */}
        <img src={`/api/sets/${setId}/art?k=pack&v=${encodeURIComponent(art.packImage.slice(-12))}`} alt="" draggable={false} />
      </div>
    );
  }
  return (
    <div role="img" aria-label={label} className={cx("pack-art", className)}>
      <span aria-hidden className="pack-art__halo" />
      <span aria-hidden className="pack-art__body">
        <span className="pack-art__brand">WAIFU BAKER</span>
        <span className="pack-art__cover">
          {art.coverVersion ? (
            /* eslint-disable-next-line @next/next/no-img-element -- imagen privada servida por la API */
            <img src={`/api/sets/${setId}/art?k=cover&v=${encodeURIComponent(art.coverVersion)}`} alt="" draggable={false} />
          ) : (
            <Sticker name="pack" className="pack-art__placeholder" />
          )}
          <span className="pack-art__foil" />
        </span>
        <span className="pack-art__band">
          <span className="pack-art__name">{name}</span>
          <span className="pack-art__code">{code}</span>
        </span>
      </span>
      <Teeth />
      <Teeth bottom />
      <svg aria-hidden viewBox="0 0 14 14" className="pack-art__deco pack-art__deco--star">
        <path d={STAR} />
      </svg>
      <svg aria-hidden viewBox="0 0 14 14" className="pack-art__deco pack-art__deco--mint">
        <path d={STAR} />
      </svg>
      <svg aria-hidden viewBox="0 0 14 12" className="pack-art__deco pack-art__deco--heart">
        <path d={HEART} />
      </svg>
    </div>
  );
}
