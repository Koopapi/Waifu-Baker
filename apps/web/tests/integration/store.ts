import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { LocalCardStore } from "@/server/adapters/local-card-store";

export function tempStore() {
  return new LocalCardStore(mkdtempSync(path.join(tmpdir(), "wb-cards-")));
}
