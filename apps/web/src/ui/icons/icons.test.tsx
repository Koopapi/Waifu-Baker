// Spec 014, RF-3, RF-4 y RF-24: pegatinas propias para los iconos clave y biblioteca de doble tono para el resto.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Icon } from "../shell/icons";
import { STICKERS, Sticker } from "./Sticker";

const SRC = path.resolve(__dirname, "../..");
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : [path.join(d, f)]));

describe("spec 014 — iconos", () => {
  it("test_s014_rf3_ocho_pegatinas_con_borde_blanco", () => {
    expect([...STICKERS].sort()).toEqual(["card", "clock", "collection", "cookie", "gift", "pack", "profile", "streak"]);
    for (const name of STICKERS) {
      const svg = renderToStaticMarkup(<Sticker name={name} className="size-10" />);
      expect(svg, name).toMatch(/^<svg[^>]*aria-hidden="true"/);
      expect(svg, name).toContain('class="size-10');
      expect(svg, name).toContain('stroke="var(--ui-k-blanco)"');
    }
    expect(renderToStaticMarkup(<Sticker name="cookie" title="Galletas" />)).toContain("<title>Galletas</title>");
  });

  it("test_s014_rf3_los_iconos_clave_de_la_navegacion_son_pegatinas", () => {
    for (const name of ["packs", "collection", "album", "rewards", "account"] as const) expect(renderToStaticMarkup(<Icon name={name} />), name).toContain("data-sticker");
    expect(renderToStaticMarkup(<Icon name="settings" />)).not.toContain("data-sticker");
  });

  it("test_s014_rf4_rf24_ningun_icono_de_linea_fina", () => {
    const offenders = walk(SRC).filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f) && /from ["']lucide-react["']/.test(readFileSync(f, "utf8")));
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
    expect(readFileSync(path.resolve(SRC, "../package.json"), "utf8")).not.toContain('"lucide-react"');
  });
});
