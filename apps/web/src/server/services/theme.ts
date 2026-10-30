import "server-only";
import { eq, sql } from "drizzle-orm";
import { users } from "@/db/schema";
import { DEFAULT_THEME, isTheme, parseTheme, type Theme } from "@/domain/ui/theme";
import { AdminError } from "@/server/errors";
import type { DbLike } from "@/server/db-types";

/** Spec 026, RF-2, RF-3 y RF-7: el tema guardado en la cuenta; sin usuario (o sin cuenta), el kawaii. */
export async function getThemeFor(db: DbLike, userId: string | null | undefined): Promise<Theme> {
  if (!userId) return DEFAULT_THEME;
  const [u] = await db.select({ theme: users.theme }).from(users).where(eq(users.id, userId));
  return parseTheme(u?.theme);
}

/** Spec 026, RF-6: guarda en la cuenta el tema que eligió el usuario. */
export async function setTheme(db: DbLike, userId: string, theme: unknown): Promise<Theme> {
  if (!isTheme(theme)) throw new AdminError("invalid_theme", "Tema desconocido.");
  await db.update(users).set({ theme, updatedAt: sql`now()` }).where(eq(users.id, userId));
  return theme;
}
