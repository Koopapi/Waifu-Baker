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

/** Spec 018, RF-16: enlace a una capa de una carta (para verla viva), firmado para un usuario y con caducidad. */
export interface LayerGrant {
  cardId: string;
  key: string;
  userId: string;
  expires: number;
}

export function signLayer(g: LayerGrant, secret: string): string {
  return createHmac("sha256", secret).update(`layer.${g.cardId}.${g.key}.${g.expires}.${g.userId}`).digest("hex");
}

export function verifyLayer(g: LayerGrant & { sig: string }, secret: string, now: number): boolean {
  if (!(g.expires > now) || !/^[0-9a-f]{64}$/.test(g.sig)) return false;
  const expected = Buffer.from(signLayer(g, secret), "hex");
  const given = Buffer.from(g.sig, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
