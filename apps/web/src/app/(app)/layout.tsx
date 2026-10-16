import { headers } from "next/headers";
import { requireUser } from "@/server/auth/require-user";
import { CollectorShell } from "@/features/shell/CollectorShell";

/** Spec 010: todas las secciones del coleccionista comparten la estructura; al cambiar de sección solo cambia el contenido (RF-3). */
export default async function CollectorLayout({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-pathname") ?? "/sobres";
  const user = await requireUser(path);
  return <CollectorShell userId={user.id}>{children}</CollectorShell>;
}
