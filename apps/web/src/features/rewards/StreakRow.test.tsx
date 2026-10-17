// Spec 014, RF-17: la racha como una fila de pegatinas por día, sin textos que se salgan.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n/client";
import { StreakRow } from "./StreakRow";

const schedule = [10, 10, 15, 15, 20, 20].map((amount) => ({ kind: "cookies" as const, amount })).concat({ kind: "pack" as const } as never);

describe("spec 014 — racha", () => {
  it("test_s014_rf17_siete_pegatinas_con_su_estado_y_solo_numeros_a_la_vista", () => {
    const html = renderToStaticMarkup(
      <I18nProvider locale="es">
        <StreakRow schedule={schedule} day={4} claimedToday={false} />
      </I18nProvider>,
    );
    expect((html.match(/data-day=/g) ?? []).length).toBe(7);
    expect((html.match(/data-state="done"/g) ?? []).length).toBe(3);
    expect((html.match(/data-state="current"/g) ?? []).length).toBe(1);
    expect((html.match(/data-state="next"/g) ?? []).length).toBe(3);
    // El texto largo («10 galletas») solo para lectores de pantalla; a la vista, número y pegatina.
    expect(html).toMatch(/class="sr-only">Día 1: 10 galletas/);
    expect(html).toContain('data-sticker="cookie"');
    expect(html).toContain('data-sticker="pack"');
    const visible = html.replace(/<span class="sr-only">[^<]*<\/span>/g, "");
    expect(visible).not.toMatch(/galletas|cookies/);
  });
});
