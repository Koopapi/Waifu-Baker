import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "@/db/schema";

/** Base de datos o transacción: los servicios aceptan cualquiera de las dos. */
export type DbLike = PgDatabase<PgQueryResultHKT, typeof schema>;
