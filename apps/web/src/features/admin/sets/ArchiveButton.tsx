"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveSetAction } from "@/app/admin/sets/actions";
import { useT } from "@/i18n/client";
import { Button } from "@/ui/action/Button";
import { Alert } from "@/ui/feedback/Alert";
import { useConfirm } from "@/ui/overlay/Confirm";

/** Spec 003, RF-9: archivar una colección publicada (desde la spec 032, en la zona de peligro). */
export function ArchiveButton({ setId, version, onArchived }: { setId: string; version: number; onArchived?: () => void }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const t = useT().admin.publish;
  const confirm = useConfirm();
  return (
    <div className="space-y-2">
      <Button
        variant="secondary"
        loading={pending}
        data-testid="archive-set"
        onClick={async () => {
          if (!(await confirm({ title: t.archive, body: t.confirmArchive, confirmLabel: t.archive, tone: "danger" }))) return;
          start(async () => {
            const r = await archiveSetAction(setId, version);
            if (r.code === "stale_version") {
              setMsg({ ok: false, text: t.staleArchive });
              router.refresh();
              return;
            }
            setMsg({ ok: r.ok, text: r.error ?? r.message ?? "" });
            if (r.ok) {
              onArchived?.();
              router.refresh();
            }
          });
        }}
      >
        {t.archive}
      </Button>
      {msg && <Alert tone={msg.ok ? "success" : "danger"}>{msg.text}</Alert>}
    </div>
  );
}
