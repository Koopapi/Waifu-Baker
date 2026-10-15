import "server-only";
import path from "node:path";
import { LocalCardStore } from "@/server/adapters/local-card-store";
import type { CardStore } from "@/server/ports/card-store";

let instance: CardStore | null = null;

/** Adaptador configurado; en producción se sustituirá por el de S3 (MinIO/R2). */
export function getCardStore(): CardStore {
  instance ??= new LocalCardStore(process.env.CARD_STORE_DIR ?? path.resolve(process.cwd(), "var/cards"));
  return instance;
}
