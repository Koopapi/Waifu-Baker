import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { db } from "@/db/client";
import { getCardStore } from "@/server/cards/store-instance";
import { publicAlbum, publicCardImageKey } from "@/server/services/album";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Álbum de Waifu Baker";

/** La vista previa usa las mismas imágenes con marca de agua que el álbum (RF-15). */
async function cardPng(slug: string, cardId: string) {
  const key = await publicCardImageKey(db, slug, cardId);
  const file = key ? await getCardStore().get(key) : null;
  if (!file) return null;
  const png = await sharp(file.body).resize(260, 364).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

/** RF-16: alias, progreso y hasta 3 destacadas. */
export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = /^[0-9A-Za-z]{12}$/.test(slug) ? await publicAlbum(db, slug) : null;
  const font = await readFile(path.resolve(process.cwd(), "assets/fonts/SpaceGrotesk-Bold.ttf"));
  const imgs = a ? (await Promise.all(a.featured.slice(0, 3).map((c) => cardPng(slug, c.cardId)))).filter((x): x is string => Boolean(x)) : [];
  const pct = a && a.totals.total ? Math.round((a.totals.owned / a.totals.total) * 100) : 0;
  const tilt = imgs.length === 3 ? [-8, 0, 8] : imgs.length === 2 ? [-5, 5] : [0];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "radial-gradient(120% 90% at 30% 10%, #2a1350 0%, #0b0912 65%)",
          color: "#f1eef8",
          fontFamily: "Space Grotesk",
          padding: 64,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: imgs.length ? 520 : 1072, gap: 22 }}>
          <div style={{ fontSize: 26, letterSpacing: 6, opacity: 0.7 }}>WAIFU BAKER</div>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05 }}>{a ? a.alias : "Álbum no disponible"}</div>
          {a && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 32, opacity: 0.85 }}>{`${a.totals.owned} de ${a.totals.total} cartas · ${pct} %`}</div>
              <div style={{ display: "flex", width: 420, height: 14, borderRadius: 7, background: "rgba(255,255,255,0.12)" }}>
                <div style={{ width: `${Math.max(pct, 2)}%`, height: 14, borderRadius: 7, background: "linear-gradient(90deg, #d6b370, #ff6ad5)" }} />
              </div>
            </div>
          )}
        </div>
        {imgs.length > 0 && (
          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
            {imgs.map((src, i) => (
              <img
                key={i}
                src={src}
                width={220}
                height={308}
                alt=""
                style={{ borderRadius: 14, marginLeft: i ? -60 : 0, transform: `rotate(${tilt[i]}deg) translateY(${i === 1 ? -16 : 0}px)`, boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }}
              />
            ))}
          </div>
        )}
      </div>
    ),
    { ...size, fonts: [{ name: "Space Grotesk", data: font, weight: 700, style: "normal" }] },
  );
}
