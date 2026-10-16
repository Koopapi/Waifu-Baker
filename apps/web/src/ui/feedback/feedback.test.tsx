import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Alert } from "./Alert";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "./Skeleton";

describe("respuesta", () => {
  it("test_s011_rf5_alerta_en_cuatro_tonos_con_su_color_y_rol", () => {
    for (const [tone, cls] of [["info", "ui-info"], ["success", "ui-success"], ["warning", "ui-warning"], ["danger", "ui-danger"]] as const) {
      const out = renderToStaticMarkup(<Alert tone={tone} title="T">Body</Alert>);
      expect(out).toContain(cls);
      expect(out).toMatch(tone === "danger" ? /role="alert"/ : /role="status"/);
    }
  });

  it("test_s011_rf5_estado_vacio_con_titulo_texto_y_accion", () => {
    const out = renderToStaticMarkup(<EmptyState title="No packs" action={<a href="/drop-rates">See</a>}>Packs show up here.</EmptyState>);
    expect(out).toContain("No packs");
    expect(out).toContain("Packs show up here.");
    expect(out).toContain('href="/drop-rates"');
  });

  it("test_s011_rf5_el_esqueleto_no_lo_leen_los_lectores", () => {
    expect(renderToStaticMarkup(<Skeleton className="h-4" />)).toContain('aria-hidden="true"');
  });
});
