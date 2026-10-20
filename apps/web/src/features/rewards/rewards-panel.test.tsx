import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DAILY_SCHEDULE } from "@/domain/rewards/daily";
import { StreakRow } from "./StreakRow";

const panel = readFileSync(path.resolve(__dirname, "RewardsPanel.tsx"), "utf8");

describe("spec 015 — panel de recompensas", () => {
  it("test_s015_rf15_no_hay_aviso_emergente_ni_mensaje_de_exito_solo_un_anuncio_para_lectores_de_pantalla", () => {
    expect(panel).not.toContain("useToast");
    expect(panel).not.toMatch(/tone="success"/);
    expect(panel).toContain('aria-live="polite" data-testid="reward-announce"');
    expect(panel).toContain("fx.sr.gotCookies(");
    expect(panel).toContain("fx.sr.gotPack");
  });

  it("test_s015_rf16_el_error_va_junto_al_boton_y_solo_un_fallo_de_red_permite_reintentar", () => {
    expect(panel).toContain('tone="danger"');
    expect(panel).toContain("retryLabel={fx.retry}");
    // El «no» del servidor (ya reclamada, todavía no) se muestra sin reintentar.
    expect(panel).toMatch(/setError\(\{ title: r\.error \}\)/);
    // El fallo de red o inesperado, con «Reintentar».
    expect(panel).toMatch(/setError\(\{ title: fx\.failed, detail: fx\.failedDetail, retry \}\)/);
  });

  it("test_s015_rf1_rf2_las_galletas_vuelan_al_contador_y_el_sobre_a_la_navegacion_y_suenan_al_llegar", () => {
    expect(panel).toMatch(/to: "cookies", sticker: "cookie", count: 3/);
    expect(panel).toMatch(/to: "packs", sticker: "pack"/);
    expect(panel).toContain('sound.play("cookies")');
    expect(panel).toContain('sound.play("pack")');
    expect(panel).toContain('data-fly-target="cookies"');
  });

  it("test_s015_rf10_la_pegatina_del_dia_se_estampa_antes_de_que_vuele_nada", () => {
    const stamp = panel.indexOf("setStamping(day)");
    const fly = panel.indexOf('to: "cookies"');
    expect(stamp).toBeGreaterThan(0);
    expect(stamp).toBeLessThan(fly);
    const out = renderToStaticMarkup(<StreakRow schedule={DAILY_SCHEDULE} day={4} claimedToday={false} stamping={4} />);
    expect(out).toMatch(/data-day-sticker="4"[^>]*class="[^"]*streak-stamp/);
    expect(out).not.toMatch(/data-day-sticker="3"[^>]*class="[^"]*streak-stamp/);
  });

  it("test_s015_rf11_en_el_dia_de_gracia_late_la_pegatina_de_hoy_y_solo_esa", () => {
    const out = renderToStaticMarkup(<StreakRow schedule={DAILY_SCHEDULE} day={4} claimedToday={false} atRisk />);
    expect(out).toContain('data-at-risk="true"');
    expect(out.match(/streak-pulse/g)).toHaveLength(1);
    expect(out).toMatch(/data-day-sticker="4"[^>]*class="[^"]*streak-pulse/);
    const safe = renderToStaticMarkup(<StreakRow schedule={DAILY_SCHEDULE} day={4} claimedToday={false} />);
    expect(safe).not.toContain("streak-pulse");
    const claimed = renderToStaticMarkup(<StreakRow schedule={DAILY_SCHEDULE} day={4} claimedToday atRisk />);
    expect(claimed).not.toContain("streak-pulse");
  });
});
