import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { albums, users } from "@/db/schema";
import { HideAlbumForm, ReviewDecision } from "@/features/admin/albums/ModerationForms";
import { formatDateTime } from "@/i18n/format";
import { getDict, getLocale } from "@/i18n/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { albumHistory } from "@/server/services/moderation";
import { Badge } from "@/ui/content/Badge";
import { Card } from "@/ui/content/Card";
import { Alert } from "@/ui/feedback/Alert";

/** Spec 012, RF-3, RF-4, RF-11 y RF-12: ficha de moderación de un álbum. */
export default async function AlbumModerationPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!z.string().uuid().safeParse(userId).success) notFound();
  await requireAdmin(`/admin/albumes/${userId}`);
  const [[row], history, tt, locale] = await Promise.all([
    db.select({ album: albums, owner: users.displayName }).from(albums).innerJoin(users, eq(users.id, albums.userId)).where(eq(albums.userId, userId)),
    albumHistory(db, userId),
    getDict(),
    getLocale(),
  ]);
  if (!row) notFound();
  const a = row.album;
  const t = tt.admin.albums;
  const reasons = tt.collection.album.moderation.reasons;
  const tone = { none: "success", hidden: "danger", review_requested: "warning", review_rejected: "danger" } as const;
  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-2">
        <Link href="/admin/albumes" className="text-sm text-ui-text-3 hover:text-ui-text">
          {t.back}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{t.detailTitle(a.alias)}</h1>
          <Badge tone={tone[a.moderation]}>{t.status[a.moderation]}</Badge>
        </div>
        <p className="text-sm text-ui-text-2">
          {row.owner} ·{" "}
          <a href={`/album/${a.slug}`} target="_blank" rel="noreferrer" className="text-ui-accent-text underline underline-offset-4">
            /album/{a.slug}
          </a>
        </p>
      </div>

      {a.moderation !== "none" && a.hiddenReason && (
        <Alert tone="danger" title={reasons[a.hiddenReason as keyof typeof reasons] ?? a.hiddenReason}>
          {a.hiddenNote}
        </Alert>
      )}

      {a.moderation === "none" && a.isPublic && (
        <Card title={t.hide}>
          <HideAlbumForm userId={a.userId} alias={a.alias} />
        </Card>
      )}

      {a.moderation === "review_requested" && (
        <Card title={t.reviewTitle} aside={t.proposedAlias(a.reviewAlias ?? "")}>
          <ReviewDecision userId={a.userId} />
        </Card>
      )}

      <Card title={t.history}>
        {history.length === 0 ? (
          <p className="text-sm text-ui-text-3">{t.noHistory}</p>
        ) : (
          <ol className="space-y-3" data-testid="moderation-history">
            {history.map((h, i) => (
              <li key={i} className="border-l-2 border-ui-line pl-3 text-sm">
                <p className="font-semibold">
                  {t.actions[h.action as keyof typeof t.actions] ?? h.action} · <span className="font-normal text-ui-text-3">{formatDateTime(locale, h.at)} · {h.actor}</span>
                </p>
                {h.reason && <p className="text-ui-text-2">{reasons[h.reason as keyof typeof reasons] ?? h.reason}</p>}
                {h.aliasBefore && h.aliasAfter && <p className="text-ui-text-2">{t.aliasChange(h.aliasBefore, h.aliasAfter)}</p>}
                {h.note && <p className="text-ui-text-2">{t.quotedNote(h.note)}</p>}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
