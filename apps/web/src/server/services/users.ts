import { sql } from "drizzle-orm";
import { users } from "@/db/schema";
import type { Role } from "@/domain/auth/access";
import type { DbLike } from "@/server/db-types";

/** Crea o actualiza el usuario al iniciar sesión. El rol se recalcula siempre (RF-1). */
export async function upsertUserFromLogin(
  db: DbLike,
  input: { patreonUserId: string; displayName: string; avatarUrl?: string | null; role: Role },
) {
  const [row] = await db
    .insert(users)
    .values({
      patreonUserId: input.patreonUserId,
      displayName: input.displayName,
      avatarUrl: input.avatarUrl ?? null,
      role: input.role,
    })
    .onConflictDoUpdate({
      target: users.patreonUserId,
      set: {
        displayName: input.displayName,
        avatarUrl: input.avatarUrl ?? null,
        role: input.role,
        updatedAt: sql`now()`,
      },
    })
    .returning();
  return row;
}
