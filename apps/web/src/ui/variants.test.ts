import { describe, expect, it } from "vitest";
import { cx, variants } from "./variants";

describe("ayudante de variantes", () => {
  const button = variants({
    base: "btn",
    variants: {
      variant: { primary: "bg-ui-accent", secondary: "bg-ui-raised" },
      size: { sm: "px-3", md: "px-4" },
    },
    defaults: { variant: "primary", size: "md" },
  });

  it("test_s011_rf1_aplica_la_base_y_las_variantes_por_defecto", () => {
    expect(button()).toBe("btn bg-ui-accent px-4");
  });

  it("test_s011_rf1_aplica_las_variantes_elegidas_y_la_clase_extra", () => {
    expect(button({ variant: "secondary", size: "sm", className: "w-full" })).toBe("btn bg-ui-raised px-3 w-full");
  });

  it("test_s011_rf1_cx_une_clases_y_descarta_valores_vacios", () => {
    expect(cx("a", false, undefined, null, "", "b", ["c", false && "d"])).toBe("a b c");
  });
});
