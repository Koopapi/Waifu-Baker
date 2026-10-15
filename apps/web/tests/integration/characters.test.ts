import { describe, expect, it } from "vitest";
import { cards } from "@/db/schema";
import { createCharacter, deleteCharacter, listCharacters, updateCharacter } from "@/server/services/characters";
import { createSet } from "@/server/services/collections";
import { inRollback } from "./db";
import { makeAdmin } from "./factories";

describe("RF-10 personajes", () => {
  it("test_rf10_crea un personaje con identificador derivado del nombre", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const c = await createCharacter(tx, admin.id, { name: "Aiko Hoshino", bio: "Vampira de oficina" });
      expect(c).toMatchObject({ name: "Aiko Hoshino", slug: "aiko-hoshino", bio: "Vampira de oficina" });
    });
  });

  it("test_rf10_rechaza nombre vacío e identificador repetido", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      await createCharacter(tx, admin.id, { name: "Aiko" });
      await expect(createCharacter(tx, admin.id, { name: "  " })).rejects.toMatchObject({ code: "invalid_name" });
      await expect(createCharacter(tx, admin.id, { name: "aiko" })).rejects.toMatchObject({ code: "duplicate_slug" });
    });
  });

  it("test_rf10_edita y lista con el número de cartas", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const c = await createCharacter(tx, admin.id, { name: "Aiko" });
      const u = await updateCharacter(tx, admin.id, c.id, { name: "Aiko H.", bio: "Nueva bio" });
      expect(u).toMatchObject({ name: "Aiko H.", bio: "Nueva bio", slug: "aiko" });
      const rows = await listCharacters(tx);
      expect(rows[0]).toMatchObject({ name: "Aiko H.", cardCount: 0 });
    });
  });

  it("test_rf10_no deja borrar un personaje con cartas, sí uno sin cartas", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const used = await createCharacter(tx, admin.id, { name: "Aiko" });
      const free = await createCharacter(tx, admin.id, { name: "Mei" });
      const s = await createSet(tx, admin.id, { code: "WB01", name: "Base", isAdult: false });
      await tx.insert(cards).values({ setId: s.id, number: 1, characterId: used.id, originalSha256: "x" });
      await expect(deleteCharacter(tx, admin.id, used.id)).rejects.toMatchObject({ code: "character_in_use" });
      await deleteCharacter(tx, admin.id, free.id);
      expect((await listCharacters(tx)).map((r) => r.name)).toEqual(["Aiko"]);
    });
  });
});
