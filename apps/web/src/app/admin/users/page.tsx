import Link from "next/link";
import { db } from "@/db/client";
import { searchUsers } from "@/server/services/users-admin";
import { Button } from "@/ui/action/Button";
import { Badge } from "@/ui/content/Badge";
import { Table } from "@/ui/content/Table";
import { EmptyState } from "@/ui/feedback/EmptyState";
import { TextField } from "@/ui/form/TextField";
import { getDict, getLocale } from "@/i18n/server";
import { formatDate } from "@/i18n/format";

/** RF-27: búsqueda de usuarios por nombre o id de Patreon. */
export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const rows = await searchUsers(db, q);
  const tt = await getDict();
  const t = tt.admin.users;
  const locale = await getLocale();
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <form className="flex items-end gap-3" role="search">
        <TextField name="q" defaultValue={q} placeholder={t.searchPlaceholder} label={t.searchAria} hideLabel fieldClassName="flex-1" />
        <Button type="submit">{t.search}</Button>
      </form>
      {rows.length === 0 ? (
        <EmptyState title={q ? t.noMatch(q) : t.empty} />
      ) : (
        <Table
          caption={t.title}
          columns={[
            {
              key: "displayName",
              header: t.th.name,
              render: (u) => (
                <>
                  <Link href={`/admin/users/${u.id}`} className="underline decoration-ui-line underline-offset-4 hover:decoration-ui-text">
                    {u.displayName || tt.admin.noName}
                  </Link>
                  {u.deletedAt && (
                    <Badge tone="danger" className="ml-2">
                      {t.deletedBadge}
                    </Badge>
                  )}
                </>
              ),
            },
            { key: "patreonUserId", header: t.th.patreon, render: (u) => <span className="font-mono text-xs text-ui-text-2">{u.patreonUserId}</span> },
            { key: "role", header: t.th.role, render: (u) => (u.role === "admin" ? t.admin : t.user) },
            { key: "adultVerifiedAt", header: t.th.ageVerified, render: (u) => (u.isAdultDeclared && u.adultVerifiedAt ? t.yes : t.no) },
            { key: "createdAt", header: t.th.joined, render: (u) => <span className="text-ui-text-2">{formatDate(locale, u.createdAt, "medium")}</span> },
          ]}
          rows={rows}
        />
      )}
    </div>
  );
}
