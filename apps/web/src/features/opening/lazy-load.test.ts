// Spec 013, RF-13: las piezas pesadas de la apertura (GSAP, gestos, partículas y audio) solo se descargan en las
// pantallas que las usan, y después de la primera carga.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const src = (f: string) => readFileSync(path.resolve(__dirname, "../..", f), "utf8");
const HEAVY = /^import[^;]*from ["'](gsap|@use-gesture\/react|howler|@\/features\/opening\/(OpeningStage|Particles|PackMesh))["']/m;

describe("spec 013 — carga diferida de la apertura", () => {
  it("test_s013_rf13_la_apertura_carga_la_escena_con_next_dynamic", () => {
    const opener = src("features/packs/PackOpener.tsx");
    expect(opener).not.toMatch(HEAVY);
    expect(opener).toMatch(/dynamic\(\s*\(\) => import\("@\/features\/opening\/OpeningStage"\)/);
  });

  it("test_s013_rf13_el_motor_de_sonido_descarga_howler_aparte", () => {
    const engine = src("features/opening/sound.ts");
    expect(engine).not.toMatch(HEAVY);
    expect(engine).toMatch(/import\("howler"\)/);
  });

  it("test_s013_rf13_abrir_todos_no_importa_piezas_pesadas_de_forma_estatica", () => {
    expect(src("features/packs/OpenAllView.tsx")).not.toMatch(HEAVY);
  });
});
