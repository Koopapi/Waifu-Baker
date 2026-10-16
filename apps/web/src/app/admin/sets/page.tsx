import Link from "next/link";
import { db } from "@/db/client";
import { listSets } from "@/server/services/collections";
import { AdultBadge, StatusBadge } from "@/features/admin/ui";
import { getDict } from "@/i18n/server";
import { Badge } from "@/ui/content/Badge";
import { Table } from "@/ui/content/Table";
import { EmptyState } from "@/ui/feedback/EmptyState";
import { CreateSetForm } from "./forms";

export default async function SetsPage() {
  const rows = await listSets(db);
  const tt = await getDict();
  const t = tt.admin.sets;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <CreateSetForm />
      {rows.length === 0 ? (
        <EmptyState title={t.empty} />
      ) : (
        <Table
          caption={t.title}
          columns={[
            {
              key: "code",
              header: t.th.code,
              render: (r) => (
                <Link className="font-mono underline decoration-ui-line underline-offset-4 hover:decoration-ui-text" href={`/admin/sets/${r.id}`}>
                  {r.code}
                </Link>
              ),
            },
            { key: "name", header: t.th.name },
            { key: "isAdult", header: t.th.type, render: (r) => <AdultBadge adult={r.isAdult} /> },
            {
              key: "status",
              header: t.th.status,
              render: (r) => (
                <span className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={r.status} />
                  {r.isWelcome && (
                    <span data-testid="welcome-badge">
                      <Badge tone="success">{tt.admin.set.welcome.badge}</Badge>
                    </span>
                  )}
                </span>
              ),
            },
            { key: "cardCount", header: t.th.cards, align: "end" },
            { key: "packSize", header: t.th.perPack, align: "end" },
          ]}
          rows={rows}
        />
      )}
    </div>
  );
}
