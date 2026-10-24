// Spec 018, RF-16 y RF-17: las capas de una carta (para verla viva) solo para quien la tiene y, en 18+, con el doble control.
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { cards, userCards, users } from "@/db/schema";
import { liveCardConfig, serveLiveLayer } from "@/server/services/live-card";
import { upsertUserFromLogin } from "@/server/services/users";
import { inRollback } from "./db";
import { createPublishedSet, makeAdmin } from "./factories";
import { tempStore } from "./store";

type Tx = Parameters<Parameters<typeof inRollback>[0]>[0];
const NOW = Date.parse("2026-10-23T12:00:00Z");

async function world(tx: Tx, adult = false) {
  const admin = await makeAdmin(tx);
  const store = tempStore();
  const { cards: list } = await createPublishedSet(tx, admin.id, { code: adult ? "LIVA" : "LIVE", rarities: ["common", "rare"], slots: [{ common: 100 }, { rare: 100 }], isAdult: adult, store });
  const fan = await upsertUserFromLogin(tx, { patreonUserId: `dev:live-${adult}`, displayName: "Fan", role: "user" });
  const other = await upsertUserFromLogin(tx, { patreonUserId: `dev:other-${adult}`, displayName: "Otro", role: "user" });
  await tx.insert(userCards).values({ userId: fan.id, cardId: list[0].id });
  return { store, card: list[0], fan, other };
}

const param = (url: string, name: string) => new URL(url, "http://x").searchParams.get(name)!;

describe("spec 018 — capas para la carta viva", () => {
  it("test_s018_rf16_quien_tiene_la_carta_recibe_su_configuracion_con_enlaces_firmados_que_caducan", async () => {
    await inRollback(async (tx) => {
      const { store, card, fan } = await world(tx);
      const live = await liveCardConfig(tx, fan.id, card.id, NOW);
      expect(live).not.toBeNull();
      const srcs = live!.config.capas.flatMap((l) => ("src" in l ? [l.src] : []));
      expect(srcs).toHaveLength(card.layers!.capas.filter((l) => "key" in l).length);
      for (const src of srcs) {
        expect(src).toMatch(/^\/api\/cards\/layer\?/);
        expect(Number(param(src, "e"))).toBe(NOW + 10 * 60 * 1000);
        const file = await serveLiveLayer(tx, store, fan.id, { cardId: param(src, "c"), key: param(src, "k"), expires: Number(param(src, "e")), sig: param(src, "sig") }, NOW);
        expect(file?.contentType).toBe("image/webp");
      }
      // Las claves del almacén no viajan al navegador.
      expect(JSON.stringify(live)).not.toMatch(/"key":/);
    });
  });

  it("test_s018_rf16_quien_no_la_tiene_no_recibe_nada", async () => {
    await inRollback(async (tx) => {
      const { store, card, fan, other } = await world(tx);
      expect(await liveCardConfig(tx, other.id, card.id, NOW)).toBeNull();
      const src = (await liveCardConfig(tx, fan.id, card.id, NOW))!.config.capas.flatMap((l) => ("src" in l ? [l.src] : []))[0];
      const grant = { cardId: param(src, "c"), key: param(src, "k"), expires: Number(param(src, "e")), sig: param(src, "sig") };
      // El enlace es de otra persona, ha caducado o pide otra clave: nada.
      expect(await serveLiveLayer(tx, store, other.id, grant, NOW)).toBeNull();
      expect(await serveLiveLayer(tx, store, fan.id, grant, NOW + 11 * 60 * 1000)).toBeNull();
      expect(await serveLiveLayer(tx, store, fan.id, { ...grant, key: "sets/otra/layers/x.webp" }, NOW)).toBeNull();
    });
  });

  it("test_s018_rf17_una_carta_18_solo_con_el_doble_control_de_edad", async () => {
    await inRollback(async (tx) => {
      const { card, fan } = await world(tx, true);
      await tx.update(users).set({ isAdultDeclared: true, adultVerifiedAt: null }).where(eq(users.id, fan.id));
      expect(await liveCardConfig(tx, fan.id, card.id, NOW)).toBeNull();
      await tx.update(users).set({ adultVerifiedAt: new Date(NOW) }).where(eq(users.id, fan.id));
      expect(await liveCardConfig(tx, fan.id, card.id, NOW)).not.toBeNull();
    });
  });

  it("test_s018_rf18_lo_pendiente_de_revision_no_se_entrega", async () => {
    await inRollback(async (tx) => {
      const { card, fan } = await world(tx);
      const pending = { ...card.layers!, marco: "ur" as const };
      await tx.update(cards).set({ layersPending: pending }).where(eq(cards.id, card.id));
      expect((await liveCardConfig(tx, fan.id, card.id, NOW))!.config.marco).toBe(card.layers!.marco);
    });
  });
});
