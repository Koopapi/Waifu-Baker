import Link from "next/link";
import { db } from "@/db/client";
import { formatDate } from "@/i18n/format";
import { getDict, getLocale } from "@/i18n/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { listAlbumsForAdmin } from "@/server/services/moderation";
import { Button } from "@/ui/action/Button";
import { Badge } from "@/ui/content/Badge";
import { Table } from "@/ui/content/Table";
import { EmptyState } from "@/ui/feedback/EmptyState";
import { TextField } from "@/ui/form/TextField";

export async function generateMetadata() {
  return { title: (await getDict()).admin.albums.title };
}

const TONE = { none: "success", hidden: "danger", review_requested: "warning", review_rejected: "danger" } as const;

/** Spec 012, RF-1 y RF-2: álbumes públicos y ocultos, con los pendientes de revisión primero. */
export default async function AlbumesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin("/admin/albumes");
  const { q = "" } = await searchParams;
  const [rows, tt, locale] = await Promise.all([listAlbumsForAdmin(db, { q }), getDict(), getLocale()]);
  const t = tt.admin.albums;
  return (
    <div className="max-w-5xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="text-sm text-ui-text-2">{t.intro}</p>
      </div>
      <form className="flex items-end gap-3" role="search">
        <TextField name="q" defaultValue={q} label={t.searchAria} hideLabel placeholder={t.searchPlaceholder} fieldClassName="flex-1" />
        <Button type="submit">{t.search}</Button>
      </form>
      {rows.length === 0 ? (
        <EmptyState title={q ? t.noMatch(q) : t.empty} />
      ) : (
        <div data-testid="albums-table">
          <Table
            caption={t.title}
            columns={[
              {
                key: "alias",
                header: t.th.alias,
                render: (r) => (
                  <Link href={`/admin/albumes/${r.userId}`} className="font-medium underline decoration-ui-line underline-offset-4 hover:decoration-ui-text">
                    {r.alias}
                  </Link>
                ),
              },
              { key: "owner", header: t.th.owner },
              { key: "moderation", header: t.th.status, render: (r) => <Badge tone={TONE[r.moderation]}>{t.status[r.moderation]}</Badge> },
              { key: "activatedAt", header: t.th.activated, render: (r) => (r.activatedAt ? formatDate(locale, r.activatedAt, "medium") : "—") },
              {
                key: "slug",
                header: t.th.link,
                render: (r) => (
                  <a href={`/album/${r.slug}`} target="_blank" rel="noreferrer" className="text-ui-accent-text underline underline-offset-4">
                    {t.open}
                  </a>
                ),
              },
            ]}
            rows={rows.map((r) => ({ ...r, id: r.userId }))}
          />
        </div>
      )}
    </div>
  );
}
