import "server-only";
import { signImage, signLayer, type ImageSize } from "@/domain/signed-url";

const TTL_MS = 10 * 60 * 1000;

export function imageSecret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("Falta AUTH_SECRET para firmar enlaces de imagen");
  return s;
}

/** RF-20: enlace a la imagen de una carta, firmado para un usuario y válido 10 minutos. */
export function cardImageUrl(cardId: string, size: ImageSize, userId: string, now = Date.now()) {
  const expires = now + TTL_MS;
  const sig = signImage({ cardId, size, userId, expires }, imageSecret());
  return `/api/cards/img?c=${cardId}&s=${size}&e=${expires}&sig=${sig}`;
}

/** Spec 018, RF-16: enlace a una capa de una carta del usuario, firmado y válido 10 minutos. */
export function cardLayerUrl(cardId: string, key: string, userId: string, now = Date.now()) {
  const expires = now + TTL_MS;
  const sig = signLayer({ cardId, key, userId, expires }, imageSecret());
  return `/api/cards/layer?c=${cardId}&k=${encodeURIComponent(key)}&e=${expires}&sig=${sig}`;
}
