import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { counterAt, splitDuration } from "./time";
import { FocusView } from "./FocusView";
import { SoundToggle } from "./SoundToggle";

describe("piezas para juegos", () => {
  it("test_s011_rf8_la_cuenta_atras_parte_el_tiempo_y_no_baja_de_cero", () => {
    expect(splitDuration(3_725_000)).toEqual({ h: 1, m: 2, s: 5, done: false });
    expect(splitDuration(-50)).toEqual({ h: 0, m: 0, s: 0, done: true });
  });

  it("test_s011_rf8_el_contador_animado_sube_con_suavidad_y_acaba_en_el_valor", () => {
    expect(counterAt(0, 240, 0)).toBe(0);
    expect(counterAt(0, 240, 1)).toBe(240);
    const mid = counterAt(0, 240, 0.5);
    expect(mid).toBeGreaterThan(120);
    expect(mid).toBeLessThan(240);
    expect(counterAt(240, 200, 1)).toBe(200);
  });

  it("test_s011_rf8_la_vista_a_pantalla_completa_es_una_region_modal", () => {
    const out = renderToStaticMarkup(
      <FocusView label="Pack opening" inline>
        <p>Stage</p>
      </FocusView>,
    );
    expect(out).toMatch(/role="dialog"/);
    expect(out).toContain('aria-modal="true"');
    expect(out).toContain("fixed inset-0");
  });

  it("test_s013_rf7_el_boton_de_silencio_dice_su_estado_a_los_lectores_de_pantalla", () => {
    const on = renderToStaticMarkup(<SoundToggle muted={false} onToggle={() => {}} />);
    expect(on).toContain('aria-label="Mute sound"');
    expect(on).toContain('aria-pressed="false"');
    const off = renderToStaticMarkup(<SoundToggle muted onToggle={() => {}} />);
    expect(off).toContain('aria-pressed="true"');
    expect(off).toContain('data-muted="true"');
  });
});
