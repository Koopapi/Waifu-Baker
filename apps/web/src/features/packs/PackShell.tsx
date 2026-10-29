// Spec 023, RF-1 a RF-3 y RF-5: el sobre nuevo (maqueta «Sobre de apertura» de la lámina «Apertura nueva (spec 023)»):
// cuerpo con foil plata o gold, la imagen de la colección en su ventana, volumen en los bordes, tira con dientes de
// rasgado y la etiqueta del tipo. Es el mismo en «Mis sobres», la apertura, «Abrir todos» y el simulador.
import type { PackKind } from "@/domain/catalog/default-odds";
import { Sticker } from "@/ui/icons/Sticker";
import { cx } from "@/ui/variants";
import type { PackArtData } from "./PackArt";
import "./pack-shell.css";

export interface PackShellProps {
  setId: string;
  code: string;
  name: string;
  art: PackArtData;
  kind: PackKind;
  /** Texto de la etiqueta del tipo (PLATA o GOLD, ya traducido). */
  kindLabel: string;
  /** `whole`: cerrado; `open`: sin tira (ya rasgado); `torn`: la tira sale volando (ráfaga de «Abrir todos»). */
  state?: "whole" | "open" | "torn";
  className?: string;
}

const STAR = "M7 0 L9 5 L14 7 L9 9 L7 14 L5 9 L0 7 L5 5 Z";
/** Dientes de la línea de rasgado (zigzag), en una caja de 250 × 8. */
export const TEETH_PATH = `M0 0 ${Array.from({ length: 25 }, (_, i) => `L${i * 10 + 5} 8 L${i * 10 + 10} 0`).join(" ")}`;

/** La tira de arriba con sus dientes y la etiqueta; `TearPack` la usa partida en dos al rasgar. */
export function PackStrip({ kindLabel, className, style }: { kindLabel: string; className?: string; style?: React.CSSProperties }) {
  return (
    <span aria-hidden className={cx("pack-shell__strip", className)} style={style}>
      <span className="pack-shell__tag">{kindLabel}</span>
      <svg viewBox="0 0 250 8" preserveAspectRatio="none" className="pack-shell__teeth">
        <path d={TEETH_PATH} />
      </svg>
    </span>
  );
}

/** El ancho lo da la clase (p. ej. `w-[220px]`); todo lo demás escala con él (proporción 250 × 392). */
export function PackShell({ setId, code, name, art, kind, kindLabel, state = "whole", className }: PackShellProps) {
  const src = art.packImage
    ? `/api/sets/${setId}/art?k=pack&v=${encodeURIComponent(art.packImage.slice(-12))}`
    : art.coverVersion
      ? `/api/sets/${setId}/art?k=cover&v=${encodeURIComponent(art.coverVersion)}`
      : null;
  return (
    <div role="img" aria-label={`${name} (${code}) · ${kindLabel}`} data-kind={kind} className={cx("pack-shell", `pack-shell--${kind}`, `pack-shell--${state}`, className)}>
      <span aria-hidden className="pack-shell__shadow" />
      <span aria-hidden className="pack-shell__body">
        <span className="pack-shell__brand">WAIFU BAKER</span>
        <span className="pack-shell__window">
          {src ? (
            /* eslint-disable-next-line @next/next/no-img-element -- imagen privada servida por la API */
            <img src={src} alt="" draggable={false} />
          ) : (
            <Sticker name="pack" className="pack-shell__placeholder" />
          )}
          <span className="pack-shell__holo" />
        </span>
        <span className="pack-shell__name">
          <b>{name}</b>
          <small>{code}</small>
        </span>
        <span className="pack-shell__sheen" />
        <span className="pack-shell__edge pack-shell__edge--left" />
        <span className="pack-shell__edge pack-shell__edge--right" />
      </span>
      {state !== "open" && <PackStrip kindLabel={kindLabel} />}
      {state === "open" && (
        <svg aria-hidden viewBox="0 0 250 8" preserveAspectRatio="none" className="pack-shell__lip">
          <path d="M0 4 L12 1 L24 6 L37 2 L50 7 L63 2 L76 6 L90 1 L104 6 L118 2 L132 7 L146 3 L160 6 L174 1 L188 6 L202 2 L216 7 L230 3 L250 5 L250 8 L0 8 Z" />
        </svg>
      )}
      {kind === "gold" && (
        <span aria-hidden className="pack-shell__sparkles">
          {[0, 1, 2, 3].map((i) => (
            <svg key={i} viewBox="0 0 14 14" style={{ "--i": i } as React.CSSProperties}>
              <path d={STAR} />
            </svg>
          ))}
        </span>
      )}
    </div>
  );
}
