import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { contentTypeFor, type CardStore } from "@/server/ports/card-store";

/** Disco local para desarrollo. Las rutas nunca pueden salir de `root`. */
export class LocalCardStore implements CardStore {
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  private resolve(key: string): string | null {
    const full = path.resolve(this.root, key);
    return full.startsWith(this.root + path.sep) ? full : null;
  }

  async put(key: string, body: Buffer) {
    const full = this.resolve(key);
    if (!full) throw new Error(`Clave no válida: ${key}`);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
  }

  async get(key: string) {
    const full = this.resolve(key);
    if (!full) return null;
    try {
      return { body: await readFile(full), contentType: contentTypeFor(key) };
    } catch {
      return null;
    }
  }

  async delete(key: string) {
    const full = this.resolve(key);
    if (full) await rm(full, { force: true });
  }

  async list(prefix: string) {
    const dir = this.resolve(prefix);
    if (!dir) return [];
    const out: { key: string; modifiedAt: Date }[] = [];
    const walk = async (d: string) => {
      let entries;
      try {
        entries = await readdir(d, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        const full = path.join(d, e.name);
        if (e.isDirectory()) await walk(full);
        else out.push({ key: path.relative(this.root, full).split(path.sep).join("/"), modifiedAt: (await stat(full)).mtime });
      }
    };
    await walk(dir);
    return out;
  }
}
