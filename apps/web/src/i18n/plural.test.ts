// Spec 014, RF-19: plurales correctos en inglés y español («1 sobre», «3 sobres»), nunca «sobre(s)».
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { dictionaries } from "./index";
import { plural } from "./plural";

describe("spec 014 — plurales", () => {
  it("test_s014_rf19_ningun_texto_usa_el_plural_entre_parentesis", () => {
    const dir = path.resolve(__dirname, "dictionaries");
    const offenders = ["en", "es"].flatMap((l) =>
      readdirSync(path.join(dir, l)).flatMap((f) =>
        [...readFileSync(path.join(dir, l, f), "utf8").matchAll(/\b(?!String\b)[A-Za-zñáéíóú]+\((s|es|as|os|a|o)\)/g)].map((m) => `${l}/${f}: ${m[0]}`),
      ),
    );
    expect(offenders).toEqual([]);
  });

  it("test_s014_rf19_singular_y_plural_en_los_dos_idiomas", () => {
    expect(plural(1, "sobre", "sobres")).toBe("sobre");
    expect(plural(0, "sobre", "sobres")).toBe("sobres");
    expect(dictionaries.es.packs.mine.sealed(1)).toBe("Tienes 1 sobre sin abrir.");
    expect(dictionaries.es.packs.mine.sealed(3)).toBe("Tienes 3 sobres sin abrir.");
    expect(dictionaries.en.packs.mine.sealed(1)).toBe("You have 1 unopened pack.");
    expect(dictionaries.en.packs.mine.sealed(3)).toBe("You have 3 unopened packs.");
    expect(dictionaries.es.packs.openAll.openN(1)).toBe("Abrir 1 sobre");
  });
});
