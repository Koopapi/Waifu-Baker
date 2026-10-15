import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { albums, users } from "@/db/schema";
import { activateAlbum, deactivateAlbum, getMyAlbum, publicAlbum, regenerateAlbumLink, setFeatured } from "@/server/services/album";
import { cardDetail, myBinder, myCollections } from "@/server/services/collection";
import { openAllPacks } from "@/server/services/packs";
import { upsertUserFromLogin } from "@/server/services/users";
import { giftPacks } from "@/server/services/users-admin";
import { inRollback } from "./db";
import { createPublishedSet, makeAdmin } from "./factories";

type Tx = Parameters<Parameters<typeof inRollback>[0]>[0];

/** Usuario con cartas de una colección SFW (3 cartas, 2 por sobre) y otra 18+. */
async function world(tx: Tx) {
  const admin = await makeAdmin(tx);
  const fan = await upsertUserFromLogin(tx, { patreonUserId: "fan-album", displayName: "Nombre Real De Patreon", role: "user" });
  await tx.update(users).set({ isAdultDeclared: true, adultVerifiedAt: new Date() }).where(eq(users.id, fan.id));
  const sfw = await createPublishedSet(tx, admin.id, { code: "ALB1", rarities: ["common", "common", "rare"], slots: [{ common: 100 }, { rare: 100 }] });
  const adult = await createPublishedSet(tx, admin.id, { code: "ALB1A", rarities: ["common"], slots: [{ common: 100 }], isAdult: true });
  await giftPacks(tx, admin.id, { userId: fan.id, setId: sfw.set.id, count: 2, reason: "álbum" });
  await giftPacks(tx, admin.id, { userId: fan.id, setId: adult.set.id, count: 1, reason: "álbum 18+" });
  await openAllPacks(tx, { userId: fan.id, setId: sfw.set.id });
  await openAllPacks(tx, { userId: fan.id, setId: adult.set.id });
  return { admin, fan, sfw, adult };
}

describe("RF-1 a RF-6 Mi colección", () => {
  it("test_s006_rf1_lista las colecciones con cartas y su progreso", async () => {
    await inRollback(async (tx) => {
      const { fan, sfw } = await world(tx);
      const cols = await myCollections(tx, fan.id);
      const c = cols.find((x) => x.setId === sfw.set.id)!;
      expect(c.progress.total).toBe(3);
      expect(c.progress.owned).toBeGreaterThanOrEqual(2);
      expect(cols.map((x) => x.code).sort()).toEqual(["ALB1", "ALB1A"]);
    });
  });

  it("test_s006_rf2_el álbum de una colección tiene un hueco por carta", async () => {
    await inRollback(async (tx) => {
      const { fan, sfw } = await world(tx);
      const b = (await myBinder(tx, fan.id, sfw.set.id))!;
      expect(b.slots.map((s) => s.number)).toEqual([1, 2, 3]);
      expect(b.slots[2].owned?.rarity).toBe("rare");
    });
  });

  it("test_s006_rf4_sin verificación de edad, una colección 18+ aparece bloqueada y sin cartas", async () => {
    await inRollback(async (tx) => {
      const { fan, adult } = await world(tx);
      await tx.update(users).set({ adultVerifiedAt: null }).where(eq(users.id, fan.id));
      expect((await myCollections(tx, fan.id)).find((x) => x.setId === adult.set.id)?.locked).toBe(true);
      expect(await myBinder(tx, fan.id, adult.set.id)).toMatchObject({ locked: true, slots: [] });
    });
  });

  it("test_s006_rf5_la ficha de una carta propia trae sus datos; de una ajena, nada", async () => {
    await inRollback(async (tx) => {
      const { fan, sfw } = await world(tx);
      const rare = sfw.cards.find((c) => c.rarity === "rare")!;
      const d = (await cardDetail(tx, fan.id, rare.id))!;
      expect(d).toMatchObject({ name: rare.name, rarity: "rare", setCode: "ALB1" });
      expect(d.qty + d.holoQty).toBe(2);
      expect(d.firstObtainedAt).toBeInstanceOf(Date);
      const other = await upsertUserFromLogin(tx, { patreonUserId: "otro-album", displayName: "Otro", role: "user" });
      expect(await cardDetail(tx, other.id, rare.id)).toBeNull();
    });
  });
});

