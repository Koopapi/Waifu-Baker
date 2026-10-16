import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Avatar, Badge, Card, Progress, Table, Tabs } from "./index";

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

describe("contenido", () => {
  it("test_s011_rf7_tarjeta_con_titulo_y_variante_que_se_puede_pulsar", () => {
    const out = html(<Card title="Free pack" interactive>Body</Card>);
    expect(out).toContain("Free pack");
    expect(out).toContain("hover:");
  });

  it("test_s011_rf7_etiquetas_en_tonos_de_estado_y_de_rareza", () => {
    expect(html(<Badge tone="success">Published</Badge>)).toContain("text-ui-success-text");
    expect(html(<Badge tone="danger">18+</Badge>)).toContain("text-ui-danger-text");
    expect(html(<Badge count={3} />)).toContain(">3<");
    expect(html(<Badge count={120} />)).toContain(">99+<");
  });

  it("test_s011_rf7_pestanas_accesibles", () => {
    const out = html(<Tabs label="Filter" defaultValue="all" items={[{ value: "all", label: "All", content: "A" }, { value: "owned", label: "Owned", content: "B" }]} />);
    expect(out).toMatch(/role="tablist"/);
    expect((out.match(/role="tab"/g) ?? []).length).toBe(2);
    expect(out).toMatch(/aria-selected="true"[^>]*>All|>All<\/button>/);
  });

  it("test_s011_rf7_barra_de_progreso_con_valor_accesible", () => {
    const out = html(<Progress label="Collection" value={12} max={26} />);
    expect(out).toMatch(/role="progressbar"/);
    expect(out).toContain('aria-valuenow="12"');
    expect(out).toContain('aria-valuemax="26"');
  });

  it("test_s011_rf7_avatar_con_iniciales_si_no_hay_imagen", () => {
    expect(html(<Avatar name="Demo Collector" />)).toContain(">DC<");
  });

  it("test_s011_rf7_tabla_con_cabeceras_y_filas", () => {
    const out = html(<Table caption="Users" columns={[{ key: "n", header: "Name" }, { key: "c", header: "Cookies", align: "end" }]} rows={[{ id: "1", n: "Ana", c: 240 }]} />);
    expect(out).toContain("<caption");
    expect(out).toMatch(/<th[^>]*scope="col"[^>]*>Name/);
    expect(out).toContain(">240<");
  });
});
