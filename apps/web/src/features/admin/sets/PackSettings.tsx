"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removePackImageAction, setCoverAction } from "@/app/admin/sets/actions";
import { PackArt, type PackArtData } from "@/features/packs/PackArt";
import { useT } from "@/i18n/client";
import { Button } from "@/ui/action/Button";
import { useToast } from "@/ui/feedback/Toast";
import { Select } from "@/ui/form/Select";

const AUTO = "auto";

/** Spec 014, RF-6 y RF-7: portada del sobre de la colección y sobre hecho a mano, con vista previa. */
export function PackSettings({
  set,
  art,
  chosenCoverId,
  cards,
}: {
  set: { id: string; code: string; name: string };
  art: PackArtData;
  chosenCoverId: string | null;
  cards: { id: string; label: string }[];
}) {
  const t = useT().admin.set.pack;
  const toast = useToast();
  const router = useRouter();
  const file = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const done = (r: { ok: boolean; message?: string; error?: string }) => {
    toast(r.ok ? { kind: "success", title: r.message ?? "" } : { kind: "error", title: r.error ?? "" });
    if (r.ok) router.refresh();
  };

  async function upload(f: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.set("setId", set.id);
      body.set("file", f);
      const res = await fetch("/api/admin/pack-image", { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      done(json.ok ? { ok: true, message: t.uploaded } : { ok: false, error: json.message ?? t.uploadFailed });
    } finally {
      setUploading(false);
      if (file.current) file.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start" data-testid="pack-settings">
      <PackArt setId={set.id} code={set.code} name={set.name} art={art} className="mx-auto w-[150px] sm:mx-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <p className="text-sm text-ui-text-2">{t.intro}</p>
        <Select
          label={t.cover}
          value={chosenCoverId ?? AUTO}
          searchable={cards.length > 8}
          options={[{ value: AUTO, label: t.coverAuto }, ...cards.map((c) => ({ value: c.id, label: c.label }))]}
          onValueChange={(v) => start(async () => done(await setCoverAction(set.id, v === AUTO ? null : v)))}
          disabled={pending}
        />
        <div className="space-y-2">
          <input
            ref={file}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            data-testid="pack-image-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" loading={uploading} onClick={() => file.current?.click()}>
              {t.upload}
            </Button>
            {art.packImage && (
              <Button variant="ghost" disabled={pending} onClick={() => start(async () => done(await removePackImageAction(set.id)))}>
                {t.remove}
              </Button>
            )}
          </div>
          <p className="text-xs text-ui-text-3">{t.uploadHint}</p>
        </div>
      </div>
    </div>
  );
}
