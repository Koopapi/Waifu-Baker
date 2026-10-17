import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { counterAt, splitDuration } from "./time";
import { FocusView } from "./FocusView";
import { SoundToggle } from "./SoundToggle";
import { RingTimer } from "./RingTimer";

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

  it("test_s014_rf16_el_temporizador_en_anillo_se_llena_hasta_el_siguiente", () => {
    const now = new Date("2026-10-16T12:00:00Z").getTime();
    // Faltan 3 h de 12 h: el anillo va por el 75 %.
    const out = renderToStaticMarkup(
      <RingTimer until={new Date(now + 3 * 3600_000).toISOString()} serverNow={new Date(now).toISOString()} totalMs={12 * 3600_000} label="Siguiente sobre gratis">
        <span>3:00:00</span>
      </RingTimer>,
    );
    expect(out).toContain('role="progressbar"');
    expect(out).toContain('aria-label="Siguiente sobre gratis"');
    expect(out).toMatch(/aria-valuenow="7[45]"/);
    expect(out).toContain("<circle");
    expect(out).toContain("3:00:00");
  });
});
