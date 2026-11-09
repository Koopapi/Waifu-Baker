import { describe, expect, it } from "vitest";
import { MAX_LINE, changesFromCommits, deployMessage, envLabel, mexicoTime, type Commit } from "./deploy-notice";

const c = (sha: string, parents: string[], message: string): Commit => ({ sha, parents, message });
// Línea principal de `pruebas`: dos PR mergeados, un commit directo y, entre medias, los commits de las ramas.
const PRUEBAS = [
  c("m2", ["m1", "b2"], "Merge pull request #46 from Koopapi/spec/033-filtros\n\nSpec 033: filtros, búsqueda y orden de las cartas"),
  c("b2", ["b1"], "Spec 033, T1: tesela"),
  c("m1", ["d1", "a1"], "Merge pull request #45 from Koopapi/spec/032-eliminar\n\nSpec 032: eliminar una colección"),
  c("a1", ["base"], "Spec 032, T1: reglas"),
  c("d1", ["base"], "Arreglo directo del README"),
  c("s1", ["base"], "Panel: pantalla de carga (#43)"),
];
const AT = new Date("2026-11-09T20:32:00Z"); // 14:32 en Ciudad de México

describe("spec 035 — aviso de despliegue", () => {
  it("test_s035_rf4_lista_los_pr_de_la_linea_principal_del_mas_reciente_al_mas_antiguo", () => {
    expect(changesFromCommits(PRUEBAS, "m2")).toEqual([
      { number: 46, title: "Spec 033: filtros, búsqueda y orden de las cartas" },
      { number: 45, title: "Spec 032: eliminar una colección" },
      { number: null, title: "Arreglo directo del README" },
    ]);
    expect(changesFromCommits(PRUEBAS, "s1")).toEqual([{ number: 43, title: "Panel: pantalla de carga" }]);
  });

  it("test_s035_rf4_el_paso_de_pruebas_a_main_lista_los_pr_que_trae", () => {
    const main = [c("p1", ["mainbase", "m2"], "Merge pull request #50 from Koopapi/pruebas\n\nPruebas a producción"), ...PRUEBAS];
    expect(changesFromCommits(main, "p1").map((x) => x.number)).toEqual([46, 45, null]);
  });

  it("test_s035_rf3_primera_linea_con_el_entorno_y_la_hora_de_ciudad_de_mexico", () => {
    expect(mexicoTime(AT)).toBe("9 nov 2026, 14:32");
    expect(envLabel("https://pruebas.waifubaker.com")).toBe("Pruebas");
    expect(envLabel("https://waifubaker.com")).toBe("Producción");
    const msg = deployMessage({ siteUrl: "https://pruebas.waifubaker.com", at: AT, changes: changesFromCommits(PRUEBAS, "m2") });
    expect(msg.split("\n")[0]).toBe("✅ Pruebas actualizada · 9 nov 2026, 14:32");
  });

  it("test_s035_rf5_el_mensaje_termina_con_la_direccion_y_un_renglon_por_cambio", () => {
    const msg = deployMessage({ siteUrl: "https://waifubaker.com", at: AT, changes: changesFromCommits(PRUEBAS, "m2") });
    expect(msg).toBe(
      ["✅ Producción actualizada · 9 nov 2026, 14:32", "", "• Spec 033: filtros, búsqueda y orden de las cartas (#46)", "• Spec 032: eliminar una colección (#45)", "• Arreglo directo del README", "", "waifubaker.com"].join("\n"),
    );
  });

  it("test_s035_rf7_mas_de_15_cambios_lista_15_y_dice_cuantos_mas", () => {
    const changes = Array.from({ length: 18 }, (_, i) => ({ number: 100 + i, title: `Cambio ${i}` }));
    const lines = deployMessage({ siteUrl: "https://waifubaker.com", at: AT, changes }).split("\n");
    expect(lines.filter((l) => l.startsWith("• "))).toHaveLength(15);
    expect(lines).toContain("… y 3 más");
  });

  it("test_s035_rf7_los_titulos_largos_se_cortan_y_el_numero_se_conserva", () => {
    const title = "Spec 099: " + "un título muy largo ".repeat(10);
    const line = deployMessage({ siteUrl: "https://waifubaker.com", at: AT, changes: [{ number: 77, title }] }).split("\n")[2];
    expect(line.length).toBeLessThanOrEqual(MAX_LINE);
    expect(line).toMatch(/… \(#77\)$/);
  });

  it("test_s035_rf11_primer_aviso_y_lista_que_no_se_pudo_leer", () => {
    expect(deployMessage({ siteUrl: "https://waifubaker.com", at: AT, changes: [], first: true })).toContain("Primer aviso de este entorno.");
    expect(deployMessage({ siteUrl: "https://waifubaker.com", at: AT, changes: [], listFailed: true })).toContain("No se pudo leer la lista de cambios.");
  });
});
