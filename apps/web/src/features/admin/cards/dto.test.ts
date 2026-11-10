import { describe, expect, it } from "vitest";
import { isAssembled } from "@/domain/cards/layers";
import { toCardTile } from "./dto";
import type { CardDTO } from "./types";

const card: CardDTO = {
  id: "c1",
  number: 7,
  name: "Yuki",
  flavorText: "Un texto largo que no necesita la cuadrícula",
  rarity: "rare",
  variant: "holo",
  characterId: "p1",
  characterName: "Yuki",
  status: "ready",
  version: 3,
  thumbUrl: "/api/admin/assets/t.webp",
  midUrl: "/api/admin/assets/m.webp",
  fullUrl: "/api/admin/assets/f.webp",
  adultReviewedAt: null,
  pendingArtUrl: null,
  pendingLayersUrl: "/api/admin/assets/p.webp",
  chance: 0.12,
  layers: { capas: [{ id: "a", tipo: "fondo", key: "sets/x/layers/abc.webp" }], marco: "R", sello: null } as unknown as CardDTO["layers"],
  hasOriginal: true,
};

describe("spec 031 — la cuadrícula sin las capas", () => {
  it("test_s031_rf2_la_tesela_no_lleva_las_capas_ni_las_imagenes_grandes", () => {
    const tile = toCardTile(card);
    expect(tile).not.toHaveProperty("layers");
    expect(tile).not.toHaveProperty("midUrl");
    expect(tile).not.toHaveProperty("fullUrl");
    expect(tile).not.toHaveProperty("flavorText");
    expect(JSON.stringify(tile)).not.toContain("layers/abc.webp");
  });

  it("test_s031_rf13_la_tesela_conserva_lo_que_usa_la_cuadricula", () => {
    expect(toCardTile(card)).toEqual({
      id: "c1",
      number: 7,
      name: "Yuki",
      rarity: "rare",
      characterId: "p1",
      characterName: "Yuki",
      status: "ready",
      version: 3,
      thumbUrl: "/api/admin/assets/t.webp",
      chance: 0.12,
      adultReviewedAt: null,
      pendingArtUrl: null,
      pendingLayersUrl: "/api/admin/assets/p.webp",
      assembled: false,
    });
  });
});

describe("spec 033 — la tesela para los filtros", () => {
  it("test_s033_rf1_la_tesela_lleva_el_personaje_para_filtrar", () => {
    expect(toCardTile(card).characterId).toBe("p1");
    expect(toCardTile({ ...card, characterId: null }).characterId).toBeNull();
  });

  it("test_s033_rf3_la_tesela_dice_si_la_carta_esta_armada_sin_llevar_las_capas", () => {
    expect(toCardTile(card).assembled).toBe(false);
    expect(toCardTile({ ...card, layers: null }).assembled).toBe(false);
    const armada = {
      capas: [
        { key: "library/f.webp", rol: "fondo", profundidad: 0.2, margen: 5 },
        { key: "sets/x/layers/c.webp", rol: "personaje", profundidad: 0.6, margen: 5 },
      ],
    } as unknown as CardDTO["layers"];
    expect(isAssembled(armada)).toBe(true);
    expect(toCardTile({ ...card, layers: armada }).assembled).toBe(true);
  });
});
