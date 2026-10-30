import "server-only";
import { cache } from "react";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { DEFAULT_THEME, type Theme } from "@/domain/ui/theme";
import { getThemeFor } from "@/server/services/theme";

/**
 * Spec 026, RF-2, RF-3, RF-7, RF-8 y RF-10: el tema de la petición, leído de la cuenta de quien tiene sesión. Se calcula
 * una vez por petición (la plantilla raíz y el viewport lo comparten). Si la base de datos falla, la web sigue en kawaii.
 */
export const requestTheme = cache(async (): Promise<Theme> => {
  try {
    return await getThemeFor(db, (await auth())?.user?.id);
  } catch {
    return DEFAULT_THEME;
  }
});
