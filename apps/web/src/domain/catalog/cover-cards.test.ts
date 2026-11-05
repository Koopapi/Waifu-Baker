// Spec 028, RF-20 y RF-22: reglas de las cartas de portada. Puro.
import { describe, expect, it } from "vitest";
import { coverSelectionProblem, isValidCover, parseCoverIds } from "./cover-cards";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("spec 028 — cartas de portada", () => {
  it("test_s028_rf20_se_eligen_de_3_a_5_cartas_sin_repetir", () => {
    expect(coverSelectionProblem([id(1), id(2)])).toBe("count");
    expect(coverSelectionProblem([id(1), id(2), id(3)])).toBeNull();
    expect(coverSelectionProblem([1, 2, 3, 4, 5].map(id))).toBeNull();
    expect(coverSelectionProblem([1, 2, 3, 4, 5, 6].map(id))).toBe("count");
    expect(coverSelectionProblem([id(1), id(1), id(2)])).toBe("duplicate");
    // Sin ninguna, la portada vuelve a la de siempre (RF-23).
    expect(coverSelectionProblem([])).toBeNull();
  });

  it("test_s028_rf22_solo_vale_una_carta_de_una_coleccion_publicada_no_18_con_imagen_publica", () => {
    expect(isValidCover({ setStatus: "published", setIsAdult: false, keyPublic: "k" })).toBe(true);
    expect(isValidCover({ setStatus: "archived", setIsAdult: false, keyPublic: "k" })).toBe(false);
    expect(isValidCover({ setStatus: "draft", setIsAdult: false, keyPublic: "k" })).toBe(false);
    expect(isValidCover({ setStatus: "published", setIsAdult: true, keyPublic: "k" })).toBe(false);
    expect(isValidCover({ setStatus: "published", setIsAdult: false, keyPublic: null })).toBe(false);
    expect(parseCoverIds([id(1), "x"])).toEqual([]);
    expect(parseCoverIds([id(2), id(1)])).toEqual([id(2), id(1)]);
  });
});
