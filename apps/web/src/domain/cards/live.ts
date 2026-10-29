// Spec 018: la carta viva tal como la recibe el navegador: la configuración de carta-capas.js con enlaces firmados en
// vez de claves del almacén. Solo tipos y lectura.
import type { RarityTier } from "@/domain/catalog/rarity-tier";
import type { ImageLayer, ImageSeal, LayersConfig, ParticleLayer, TextSeal } from "./layers";

export type LiveImageLayer = Omit<ImageLayer, "key"> & { src: string };
export type LiveSeal = (Omit<ImageSeal, "key"> & { src: string }) | TextSeal;

export interface LiveCard {
  tier: RarityTier;
  config: Omit<LayersConfig, "capas" | "sello"> & { capas: (LiveImageLayer | ParticleLayer)[]; sello: LiveSeal | null };
}

/** Los enlaces de imagen de una carta viva (para descargarlos antes de mostrarla). */
export function liveImageUrls(live: LiveCard): string[] {
  const urls = live.config.capas.flatMap((l) => ("src" in l ? [l.src] : []));
  if (live.config.sello && "src" in live.config.sello) urls.push(live.config.sello.src);
  return urls;
}
