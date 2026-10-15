// Mide composeCard. Uso: pnpm exec tsx scripts/bench-compose.ts
import sharp from "sharp";
import { composeCard } from "../src/server/cards/compose.ts";

const art = await sharp({ create: { width: 832, height: 1216, channels: 3, background: "#8888cc" } }).png().toBuffer();
for (let i = 0; i < 4; i++) {
  const t0 = performance.now();
  await composeCard(art, { number: i + 1, rarity: "epic", setCode: "WB01" });
  const t1 = performance.now();
  await sharp({ text: { text: "Aiko", font: "Space Grotesk Bold 88", fontfile: "assets/fonts/SpaceGrotesk.ttf", rgba: true } }).png().toBuffer();
  console.log(`composeCard #${i}: ${(t1 - t0).toFixed(0)} ms · un texto: ${(performance.now() - t1).toFixed(0)} ms`);
}
