// Spec 013, RF-14: la apertura solo anima propiedades que el navegador mueve sin repintar (transform y opacity),
// para ir a 60 fps en un móvil de gama media. La fluidez real se comprueba en un teléfono (lista de la spec).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(path.resolve(__dirname, "../..", f), "utf8");
const CSS = ["features/opening/opening.css", "features/packs/open-all.css"];
const TWEENS = ["features/opening/OpeningStage.tsx", "features/opening/PackMesh.tsx", "features/opening/Card3D.tsx"];
const CSS_OK = new Set(["transform", "opacity"]);
// Propiedades de GSAP que se traducen a transform u opacity, y opciones del propio tween.
const GSAP_OK = new Set(["x", "y", "scale", "rotation", "rotationX", "rotationY", "skewX", "opacity", "duration", "ease", "delay", "onComplete", "overwrite"]);

/** Propiedades declaradas dentro de cada bloque @keyframes. */
function keyframeProps(css: string) {
  const props: string[] = [];
  for (const m of css.matchAll(/@keyframes\s+[\w-]+\s*\{((?:[^{}]*\{[^{}]*\})*[^{}]*)\}/g))
    for (const p of m[1].matchAll(/([\w-]+)\s*:/g)) props.push(p[1]);
  return props;
}

describe("spec 013 — animaciones de la apertura", () => {
  it("test_s013_rf14_los_keyframes_y_las_transiciones_solo_usan_transform_y_opacity", () => {
    for (const f of CSS) {
      const css = read(f);
      const bad = keyframeProps(css).filter((p) => !CSS_OK.has(p));
      expect(bad, f).toEqual([]);
      for (const t of css.matchAll(/transition(?:-property)?\s*:\s*([^;]+);/g)) {
        const props = t[1].split(",").map((x) => x.trim().split(/\s+/)[0]);
        expect(props.filter((p) => p !== "none" && !CSS_OK.has(p)), `${f}: ${t[0]}`).toEqual([]);
      }
    }
  });

  it("test_s013_rf14_los_tweens_de_gsap_solo_mueven_transform_y_opacity", () => {
    for (const f of TWEENS) {
      const src = read(f);
      for (const m of src.matchAll(/(?:gsap\.(?:to|set|from|fromTo)|\.to)\(\s*[^,]+,\s*\{([^}]*)\}/g)) {
        const keys = [...m[1].matchAll(/(?:^|[{,])\s*(\w+)\s*:/g)].map((k) => k[1]);
        expect(keys.filter((k) => !GSAP_OK.has(k)), `${f}: ${m[0]}`).toEqual([]);
      }
    }
  });
});
