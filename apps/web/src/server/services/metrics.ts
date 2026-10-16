import { count, eq, sql } from "drizzle-orm";
import { albums } from "@/db/schema";
import type { DbLike } from "@/server/db-types";

export interface DayMetrics {
  day: string;
  newUsers: number;
  activeUsers: number;
  packsOpened: number;
  freeClaims: number;
  dailyClaims: number;
}

/**
 * Spec 007, RF-11 y RF-12: métricas por día (UTC) de los últimos 30 días, solo con datos propios.
 * Los álbumes públicos activos son el total actual: no hay histórico de altas y bajas.
 */
export async function dailyMetrics(db: DbLike, now = new Date(), days = 30) {
  const to = now.toISOString().slice(0, 10);
  const rows = (await db.execute(sql`
    with d as (
      select generate_series((${to}::date - (${days - 1})::int), ${to}::date, interval '1 day')::date as day
    )
    select
      to_char(d.day, 'YYYY-MM-DD') as day,
      (select count(*) from users u where (u.created_at at time zone 'UTC')::date = d.day and u.purged_at is null)::int as "newUsers",
      (select count(*) from user_days a where a.day = d.day)::int as "activeUsers",
      (select count(*) from pack_openings o where (o.opened_at at time zone 'UTC')::date = d.day)::int as "packsOpened",
      (select count(*) from packs p where p.source = 'free' and (p.granted_at at time zone 'UTC')::date = d.day)::int as "freeClaims",
      ((select count(*) from cookie_ledger c where c.reason like 'daily:%' and (c.created_at at time zone 'UTC')::date = d.day)
        + (select count(*) from packs p where p.source = 'daily' and (p.granted_at at time zone 'UTC')::date = d.day))::int as "dailyClaims"
    from d
    order by d.day desc
  `)) as unknown as DayMetrics[];
  const [{ n }] = await db.select({ n: count() }).from(albums).where(eq(albums.isPublic, true));
  const totals = rows.reduce(
    (a, r) => ({
      newUsers: a.newUsers + r.newUsers,
      packsOpened: a.packsOpened + r.packsOpened,
      freeClaims: a.freeClaims + r.freeClaims,
      dailyClaims: a.dailyClaims + r.dailyClaims,
    }),
    { newUsers: 0, packsOpened: 0, freeClaims: 0, dailyClaims: 0 },
  );
  return { days: rows, totals, activeAlbums: n };
}
