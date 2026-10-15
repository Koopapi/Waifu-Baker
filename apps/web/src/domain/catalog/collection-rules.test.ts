import { describe, expect, it } from "vitest";
import { canEdit, canGrantPacks, canOpenPacks, isListedForUsers, nextStatusAllowed, type EditableField } from "./collection-rules";

const LOCKED: EditableField[] = ["rarity", "variant", "number", "addCard", "removeCard", "odds", "isAdult", "packSize", "code"];
const FREE: EditableField[] = ["name", "flavorText", "art", "setName"];

describe("RF-5 colecciones en borrador", () => {
  it("test_rf5_un borrador no se muestra, no se concede y no se abre", () => {
    expect(isListedForUsers("draft")).toBe(false);
    expect(canGrantPacks("draft")).toBe(false);
    expect(canOpenPacks("draft")).toBe(false);
  });

  it("test_rf5_en borrador todo es editable", () => {
    for (const f of [...LOCKED, ...FREE]) expect(canEdit("draft", f)).toBe(true);
  });
});

describe("RF-8 colecciones publicadas", () => {
  it("test_rf8_bloquea lo que afecta a probabilidades", () => {
    for (const f of LOCKED) expect(canEdit("published", f)).toBe(false);
  });

  it("test_rf8_permite nombres, textos y arte", () => {
    for (const f of FREE) expect(canEdit("published", f)).toBe(true);
  });

  it("test_rf8_una publicada se lista, se concede y se abre", () => {
    expect(isListedForUsers("published")).toBe(true);
    expect(canGrantPacks("published")).toBe(true);
    expect(canOpenPacks("published")).toBe(true);
  });
});

describe("RF-9 colecciones archivadas", () => {
  it("test_rf9_una archivada no se concede pero sus sobres se siguen abriendo", () => {
    expect(canGrantPacks("archived")).toBe(false);
    expect(canOpenPacks("archived")).toBe(true);
    expect(isListedForUsers("archived")).toBe(false);
  });

  it("test_rf9_una archivada mantiene los mismos bloqueos que una publicada", () => {
    for (const f of LOCKED) expect(canEdit("archived", f)).toBe(false);
  });

  it("test_rf9_transiciones: borrador→publicada→archivada, nunca hacia atrás", () => {
    expect(nextStatusAllowed("draft", "published")).toBe(true);
    expect(nextStatusAllowed("published", "archived")).toBe(true);
    expect(nextStatusAllowed("draft", "archived")).toBe(false);
    expect(nextStatusAllowed("published", "draft")).toBe(false);
    expect(nextStatusAllowed("archived", "published")).toBe(false);
  });
});
