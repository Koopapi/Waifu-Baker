import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ArrivalsCelebration } from "./ArrivalsCelebration";

// La acción de servidor arrastra next-auth; aquí solo importa que se llame al mostrarse.
vi.mock("@/app/packs/arrivals-actions", () => ({ markCelebratedAction: vi.fn(), markPacksSeenAction: vi.fn() }));

const src = (f: string) => readFileSync(path.resolve(__dirname, "../..", f), "utf8");

describe("spec 015 — celebración de llegadas al entrar", () => {
  it("test_s015_rf6_no_pinta_nada_por_si_misma_la_cola_decide_cuando_sale", () => {
    const group = { total: 2, ids: ["a", "b"], origin: "gift" as const, sets: [{ setId: "s", code: "FA01", name: "Fan Art", count: 2, art: { coverVersion: null, packImage: null } }] };
    expect(renderToStaticMarkup(<ArrivalsCelebration group={group} />)).toBe("");
    expect(renderToStaticMarkup(<ArrivalsCelebration group={null} />)).toBe("");
  });

  it("test_s015_rf7_se_marca_celebrada_al_mostrarse_y_se_encola_con_la_identidad_de_la_tanda", () => {
    const s = src("features/rewards/ArrivalsCelebration.tsx");
    expect(s).toContain("key: arrivalsKey(group.ids)");
    expect(s).toContain("onShown: () => void markCelebratedAction(group.ids)");
  });

  it("test_s015_rf6_rf9_el_shell_del_coleccionista_la_monta_dentro_de_la_cola", () => {
    const shell = src("features/shell/CollectorShell.tsx");
    expect(shell).toMatch(/<CelebrationsProvider>[\s\S]*<ArrivalsCelebration group=\{arrivalsGroup\} \/>[\s\S]*<\/CelebrationsProvider>/);
    expect(shell).toContain("pendingArrivals(db, user.id)");
  });

  it("test_s015_rf8_mis_sobres_marca_las_llegadas_nuevas_y_las_da_por_vistas", () => {
    const page = src("app/(app)/packs/page.tsx");
    expect(page).toContain("newArrivalsBySet(db, user.id)");
    expect(page).toContain('<Badge tone="new">{t.rewards.fx.newPacks(');
    expect(page).toContain("<MarkPacksSeen />");
  });
});
