// Spec 001, RF-16: Patreon firma cada aviso con HMAC-MD5 del cuerpo (cabecera X-Patreon-Signature).
import { createHmac, timingSafeEqual } from "node:crypto";

export function signPatreonBody(body: string, secret: string) {
  return createHmac("md5", secret).update(body, "utf8").digest("hex");
}

export function verifyPatreonSignature(body: string, signature: string | null | undefined, secret: string | undefined) {
  if (!secret || !signature) return false;
  const expected = Buffer.from(signPatreonBody(body, secret), "hex");
  const given = Buffer.from(signature.trim().toLowerCase(), "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
