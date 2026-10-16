import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConfirmDialogView } from "./ConfirmDialogView";
import { Modal } from "./Modal";
import { confirmReducer } from "./confirm-state";

describe("superposiciones", () => {
  it("test_s011_rf6_el_modal_abierto_es_un_dialogo_con_titulo_y_descripcion", () => {
    const out = renderToStaticMarkup(
      <Modal open onOpenChange={() => {}} title="Delete card" description="This cannot be undone." inline>
        <p>Body</p>
      </Modal>,
    );
    expect(out).toMatch(/role="dialog"/);
    expect(out).toContain("Delete card");
    expect(out).toContain("This cannot be undone.");
    expect(out).toMatch(/aria-labelledby="[^"]+"/);
  });

  it("test_s011_rf12_la_confirmacion_peligrosa_explica_y_pinta_el_boton_en_rojo", () => {
    const out = renderToStaticMarkup(
      <ConfirmDialogView
        inline
        request={{ title: "Delete account?", body: "Your cards are deleted after 30 days.", confirmLabel: "Delete", cancelLabel: "Cancel", tone: "danger" }}
        onAnswer={() => {}}
      />,
    );
    expect(out).toMatch(/role="alertdialog"/);
    expect(out).toContain("Your cards are deleted after 30 days.");
    expect(out).toMatch(/<button[^>]*class="[^"]*bg-ui-danger[^"]*"[^>]*>Delete/);
    expect(out).toContain("Cancel");
  });

  it("test_s011_rf12_las_peticiones_se_atienden_de_una_en_una", () => {
    let s = confirmReducer({ queue: [] }, { type: "ask", id: 1, request: { title: "A" } });
    s = confirmReducer(s, { type: "ask", id: 2, request: { title: "B" } });
    expect(s.queue.map((q) => q.request.title)).toEqual(["A", "B"]);
    s = confirmReducer(s, { type: "answered", id: 1 });
    expect(s.queue.map((q) => q.request.title)).toEqual(["B"]);
  });
});
