import { randomBytes } from "node:crypto";
import type { Rng } from "@/domain/random";

/** RNG criptográfico del servidor (constitución, principio 3). */
export const cryptoRng: Rng = {
  next() {
    return randomBytes(6).readUIntBE(0, 6) / 2 ** 48;
  },
};
