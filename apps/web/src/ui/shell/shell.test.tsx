import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Banner } from "./Banner";

describe("estructura como componentes del sistema", () => {
  it("test_s011_rf9_la_franja_es_un_componente_del_sistema", () => {
    const out = renderToStaticMarkup(<Banner action={<button>Switch</button>}>Demo</Banner>);
    expect(out).toContain("bg-ui-accent");
    expect(out).toContain("Switch");
  });

  it("test_s011_rf9_las_estructuras_del_coleccionista_y_del_panel_usan_la_del_sistema", () => {
    for (const f of ["CollectorShell.tsx", "AdminShell.tsx"]) {
      const src = readFileSync(path.resolve(__dirname, "../../features/shell", f), "utf8");
      expect(src).toContain('from "@/ui/shell/AppShell"');
    }
  });
});
