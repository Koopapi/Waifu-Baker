// Spec 032, RF-9 y RF-12: los motivos para no eliminar, con su enlace.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n/client";
import { DeletionBlockerList } from "./DeletionBlockerList";

const html = (locale: "es" | "en") =>
  renderToStaticMarkup(
    <I18nProvider locale={locale}>
      <DeletionBlockerList blockers={[{ kind: "owners", count: 2 }, { kind: "welcome" }, { kind: "cover_cards", count: 1 }, { kind: "tier_rule", name: "Booster" }]} />
    </I18nProvider>,
  );

describe("spec 032 — motivos para no eliminar", () => {
  it("test_s032_rf9_dice_cuantos_usuarios_sin_decir_quienes", () => {
    expect(html("es")).toContain("2 usuarios recibieron sobres o cartas de ella");
    expect(html("en")).toContain("2 users have received packs or cards from it");
  });

  it("test_s032_rf12_cada_lugar_en_uso_lleva_su_enlace", () => {
    const out = html("es");
    expect(out).toContain('href="#welcome"');
    expect(out).toContain('href="/admin/settings#cover-cards"');
    expect(out).toContain('href="/admin/tiers"');
    expect(out).toContain("La da el tier de Patreon «Booster».");
    expect(out).toContain("1 de sus cartas está en la portada.");
  });
});
