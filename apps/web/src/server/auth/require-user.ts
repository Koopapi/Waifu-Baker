import "server-only";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { getPatreonClient } from "@/server/patreon/client-instance";
import { refreshIfStale } from "@/server/services/membership";

/** RF-2: sin sesión (o con cuenta borrada) se va al login y luego de vuelta a `next`. */
export async function requireUser(next: string) {
  const session = await auth();
  const id = session?.user?.id;
  if (id) {
    const [u] = await db.select().from(users).where(and(eq(users.id, id), isNull(users.deletedAt)));
    if (u) {
      // Spec 001, RF-3: membresía al día si la última lectura tiene más de 15 minutos.
      await refreshIfStale(db, getPatreonClient().client, u.id);
      return u;
    }
  }
  redirect(`/login?next=${encodeURIComponent(next)}`);
}
