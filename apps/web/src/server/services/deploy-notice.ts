// Spec 035: avisa al grupo del equipo en Telegram cuando una versión nueva ya responde, con los PR que entraron.
import { eq } from "drizzle-orm";
import { appSettings } from "@/db/schema";
import { changesFromCommits, deployMessage } from "@/domain/ops/deploy-notice";
import type { CompareCommits } from "@/server/adapters/github";
import type { DbLike } from "@/server/db-types";
import type { TelegramClient } from "@/server/ports/telegram";

const KEY = "deploy_notice";
type Stored = { commit: string; at: string };

export type DeployNoticeResult = "sent" | "same_version" | "no_changes" | "not_configured" | "send_failed";

/**
 * RF-1, RF-2, RF-6, RF-8, RF-10 y RF-11. Primero reserva la versión (fila bloqueada): dos arranques a la vez o un
 * reinicio no avisan dos veces. Después lee los cambios y envía; si algo falla, lo anota y la web sigue igual.
 */
export async function notifyDeploy(input: { db: DbLike; telegram: TelegramClient | null; compare: CompareCommits; commit: string | undefined; siteUrl: string; now?: Date }): Promise<DeployNoticeResult> {
  const { db, telegram, compare, commit, siteUrl } = input;
  const now = input.now ?? new Date();
  if (!commit || !telegram?.teamChatId) {
    console.warn("[aviso de despliegue] sin commit (SOURCE_COMMIT) o sin bot y grupo de Telegram: no se avisa");
    return "not_configured";
  }
  const previous = await db.transaction(async (tx) => {
    await tx.insert(appSettings).values({ key: KEY, value: {} }).onConflictDoNothing();
    const [row] = await tx.select().from(appSettings).where(eq(appSettings.key, KEY)).for("update");
    const stored = row.value as Partial<Stored>;
    if (stored.commit === commit) return { same: true as const };
    await tx.update(appSettings).set({ value: { commit, at: now.toISOString() } satisfies Stored, updatedAt: now }).where(eq(appSettings.key, KEY));
    return { same: false as const, commit: stored.commit };
  });
  if (previous.same) return "same_version";

  let text: string;
  if (!previous.commit) text = deployMessage({ siteUrl, at: now, changes: [], first: true });
  else {
    try {
      const changes = changesFromCommits(await compare(previous.commit, commit), commit);
      if (!changes.length) return "no_changes";
      text = deployMessage({ siteUrl, at: now, changes });
    } catch (e) {
      console.warn("[aviso de despliegue] no se pudo leer la lista de cambios:", (e as Error).message);
      text = deployMessage({ siteUrl, at: now, changes: [], listFailed: true });
    }
  }
  try {
    await telegram.sendMessage(telegram.teamChatId, text);
    return "sent";
  } catch (e) {
    console.warn("[aviso de despliegue] no se pudo enviar a Telegram:", (e as Error).message);
    return "send_failed";
  }
}
