// Compone una carta de muestra con arte real. Uso: pnpm exec tsx scripts/sample-card.mts <arte> <salida.png> <rareza> <número>
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { composeCard } from "../src/server/cards/compose.ts";

const [art, out, rarity, num] = process.argv.slice(2);
const r = await composeCard(await readFile(art), { number: Number(num), rarity: rarity === "none" ? null : (rarity as never), setCode: "WB01" });
await writeFile(out, await sharp(r.mid).png().toBuffer());
console.log("ok", out);
