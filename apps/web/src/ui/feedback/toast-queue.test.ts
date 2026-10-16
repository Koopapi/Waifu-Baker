import { describe, expect, it } from "vitest";
import { MAX_TOASTS, TOAST_MS, UNDO_MS, dismissToast, expireToasts, pushToast, type ToastState } from "./toast-queue";

const empty: ToastState = { items: [], seq: 0 };

describe("cola de avisos emergentes", () => {
  it("test_s010_rf8_añade el aviso con un id nuevo y su hora de caducidad", () => {
    const s = pushToast(empty, { kind: "success", title: "Saved" }, 1_000);
    expect(s.items).toEqual([{ id: 1, kind: "success", title: "Saved", expiresAt: 1_000 + TOAST_MS.success }]);
  });

  it("test_s010_rf8_los errores duran más que los avisos de éxito", () => {
    expect(TOAST_MS.error).toBeGreaterThan(TOAST_MS.success);
  });

  it("test_s010_rf8_desaparece solo al caducar", () => {
    let s = pushToast(empty, { kind: "success", title: "A" }, 0);
    s = pushToast(s, { kind: "error", title: "B" }, 0);
    s = expireToasts(s, TOAST_MS.success);
    expect(s.items.map((t) => t.title)).toEqual(["B"]);
  });

  it("test_s010_rf8_como mucho muestra los últimos avisos", () => {
    let s = empty;
    for (let i = 0; i < MAX_TOASTS + 2; i++) s = pushToast(s, { kind: "info", title: `T${i}` }, 0);
    expect(s.items).toHaveLength(MAX_TOASTS);
    expect(s.items.at(-1)?.title).toBe(`T${MAX_TOASTS + 1}`);
  });

  it("test_s010_rf8_se puede cerrar a mano", () => {
    const s = pushToast(empty, { kind: "info", title: "A" }, 0);
    expect(dismissToast(s, s.items[0].id).items).toEqual([]);
  });
});

describe("avisos con acción (spec 011)", () => {
  it("test_s011_rf11_el_aviso_puede_llevar_una_accion_deshacer", () => {
    const undo = () => {};
    const s = pushToast({ items: [], seq: 0 }, { kind: "success", title: "Archived", action: { label: "Undo", onAction: undo } }, 0);
    expect(s.items[0].action).toEqual({ label: "Undo", onAction: undo });
  });

  it("test_s011_rf11_un_aviso_con_accion_dura_lo_que_dura_poder_deshacer", () => {
    const s = pushToast({ items: [], seq: 0 }, { kind: "success", title: "Archived", action: { label: "Undo", onAction: () => {} } }, 0);
    expect(s.items[0].expiresAt).toBe(UNDO_MS);
  });
});
