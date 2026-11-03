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

  it("test_s027_rf6_con_cambios_sin_guardar_la_ventana_no_se_cierra_desde_fuera", () => {
    const out = renderToStaticMarkup(
      <Modal open onOpenChange={() => {}} title="Card 001" preventClose inline>
        <p>Body</p>
      </Modal>,
    );
    // Radix no cierra con clic fuera ni con Escape cuando la ventana lo impide; el botón de cerrar sigue ahí.
    expect(out).toMatch(/data-prevent-close="true"/);
    expect(out).toMatch(/aria-label="Close"/);
    expect(renderToStaticMarkup(<Modal open onOpenChange={() => {}} title="Card 001" inline />)).not.toMatch(/data-prevent-close/);
  });

  it("test_s027_rf7_la_pregunta_al_cerrar_ofrece_guardar_descartar_o_seguir", () => {
    const out = renderToStaticMarkup(
      <ConfirmDialogView
        inline
        request={{ title: "Unsaved changes", body: "What do you want to do?", confirmLabel: "Save and close", secondary: { label: "Discard", tone: "danger" }, cancelLabel: "Keep editing" }}
        onAnswer={() => {}}
      />,
    );
    expect(out).toMatch(/data-testid="confirm-accept"[^>]*>Save and close/);
    expect(out).toMatch(/<button[^>]*class="[^"]*bg-ui-danger[^"]*"[^>]*data-testid="confirm-secondary"[^>]*>Discard/);
    expect(out).toContain("Keep editing");
    // Sin opción secundaria, solo dos botones (como siempre).
    expect(renderToStaticMarkup(<ConfirmDialogView inline request={{ title: "Delete?" }} onAnswer={() => {}} />)).not.toMatch(/confirm-secondary/);
  });

  it("test_s011_rf12_las_peticiones_se_atienden_de_una_en_una", () => {
    let s = confirmReducer({ queue: [] }, { type: "ask", id: 1, request: { title: "A" } });
    s = confirmReducer(s, { type: "ask", id: 2, request: { title: "B" } });
    expect(s.queue.map((q) => q.request.title)).toEqual(["A", "B"]);
    s = confirmReducer(s, { type: "answered", id: 1 });
    expect(s.queue.map((q) => q.request.title)).toEqual(["B"]);
  });
});
