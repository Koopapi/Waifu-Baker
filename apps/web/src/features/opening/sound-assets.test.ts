// Spec 013, RF-1 y spec 015, RF-12: solo sonidos CC0, con origen, autor y licencia anotados junto a ellos; ≤ 200 kB
// en total (los nueve: seis de la apertura y tres de los premios).
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SOUNDS } from "@/domain/feedback/sounds";

const dir = path.resolve(__dirname, "../../../public/sounds");
const files = readdirSync(dir).filter((f) => f.endsWith(".mp3"));
const licenses = readFileSync(path.join(dir, "LICENSES.md"), "utf8");

describe("spec 013 — sonidos", () => {
  it("test_s013_rf1_estan_los_seis_sonidos_de_la_apertura", () => {
    expect(files).toEqual(expect.arrayContaining(["epic.mp3", "flip.mp3", "legendary.mp3", "rare.mp3", "secret.mp3", "tear.mp3"]));
  });

  it("test_s015_rf12_hay_un_fichero_por_cada_sonido_de_la_lista_y_ninguno_de_mas", () => {
    expect([...files].sort()).toEqual([...SOUNDS].map((s) => `${s}.mp3`).sort());
  });

  it("test_s013_rf1_cada_sonido_tiene_origen_autor_y_licencia_cc0", () => {
    for (const f of files) {
      const row = licenses.split("\n").find((l) => l.startsWith(`| ${f} |`));
      expect(row, f).toBeDefined();
      const cells = row!.split("|").map((c) => c.trim());
      expect(cells[2], `${f}: origen`).toMatch(/kenney\.nl\/assets\//);
      expect(cells[3], `${f}: autor`).not.toBe("");
      expect(cells[4], `${f}: licencia`).toBe("CC0 1.0");
    }
  });

  it("test_s013_rf1_los_sonidos_suman_como_mucho_200_kb", () => {
    const total = files.reduce((s, f) => s + statSync(path.join(dir, f)).size, 0);
    expect(total).toBeLessThanOrEqual(200 * 1024);
  });
});
