// Spec 022, RF-2 y RF-12: la migración 0017 convierte las rarezas y las tablas que ya había y da a cada colección su
// tabla gold. Se prueba en una base aparte, migrada hasta la 0016 con datos de antes y después con la 0017.
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const DB = "waifu_baker_m17";
const base = process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/waifu_baker_test";
const url = base.replace(/\/[^/]+$/, `/${DB}`);
const admin = () => postgres(base.replace(/\/[^/]+$/, "/postgres"), { max: 1, onnotice: () => {} });
const FOLDER = path.resolve(__dirname, "../../drizzle");

let sql: ReturnType<typeof postgres>;
let tmp: string;

beforeAll(async () => {
  const a = admin();
  await a.unsafe(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
  await a.unsafe(`CREATE DATABASE ${DB}`);
  await a.end();
  // Copia de las migraciones sin la 0017 (y las que vengan después).
  tmp = mkdtempSync(path.join(tmpdir(), "wb-m17-"));
  cpSync(FOLDER, tmp, { recursive: true });
  const journalPath = path.join(tmp, "meta/_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as { entries: { idx: number }[] };
  writeFileSync(journalPath, JSON.stringify({ ...journal, entries: journal.entries.filter((e) => e.idx < 17) }));
  sql = postgres(url, { max: 1, onnotice: () => {} });
  await migrate(drizzle(sql), { migrationsFolder: tmp });

  // Datos con las seis rarezas de antes.
  const [set] = await sql`INSERT INTO sets (code, name, slug, pack_size) VALUES ('OLD1', 'Antigua', 'antigua', 2) RETURNING id`;
  const rarities = ["common", "uncommon", "rare", "epic", "legendary", "secret"];
  for (const [i, r] of rarities.entries()) {
    await sql`INSERT INTO cards (set_id, number, original_sha256, rarity) VALUES (${set.id}, ${i + 1}, ${`sha${i}`}, ${r}::rarity)`;
  }
  await sql`INSERT INTO cards (set_id, number, original_sha256, rarity, layers) VALUES (${set.id}, 7, 'sha7', 'secret'::rarity, ${JSON.stringify({ capas: [], marco: "ur", sello: { texto: "UR", estilo: "arcoiris", esquina: "sup-izq" } })}::jsonb)`;
  await sql`INSERT INTO drop_tables (set_id, version, slots, holo_chance, pity_threshold) VALUES (${set.id}, 1, ${JSON.stringify([
    { common: 70, uncommon: 25, rare: 5, epic: 0, legendary: 0, secret: 0 },
    { common: 0, uncommon: 0, rare: 75, epic: 18, legendary: 6, secret: 1 },
  ])}::jsonb, 0.2, 10)`;

  await migrate(drizzle(sql), { migrationsFolder: FOLDER });
}, 60_000);

afterAll(async () => {
  await sql?.end();
  const a = admin();
  await a.unsafe(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
  await a.end();
  if (tmp) rmSync(tmp, { recursive: true, force: true });
});

describe("spec 022 — migración 0017", () => {
  it("test_s022_rf2_poco_comun_pasa_a_comun_y_secreta_a_ex", async () => {
    const rows = await sql`SELECT number, rarity::text AS rarity FROM cards ORDER BY number`;
    expect(rows.map((r) => r.rarity)).toEqual(["common", "common", "rare", "epic", "legendary", "ex", "ex"]);
    const [type] = await sql`SELECT enum_range(NULL::rarity)::text AS values`;
    expect(type.values).toBe("{common,rare,epic,legendary,ex}");
  });

  it("test_s022_rf2_las_tablas_suman_poco_comun_a_comun_y_secreta_pasa_a_ex", async () => {
    const [silver] = await sql`SELECT slots, kind::text AS kind FROM drop_tables WHERE kind = 'silver'`;
    expect(silver.slots).toEqual([
      { common: 95, rare: 5, epic: 0, legendary: 0, ex: 0 },
      { common: 0, rare: 75, epic: 18, legendary: 6, ex: 1 },
    ]);
  });

  it("test_s022_rf12_cada_coleccion_recibe_su_tabla_gold_en_borrador_y_los_sobres_son_plata", async () => {
    const [gold] = await sql`SELECT slots, pity_threshold, is_public, published_at FROM drop_tables WHERE kind = 'gold'`;
    expect(gold).toMatchObject({ pity_threshold: 0, is_public: false, published_at: null });
    expect(gold.slots).toHaveLength(2);
    expect(gold.slots[1]).toEqual({ common: 0, rare: 0, epic: 70, legendary: 25, ex: 5 });
    const [col] = await sql`SELECT column_default FROM information_schema.columns WHERE table_name = 'packs' AND column_name = 'kind'`;
    expect(col.column_default).toContain("silver");
  });

  it("test_s022_rf9_los_sellos_guardados_pasan_a_los_de_la_maqueta", async () => {
    const [card] = await sql`SELECT layers FROM cards WHERE number = 7`;
    expect(card.layers.sello.texto).toBe("EX");
  });
});
