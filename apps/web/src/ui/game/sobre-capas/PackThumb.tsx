"use client";

import { useEffect, useState } from "react";
import { cx } from "../../variants";
import type { PackRegistro } from "@/domain/packs/design";
import type { SobreRegistro } from "./sobre-capas";
import type { MiniaturaTextos } from "./miniatura";

/** Miniaturas ya dibujadas en esta pestaña (el mismo sobre básico sale varias veces en «Abrir todos»). */
const drawn = new Map<string, Promise<string | null>>();

function drawOnce(registro: PackRegistro | SobreRegistro, textos: MiniaturaTextos) {
  const k = JSON.stringify([registro, textos]);
  let p = drawn.get(k);
  if (!p) {
    // Spec 031: la receta se descarga solo cuando hay que dibujar un sobre básico (los diseñados traen su miniatura).
    p = import("./miniatura")
      .then((m) => m.dibujarMiniatura(registro as SobreRegistro, textos))
      .then((b) => (b ? URL.createObjectURL(b) : null))
      .catch(() => {
        drawn.delete(k);
        return null;
      });
    drawn.set(k, p);
  }
  return p;
}

export interface PackThumbProps {
  /** El registro del sobre (para dibujar el básico, que no tiene miniatura guardada). */
  registro: PackRegistro | SobreRegistro;
  /** RF-16: la miniatura guardada del diseño; `null` = la dibuja el navegador. */
  thumb: string | null;
  /** Nombre accesible (p. ej. «Fan Art (FA01) · Plata»). */
  label: string;
  textos: MiniaturaTextos;
  className?: string;
  /** Atributos de datos para las pruebas y los estilos (tipo de sobre, diseño propio…). */
  data?: Record<`data-${string}`, string | undefined>;
}

/**
 * Spec 030, RF-16: el sobre en las listas («Mis sobres», «Abrir todos»): una imagen, nunca el componente animado (un
 * solo sobre animado a la vez). Es la miniatura guardada al diseñarlo o, para el sobre básico, la que dibuja el
 * navegador con la misma receta (500 × 875).
 */
export function PackThumb({ registro, thumb, label, textos, className, data }: PackThumbProps) {
  const [src, setSrc] = useState<string | null>(thumb);
  const key = thumb ? null : JSON.stringify([registro, textos]);
  useEffect(() => {
    if (thumb) return setSrc(thumb);
    let alive = true;
    void drawOnce(registro, textos).then((u) => alive && setSrc(u));
    return () => {
      alive = false;
    };
    // `key` resume el registro y los textos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thumb, key]);
  return (
    <div role="img" aria-label={label} className={cx("pack-thumb relative aspect-[1000/1750]", className)} {...data}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- miniatura firmada o dibujada en el navegador
        <img src={src} alt="" draggable={false} className="pack-thumb__img block size-full object-contain drop-shadow-xl" />
      ) : (
        <span aria-hidden className="pack-thumb__wait absolute inset-[4%] animate-pulse rounded-l bg-ui-hover" />
      )}
    </div>
  );
}
