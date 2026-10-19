import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Celebration } from "./Celebration";

describe("spec 015 — celebración central", () => {
  it("test_s015_rf6_es_un_dialogo_con_origen_titulo_premio_contador_y_botones", () => {
    const out = renderToStaticMarkup(
      <Celebration open onClose={() => {}} kicker="Un regalo para ti" title="¡Te han llegado 3 sobres!" detail="Fan Art · Vol. 1" count={3} primary={{ label: "Ver mis sobres", onAction: () => {} }} closeLabel="¡Genial!" inline>
        <div data-testid="art">sobre</div>
      </Celebration>,
    );
    expect(out).toMatch(/role="dialog"/);
    expect(out).toContain('data-testid="celebration-dialog"');
    expect(out).toContain("Un regalo para ti");
    expect(out).toContain("¡Te han llegado 3 sobres!");
    expect(out).toContain("Fan Art · Vol. 1");
    expect(out).toContain("×3");
    expect(out).toContain('data-testid="art"');
    expect(out).toContain("Ver mis sobres");
    expect(out).toContain("¡Genial!");
    expect(out).toMatch(/aria-labelledby="[^"]+"/);
  });

  it("test_s015_rf5_con_un_solo_premio_no_hay_contador_y_cerrar_es_el_boton_principal", () => {
    const out = renderToStaticMarkup(
      <Celebration open onClose={() => {}} kicker="Día 7 de la racha" kickerTone="mint" title="¡Racha completa!" count={1} closeLabel="¡Genial!" inline>
        <div>sobre</div>
      </Celebration>,
    );
    expect(out).not.toContain("×1");
    expect(out).toContain("bg-k-menta");
    const closeButton = out.match(/<button[^>]*data-testid="celebration-close"[^>]*>/)?.[0] ?? "";
    expect(closeButton).toContain("bg-ui-accent");
  });

  it("test_s015_rf6_cerrada_no_pinta_nada", () => {
    const out = renderToStaticMarkup(
      <Celebration open={false} onClose={() => {}} title="x" closeLabel="ok" inline>
        <div>sobre</div>
      </Celebration>,
    );
    expect(out).not.toContain("celebration-dialog");
  });
});
