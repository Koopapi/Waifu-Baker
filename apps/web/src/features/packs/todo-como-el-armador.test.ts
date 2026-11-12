// Spec 037: las vistas usan la miniatura del sobre y la imagen fija de la carta del armador (comprobación de fuentes:
// las celebraciones y las páginas del servidor no se pueden montar sin la sesión ni la base de datos).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const src = (f: string) => readFileSync(path.resolve(__dirname, "../..", f), "utf8");

describe("spec 037 — el sobre del armador en las celebraciones", () => {
  it("test_s037_rf1_la_celebracion_del_dia_7_muestra_la_miniatura_del_sobre", () => {
    const panel = src("features/rewards/RewardsPanel.tsx");
    expect(panel).toContain("<PrizePack view={set.pack}");
    expect(panel).not.toContain("PackArt");
    expect(src("app/(app)/rewards/page.tsx")).toContain("withSilverPacks(db, user.id, plainSets)");
  });

  it("test_s037_rf3_el_premio_de_expediciones_muestra_la_miniatura_del_sobre", () => {
    expect(src("features/games/ExpeditionsView.tsx")).toContain("<PrizePack view={set.pack}");
    expect(src("app/(app)/games/expeditions/page.tsx")).toContain("withSilverPacks(db, user.id, plainSets");
  });

  it("test_s037_rf2_rf5_la_llegada_usa_el_sobre_del_tipo_que_llego", () => {
    expect(src("features/rewards/ArrivalsCelebration.tsx")).toContain("<PrizePack view={first.pack}");
    expect(src("features/shell/CollectorShell.tsx")).toContain("packViewsFor(db, user.id, arrivals.sets.map((x) => ({ setId: x.setId, kind: x.kind })))");
  });

  it("test_s037_rf6_ya_no_existe_el_sobre_plano_anterior", () => {
    expect(() => src("features/packs/PackArt.tsx")).toThrow();
    expect(src("features/admin/sets/PackSettings.tsx")).toContain("<PrizePack");
  });
});

describe("spec 037 — la imagen fija del armador en las cuadrículas", () => {
  it("test_s037_rf9_expediciones_y_el_resumen_piden_la_imagen_fija_de_cada_copia", () => {
    expect(src("app/(app)/games/expeditions/page.tsx")).toContain('cardImage(c.cardId, "thumb", user.id, { holoCopy: c.holo');
    const actions = src("app/packs/actions.ts");
    expect(actions).toContain('cardImage(c.cardId, "mid", userId, { holoCopy: c.holo');
    // La portada de la barra es la imagen fija de su carta.
    expect(src("features/shell/CollectorShell.tsx")).toContain('cardImageUrl(c.coverCardId, "thumb", user.id)');
  });

  it("test_s037_rf10_tocar_una_carta_de_la_cuadricula_abre_su_ficha_viva", () => {
    const binder = src("features/collection/BinderView.tsx");
    expect(binder).toContain("onClick={() => setOpen(s.number)}");
    expect(binder).toContain("<CardSheet slot=");
    expect(src("features/collection/CardSheet.tsx")).toContain("<CartaCapas");
  });

  it("test_s037_rf13_rf19_las_cuadriculas_solo_ponen_el_acabado_holo_si_no_hay_imagen_holo", () => {
    expect(src("features/collection/BinderView.tsx")).toContain('s.owned.holoImage ? "" : " holo-finish"');
    expect(src("features/games/PreparePanel.tsx")).toContain('c.holoFinish && "holo-finish"');
    expect(src("features/packs/open-all/OpenAllFocus.tsx")).toContain('c.holoFinish ? "holo-finish"');
  });
});
