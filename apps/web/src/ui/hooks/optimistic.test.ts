import { describe, expect, it, vi } from "vitest";
import { runOptimistic, type OptimisticNotice } from "./optimistic";

const setup = (result: { ok: boolean; error?: string }, withUndo = true) => {
  const states: string[] = [];
  const notices: OptimisticNotice[] = [];
  const run = vi.fn(async () => result);
  const undo = vi.fn(async () => ({ ok: true }));
  const go = () =>
    runOptimistic({
      prev: "old",
      next: "new",
      set: (v) => states.push(v),
      run,
      undo: withUndo ? undo : undefined,
      notify: (n) => notices.push(n),
    });
  return { states, notices, run, undo, go };
};

describe("acción optimista", () => {
  it("test_s011_rf10_muestra_el_resultado_antes_de_que_conteste_el_servidor", async () => {
    let release!: () => void;
    const states: string[] = [];
    const p = runOptimistic({ prev: "old", next: "new", set: (v) => states.push(v), run: () => new Promise((r) => (release = () => r({ ok: true }))), notify: () => {} });
    expect(states).toEqual(["new"]);
    release();
    await p;
    expect(states).toEqual(["new"]);
  });

  it("test_s011_rf10_si_el_servidor_la_rechaza_se_deshace_y_avisa_con_reintentar", async () => {
    const t = setup({ ok: false, error: "Nope" });
    await t.go();
    expect(t.states).toEqual(["new", "old"]);
    expect(t.notices[0]).toMatchObject({ kind: "error", message: "Nope" });
    expect(t.notices[0].action).toBe("retry");
    await t.notices[0].onAction!();
    expect(t.run).toHaveBeenCalledTimes(2);
  });

  it("test_s011_rf10_sin_conexion_tambien_se_deshace", async () => {
    const states: string[] = [];
    const notices: OptimisticNotice[] = [];
    await runOptimistic({ prev: 1, next: 2, set: (v) => states.push(String(v)), run: () => Promise.reject(new Error("offline")), notify: (n) => notices.push(n) });
    expect(states).toEqual(["2", "1"]);
    expect(notices[0].kind).toBe("error");
  });

  it("test_s011_rf11_si_es_reversible_el_aviso_de_exito_trae_deshacer", async () => {
    const t = setup({ ok: true });
    await t.go();
    expect(t.notices[0]).toMatchObject({ kind: "success", action: "undo" });
    await t.notices[0].onAction!();
    expect(t.undo).toHaveBeenCalledOnce();
    expect(t.states).toEqual(["new", "old"]);
  });

  it("test_s011_rf11_si_no_es_reversible_no_ofrece_deshacer", async () => {
    const t = setup({ ok: true }, false);
    await t.go();
    expect(t.notices[0]).toMatchObject({ kind: "success" });
    expect(t.notices[0].action).toBeUndefined();
  });

  it("test_s011_rf11_si_deshacer_falla_se_vuelve_al_valor_nuevo_y_se_avisa", async () => {
    const states: string[] = [];
    const notices: OptimisticNotice[] = [];
    await runOptimistic({ prev: "old", next: "new", set: (v) => states.push(v), run: async () => ({ ok: true }), undo: async () => ({ ok: false, error: "Too late" }), notify: (n) => notices.push(n) });
    await notices[0].onAction!();
    expect(states).toEqual(["new", "old", "new"]);
    expect(notices[1]).toMatchObject({ kind: "error", message: "Too late" });
  });
});
