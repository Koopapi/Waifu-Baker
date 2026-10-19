import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeaderSoundToggle } from "./HeaderSoundToggle";

const src = (f: string) => readFileSync(path.resolve(__dirname, "../..", f), "utf8");

describe("spec 015 — botón de silencio en la cabecera", () => {
  it("test_s015_rf14_la_cabecera_del_coleccionista_lleva_el_boton_de_silencio", () => {
    expect(src("features/shell/CollectorShell.tsx")).toContain("<HeaderSoundToggle />");
    const out = renderToStaticMarkup(<HeaderSoundToggle />);
    expect(out).toContain('data-testid="sound-toggle-header"');
    expect(out).toContain('aria-pressed="false"');
  });

  it("test_s015_rf14_comparte_el_estado_con_el_boton_de_la_apertura", () => {
    // Los dos usan el mismo motor (un solo estado guardado en el dispositivo).
    expect(src("features/shell/HeaderSoundToggle.tsx")).toContain('from "@/features/sound/engine"');
    expect(src("features/opening/OpeningStage.tsx")).toContain('from "@/features/sound/engine"');
  });
});
