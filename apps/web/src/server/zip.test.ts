import { crc32 } from "node:zlib";
import { describe, expect, it } from "vitest";
import { buildZip } from "./zip";

/** Lee las entradas de un ZIP sin comprimir recorriendo sus cabeceras locales. */
function readZip(zip: Buffer) {
  const out: { name: string; body: Buffer; crcOk: boolean }[] = [];
  let at = 0;
  while (zip.readUInt32LE(at) === 0x04034b50) {
    const crc = zip.readUInt32LE(at + 14);
    const size = zip.readUInt32LE(at + 18);
    const nameLen = zip.readUInt16LE(at + 26);
    const extraLen = zip.readUInt16LE(at + 28);
    const name = zip.subarray(at + 30, at + 30 + nameLen).toString("utf8");
    const body = zip.subarray(at + 30 + nameLen + extraLen, at + 30 + nameLen + extraLen + size);
    out.push({ name, body: Buffer.from(body), crcOk: crc32(body) === crc });
    at += 30 + nameLen + extraLen + size;
  }
  return { entries: out, centralAt: at };
}

describe("ZIP de la exportación", () => {
  it("test_s017_rf17_el_zip_lleva_cada_archivo_con_su_nombre_y_su_crc", () => {
    const files = [
      { name: "carta.json", body: Buffer.from('{"id":"x"}') },
      { name: "x_1_fondo.webp", body: Buffer.from([1, 2, 3, 4, 5]) },
    ];
    const zip = buildZip(files);
    const { entries, centralAt } = readZip(zip);
    expect(entries.map((e) => [e.name, e.body.toString("hex"), e.crcOk])).toEqual(files.map((f) => [f.name, f.body.toString("hex"), true]));
    // Directorio central y fin de archivo con el número de entradas.
    expect(zip.readUInt32LE(centralAt)).toBe(0x02014b50);
    const end = zip.length - 22;
    expect(zip.readUInt32LE(end)).toBe(0x06054b50);
    expect(zip.readUInt16LE(end + 10)).toBe(2);
  });
});
