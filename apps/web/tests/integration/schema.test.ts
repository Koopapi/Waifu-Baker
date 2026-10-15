import { describe, expect, it } from "vitest";
import { eq, sql as dsql } from "drizzle-orm";
import { cards, characters, sets } from "@/db/schema";
import { inRollback, testDb } from "./db";

describe("Infraestructura de BD", () => {
  it("abre una transacción y la revierte sin dejar datos", async () => {
    await inRollback(async (tx) => {
      await tx.insert(sets).values({ code: "TMP1", name: "Temporal", slug: "temporal" });
    });
    const { db, sql } = testDb();
    const rows = await db.select().from(sets).where(eq(sets.code, "TMP1"));
    await sql.end();
    expect(rows).toHaveLength(0);
  });

  it("crea las tablas del catálogo y guarda y lee una carta", async () => {
    await inRollback(async (tx) => {
      const [set] = await tx.insert(sets).values({ code: "WB01", name: "Base", slug: "base" }).returning();
      expect(set.status).toBe("draft");
      expect(set.packSize).toBe(5);
      const [ch] = await tx.insert(characters).values({ slug: "aiko", name: "Aiko" }).returning();
      const [card] = await tx
        .insert(cards)
        .values({ setId: set.id, number: 1, characterId: ch.id, name: "Aiko saluda", rarity: "rare", originalSha256: "abc" })
        .returning();
      expect(card.variant).toBe("normal");
      expect(card.status).toBe("draft");
      expect(card.version).toBe(1);
      const tables = await tx.execute(dsql`select table_name from information_schema.tables where table_schema = 'public'`);
      const names = (tables as unknown as { table_name: string }[]).map((r) => r.table_name);
      for (const t of ["users", "characters", "sets", "cards", "drop_tables", "tier_rules", "packs", "audit_log"]) {
        expect(names).toContain(t);
      }
    });
  });

  it("impide dos cartas con la misma imagen en una colección (RF-13 en BD)", async () => {
    await expect(
      inRollback(async (tx) => {
        const [set] = await tx.insert(sets).values({ code: "WB02", name: "Dup", slug: "dup" }).returning();
        await tx.insert(cards).values({ setId: set.id, number: 1, originalSha256: "same" });
        await tx.insert(cards).values({ setId: set.id, number: 2, originalSha256: "same" });
      }),
    ).rejects.toThrow();
  });
});
