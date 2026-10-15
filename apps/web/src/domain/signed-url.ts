// RF-20: enlaces de imagen firmados para un usuario y con caducidad.
import { createHmac, timingSafeEqual } from "node:crypto";

export type ImageSize = "thumb" | "mid" | "full";

export interface ImageGrant {
  cardId: string;
  size: ImageSize;
  userId: string;
  /** Milisegundos desde epoch. */
  expires: number;
}

export function signImage(g: ImageGrant, secret: string): string {
  return createHmac("sha256", secret).update(`${g.cardId}.${g.size}.${g.expires}.${g.userId}`).digest("hex");
}

export function verifyImage(g: ImageGrant & { sig: string }, secret: string, now: number): boolean {
  if (!(g.expires > now)) return false;
  const expected = Buffer.from(signImage(g, secret), "hex");
  const given = Buffer.from(g.sig, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
