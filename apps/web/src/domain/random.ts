import { createHmac } from "node:crypto";

/** Fuente de aleatoriedad inyectable: devuelve un número en [0, 1). */
export interface Rng {
  next(): number;
}

/** mulberry32: determinista y rápido, solo para tests y simulaciones reproducibles. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/**
 * Generador reproducible a partir de una semilla (RF-9): HMAC-SHA256(semilla, contador) → 48 bits.
 * La semilla la genera el servidor con `crypto.randomBytes(32)` y se guarda con cada apertura.
 */
export function hmacRng(seed: Buffer): Rng {
  let counter = 0;
  let block = Buffer.alloc(0);
  let offset = 0;
  return {
    next() {
      if (offset + 6 > block.length) {
        const c = Buffer.alloc(8);
        c.writeBigUInt64BE(BigInt(counter++));
        block = createHmac("sha256", seed).update(c).digest();
        offset = 0;
      }
      const v = block.readUIntBE(offset, 6) / 2 ** 48;
      offset += 6;
      return v;
    },
  };
}
