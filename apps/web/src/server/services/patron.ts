// Spec 021: quién es patron (insignia, tercer espacio de expedición) y el enlace a la página de Patreon.
import { eq } from "drizzle-orm";
import { patreonLinks } from "@/db/schema";
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

/**
 * RF-11 a RF-13: patron = membresía pagada y activa en un tier con reglas de sobres (según la última lectura). Se lee
 * solo el estado de la membresía: en desarrollo, React incluye en la página lo que esperan los componentes de servidor,
 * y esto se llama desde el álbum público (spec 006, RF-14: ahí no puede salir el nombre de la cuenta).
 */
export async function isPatronUser(db: DbLike, userId: string): Promise<boolean> {
  const [link] = await db
    .select({
      patronStatus: patreonLinks.patronStatus,
      lastChargeDate: patreonLinks.lastChargeDate,
      lastChargeStatus: patreonLinks.lastChargeStatus,
      nextChargeDate: patreonLinks.nextChargeDate,
      entitledTierIds: patreonLinks.entitledTierIds,
    })
    .from(patreonLinks)
    .where(eq(patreonLinks.userId, userId));
  if (!link) return false;
  return isPatron({ memberId: null, patreonUserId: "", ...link, patronStatus: link.patronStatus as MemberState["patronStatus"] }, await loadGrantRules(db));
}

/** RF-9 y RF-15: la página pública de Patreon, de la configuración (misma que el contacto legal). */
export function patreonPageUrl() {
  return process.env.PATREON_PAGE_URL?.trim() || "https://www.patreon.com/WaifuBaker";
}
