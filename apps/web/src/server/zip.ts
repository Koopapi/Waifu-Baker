import { crc32 } from "node:zlib";

/**
 * Spec 017, RF-17: ZIP sin comprimir (método «store») para descargar varios archivos juntos. Las imágenes ya van en
 * WebP, así que comprimirlas no ahorra nada; así no hace falta otra dependencia. Nombres en UTF-8 y fecha fija.
 */
export function buildZip(files: { name: string; body: Buffer }[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, "utf8");
    const crc = crc32(f.body);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // versión necesaria
    local.writeUInt16LE(0x0800, 6); // nombre en UTF-8
    local.writeUInt16LE(0, 8); // sin comprimir
    local.writeUInt16LE(0, 10); // hora
    local.writeUInt16LE(0x21, 12); // fecha: 1 ene 1980
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(f.body.length, 18);
    local.writeUInt32LE(f.body.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, f.body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // versión que lo crea
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(f.body.length, 20);
    central.writeUInt32LE(f.body.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += local.length + name.length + f.body.length;
  }
  const centralSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}
