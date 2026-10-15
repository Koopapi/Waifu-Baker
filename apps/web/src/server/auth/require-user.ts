import "server-only";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { users } from "@/db/schema";

/** RF-2: sin sesión (o con cuenta borrada) se va al login y luego de vuelta a `next`. */
export async function requireUser(next: string) {
  const session = await auth();
  const id = session?.user?.id;
  if (id) {
    const [u] = await db.select().from(users).where(and(eq(users.id, id), isNull(users.deletedAt)));
    if (u) return u;
  }
  redirect(`/login?next=${encodeURIComponent(next)}`);
}
