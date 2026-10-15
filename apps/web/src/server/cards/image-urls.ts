import "server-only";
import { signImage, type ImageSize } from "@/domain/signed-url";

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
