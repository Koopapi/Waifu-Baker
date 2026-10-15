import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";

const url = process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/waifu_baker_test";

export function testDb() {
  const sql = postgres(url, { max: 4, onnotice: () => {} });
  return { db: drizzle(sql, { schema }), sql };
}

/** Ejecuta fn dentro de una transacción que siempre se revierte: cada test empieza limpio. */
export async function inRollback<T>(fn: (tx: Parameters<Parameters<ReturnType<typeof testDb>["db"]["transaction"]>[0]>[0]) => Promise<T>) {
  const { db, sql } = testDb();
  const ROLLBACK = Symbol("rollback");
  let result: T | undefined;
  try {
    await db.transaction(async (tx) => {
      result = await fn(tx);
      throw ROLLBACK;
    });
  } catch (e) {
    if (e !== ROLLBACK) throw e;
  } finally {
    await sql.end();
  }
  return result as T;
}
