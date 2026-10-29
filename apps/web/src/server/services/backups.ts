import path from "node:path";
import * as Sentry from "@sentry/nextjs";
import { desc, eq, sql } from "drizzle-orm";
import { backupRuns } from "@/db/schema";
import { createBackup, pruneBackups } from "@/server/backup/core";
import type { DbLike } from "@/server/db-types";
import { r2ConfigFromEnv, uploadToR2, type R2Config } from "@/server/backup/r2";

export interface BackupConfig {
  databaseUrl: string;
  cardsDir: string;
  outDir: string | null;
  passphrase: string | null;
  /** Spec 024, RF-23: copia fuera del servidor (Cloudflare R2); `null` = solo en el disco. */
  r2: R2Config | null;
}

export function backupConfigFromEnv(env = process.env): BackupConfig {
  return {
    databaseUrl: env.DATABASE_URL ?? "",
    cardsDir: env.CARD_STORE_DIR ?? path.resolve(process.cwd(), "var/cards"),
    outDir: env.BACKUP_DIR?.trim() || null,
    passphrase: env.BACKUP_PASSPHRASE?.trim() || null,
    r2: r2ConfigFromEnv(env),
  };
}

/** RF-13, RF-14 y RF-16: hace la copia, borra las antiguas y deja constancia (también si falla). */
export async function runBackup(db: DbLike, cfg: BackupConfig, now = new Date()) {
  const [row] = await db.insert(backupRuns).values({ startedAt: now }).returning({ id: backupRuns.id });
  try {
    if (!cfg.outDir) throw new Error("Falta BACKUP_DIR: no hay carpeta para las copias.");
    if (!cfg.passphrase) throw new Error("Falta BACKUP_PASSPHRASE: no se hacen copias sin cifrar.");
    const r = await createBackup({ databaseUrl: cfg.databaseUrl, cardsDir: cfg.cardsDir, outDir: cfg.outDir, passphrase: cfg.passphrase, now });
    await pruneBackups(cfg.outDir, now);
    // Spec 024, RF-23: la misma copia cifrada, fuera del servidor.
    if (cfg.r2) await uploadToR2(cfg.r2, r.file, `copias/${path.basename(r.file)}`, now);
    await db.update(backupRuns).set({ ok: true, finishedAt: sql`now()`, file: path.basename(r.file), bytes: r.bytes }).where(eq(backupRuns.id, row.id));
    return { ok: true as const, ...r };
  } catch (e) {
    const message = (e as Error).message.slice(0, 500);
    await db.update(backupRuns).set({ ok: false, finishedAt: sql`now()`, error: message }).where(eq(backupRuns.id, row.id));
    Sentry.captureException(e);
    console.warn("[backup] la copia falló:", message);
    return { ok: false as const, error: message };
  }
}

/** RF-16 y RF-17: lo que muestra el panel. */
export async function backupStatus(db: DbLike) {
  const recent = await db.select().from(backupRuns).orderBy(desc(backupRuns.startedAt), desc(backupRuns.id)).limit(10);
  const lastOk = recent.find((r) => r.ok) ?? (await db.select().from(backupRuns).where(eq(backupRuns.ok, true)).orderBy(desc(backupRuns.startedAt)).limit(1))[0] ?? null;
  const lastFailure = recent[0] && !recent[0].ok ? recent[0] : null;
  return { lastOk, lastFailure, recent };
}
