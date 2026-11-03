import { describe, expect, it } from "vitest";
import { clearDraft, DRAFT_TTL_MS, DRAFT_WRITE_DELAY_MS, draftKey, parseDraft, readDraft, writeDraft, type CardDraft, type DraftStorage } from "./draft";

const CARD = "11111111-1111-4111-8111-111111111111";
const draft: CardDraft = {
  cardId: CARD,
  baseVersion: 3,
  ficha: { name: "Yuki", flavorText: "", characterId: null, rarity: "rare", variant: "normal" },
  layers: { capas: [{ key: "sets/s/layers/a.webp", rol: "personaje" }], marco: "r", sello: null },
  savedAt: 1_000_000,
};

function memory(): DraftStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

describe("spec 027 — borrador en el navegador", () => {
  it("test_s027_rf10_rf13_se_escribe_poco_despues_del_cambio_se_lee_y_se_borra", () => {
    expect(DRAFT_WRITE_DELAY_MS).toBeLessThan(2000);
    const s = memory();
    expect(writeDraft(s, draft)).toBe(true);
    expect(s.data.has(draftKey(CARD))).toBe(true);
    expect(readDraft(s, CARD, draft.savedAt + 1)).toEqual({ draft, available: true });
    expect(clearDraft(s, CARD)).toBe(true);
    expect(readDraft(s, CARD, draft.savedAt + 1)).toEqual({ draft: null, available: true });
  });

  it("test_s027_rf15_el_borrador_caduca_a_los_5_dias_y_se_borra_al_leerlo", () => {
    expect(DRAFT_TTL_MS).toBe(5 * 24 * 60 * 60 * 1000);
    const s = memory();
    writeDraft(s, draft);
    expect(readDraft(s, CARD, draft.savedAt + DRAFT_TTL_MS).draft).toEqual(draft);
    expect(readDraft(s, CARD, draft.savedAt + DRAFT_TTL_MS + 1).draft).toBeNull();
    expect(s.data.has(draftKey(CARD))).toBe(false);
  });

  it("test_s027_rf11_un_borrador_roto_o_de_otra_carta_no_se_ofrece", () => {
    expect(parseDraft("{no es json", CARD, 0)).toBeNull();
    expect(parseDraft(JSON.stringify({ ...draft, layers: { capas: "x" } }), CARD, 0)).toBeNull();
    expect(parseDraft(JSON.stringify(draft), "22222222-2222-4222-8222-222222222222", draft.savedAt)).toBeNull();
    expect(parseDraft(JSON.stringify(draft), CARD, draft.savedAt)).toEqual(draft);
  });

  it("test_s027_rf4_sin_almacen_la_ventana_sigue_y_lo_indica", () => {
    const broken: DraftStorage = {
      getItem: () => {
        throw new Error("QuotaExceededError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(readDraft(broken, CARD, 0)).toEqual({ draft: null, available: false });
    expect(writeDraft(broken, draft)).toBe(false);
    expect(clearDraft(broken, CARD)).toBe(false);
    expect(readDraft(null, CARD, 0)).toEqual({ draft: null, available: false });
  });
});
