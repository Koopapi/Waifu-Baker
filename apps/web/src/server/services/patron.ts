// Spec 021: quién es patron (insignia, tercer espacio de expedición) y el enlace a la página de Patreon.
import { eq } from "drizzle-orm";
import { patreonLinks, users } from "@/db/schema";
import { isPatron, type MemberState } from "@/domain/patreon/membership";
import type { DbLike } from "@/server/db-types";
import { loadGrantRules } from "./membership";

export function linkAsState(link: typeof patreonLinks.$inferSelect | undefined, patreonUserId: string): MemberState | null {
  if (!link) return null;
  return {
    memberId: link.memberId,
    patreonUserId,
    patronStatus: link.patronStatus as MemberState["patronStatus"],
    lastChargeDate: link.lastChargeDate,
    lastChargeStatus: link.lastChargeStatus,
    nextChargeDate: link.nextChargeDate,
    entitledTierIds: link.entitledTierIds,
  };
}

/** RF-11 a RF-13: patron = membresía pagada y activa en un tier con reglas de sobres (según la última lectura). */
export async function isPatronUser(db: DbLike, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ link: patreonLinks, patreonUserId: users.patreonUserId })
    .from(users)
    .leftJoin(patreonLinks, eq(patreonLinks.userId, users.id))
    .where(eq(users.id, userId));
  if (!row?.link) return false;
  return isPatron(linkAsState(row.link, row.patreonUserId ?? ""), await loadGrantRules(db));
}

/** RF-9 y RF-15: la página pública de Patreon, de la configuración (misma que el contacto legal). */
export function patreonPageUrl() {
  return process.env.PATREON_PAGE_URL?.trim() || "https://www.patreon.com/WaifuBaker";
}