describe("RF-8 a RF-12 ajustes del álbum público", () => {
  it("test_s006_rf8_está desactivado hasta que el usuario lo activa", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      expect(await getMyAlbum(tx, fan.id)).toBeNull();
    });
  });

  it("test_s006_rf9_al activarlo pide alias y asigna un enlace aleatorio", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      await expect(activateAlbum(tx, fan.id, " ")).rejects.toMatchObject({ code: "invalid_alias" });
      const a = await activateAlbum(tx, fan.id, "  Koopa  ");
      expect(a).toMatchObject({ alias: "Koopa", isPublic: true });
      expect(a.slug).toMatch(/^[0-9A-Za-z]{12}$/);
    });
  });

  it("test_s006_rf10_desactivarlo apaga el enlace y reactivarlo recupera el mismo", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      const a = await activateAlbum(tx, fan.id, "Koopa");
      await deactivateAlbum(tx, fan.id);
      expect(await publicAlbum(tx, a.slug)).toBeNull();
      const b = await activateAlbum(tx, fan.id, "Koopa");
      expect(b.slug).toBe(a.slug);
      expect(await publicAlbum(tx, a.slug)).not.toBeNull();
    });
  });

  it("test_s006_rf11_un enlace nuevo invalida el anterior", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      const a = await activateAlbum(tx, fan.id, "Koopa");
      const b = await regenerateAlbumLink(tx, fan.id);
      expect(b.slug).not.toBe(a.slug);
      expect(await publicAlbum(tx, a.slug)).toBeNull();
      expect(await publicAlbum(tx, b.slug)).not.toBeNull();
    });
  });

  it("test_s006_rf12_destacadas: solo propias y SFW, hasta 5, en orden", async () => {
    await inRollback(async (tx) => {
      const { fan, sfw, adult } = await world(tx);
      await activateAlbum(tx, fan.id, "Koopa");
      const rare = sfw.cards.find((c) => c.rarity === "rare")!;
      await expect(setFeatured(tx, fan.id, [adult.cards[0].id])).rejects.toMatchObject({ code: "invalid_featured" });
      await setFeatured(tx, fan.id, [rare.id]);
      expect((await getMyAlbum(tx, fan.id))!.featuredCardIds).toEqual([rare.id]);
    });
  });
});

describe("RF-13 y RF-14 vista pública", () => {
  it("test_s006_rf13_muestra alias, destacadas y colecciones SFW con progreso", async () => {
    await inRollback(async (tx) => {
      const { fan, sfw } = await world(tx);
      const a = await activateAlbum(tx, fan.id, "Koopa");
      const rare = sfw.cards.find((c) => c.rarity === "rare")!;
      await setFeatured(tx, fan.id, [rare.id]);
      const p = (await publicAlbum(tx, a.slug))!;
      expect(p.alias).toBe("Koopa");
      expect(p.featured.map((f) => f.cardId)).toEqual([rare.id]);
      expect(p.collections.map((c) => c.code)).toEqual(["ALB1"]);
      expect(p.collections[0].slots).toHaveLength(3);
    });
  });

  it("test_s006_rf14_nunca muestra 18+ ni el nombre o id de Patreon", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      const a = await activateAlbum(tx, fan.id, "Koopa");
      const json = JSON.stringify(await publicAlbum(tx, a.slug));
      expect(json).not.toContain("ALB1A");
      expect(json).not.toContain("Nombre Real De Patreon");
      expect(json).not.toContain("fan-album");
      expect(json).not.toContain(fan.id);
    });
  });

  it("test_s006_rf14_una cuenta borrada no tiene álbum público", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      const a = await activateAlbum(tx, fan.id, "Koopa");
      await tx.update(users).set({ deletedAt: new Date() }).where(eq(users.id, fan.id));
      expect(await publicAlbum(tx, a.slug)).toBeNull();
    });
  });

  it("caso límite: una destacada que deja de ser válida no rompe el álbum", async () => {
    await inRollback(async (tx) => {
      const { fan, sfw } = await world(tx);
      const a = await activateAlbum(tx, fan.id, "Koopa");
      await tx.update(albums).set({ featuredCardIds: [sfw.cards[0].id, "00000000-0000-0000-0000-000000000000"] }).where(eq(albums.userId, fan.id));
      const p = (await publicAlbum(tx, a.slug))!;
      expect(p.featured.every((f) => f.cardId !== "00000000-0000-0000-0000-000000000000")).toBe(true);
    });
  });
});
