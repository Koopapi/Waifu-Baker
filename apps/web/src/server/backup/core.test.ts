import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { decryptFile, encryptFile, pruneBackups } from "./core";

const tmp = () => mkdtemp(path.join(tmpdir(), "wb-core-"));

describe("spec 007 — copias de seguridad", () => {
  it("test_s007_rf13_la_copia_se_cifra_y_solo_se_abre_con_la_clave", async () => {
    const d = await tmp();
    const src = path.join(d, "a.txt");
    await writeFile(src, "datos de prueba ".repeat(1000));
    await encryptFile(src, path.join(d, "a.wbk"), "una-clave-larga-de-prueba");
    const raw = await readFile(path.join(d, "a.wbk"));
    expect(raw.subarray(0, 4).toString()).toBe("WBK1");
    expect(raw.includes(Buffer.from("datos de prueba"))).toBe(false);
    await decryptFile(path.join(d, "a.wbk"), path.join(d, "b.txt"), "una-clave-larga-de-prueba");
    expect(await readFile(path.join(d, "b.txt"), "utf8")).toBe("datos de prueba ".repeat(1000));
    await expect(decryptFile(path.join(d, "a.wbk"), path.join(d, "c.txt"), "otra-clave-larga-distinta")).rejects.toThrow();
    await expect(encryptFile(src, path.join(d, "x.wbk"), "corta")).rejects.toThrow(/12 caracteres/);
  });

  it("test_s007_rf14_se_borran_las_copias_de_mas_de_30_dias", async () => {
    const d = await tmp();
    for (const f of ["wb-backup-20260901-030000.wbk", "wb-backup-20260920-030000.wbk", "wb-backup-20261014-030000.wbk", "otro.txt"]) await writeFile(path.join(d, f), "x");
    const gone = await pruneBackups(d, new Date("2026-10-15T12:00:00Z"));
    expect(gone).toEqual(["wb-backup-20260901-030000.wbk"]);
    expect((await readdir(d)).sort()).toEqual(["otro.txt", "wb-backup-20260920-030000.wbk", "wb-backup-20261014-030000.wbk"]);
  });
});
