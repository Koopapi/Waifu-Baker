// Spec 030, RF-14 a RF-16: lo que necesita la interfaz para pintar el sobre de una colección y tipo en cualquier
// pantalla (listas, apertura, «Abrir todos» y simulador). Solo tipos y formato de enlaces.
import type { PackKind } from "../catalog/default-odds";
import type { PackRegistro } from "./design";

export interface PackViewData {
  setId: string;
  kind: PackKind;
  code: string;
  name: string;
  /** El registro de `SobreCapas` con sus enlaces (firmados si es un diseño propio). */
  registro: PackRegistro;
  /** RF-16: la miniatura guardada (firmada) para las listas; `null` = sobre básico (la dibuja el navegador). */
  thumb: string | null;
  designed: boolean;
}

/** La imagen de la colección para el sobre básico (spec 014: el sobre a mano o la portada); `null` si no tiene. */
export function packArtUrl(setId: string, art: { coverVersion: string | null; packImage: string | null }): string | null {
  if (art.packImage) return `/api/sets/${setId}/art?k=pack&v=${encodeURIComponent(art.packImage.slice(-12))}`;
  if (art.coverVersion) return `/api/sets/${setId}/art?k=cover&v=${encodeURIComponent(art.coverVersion)}`;
  return null;
}

export const packViewKey = (setId: string, kind: PackKind) => `${setId}:${kind}`;
