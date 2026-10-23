"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeBackgroundAction } from "@/app/admin/sets/actions";
import { useAdminLayersT } from "@/i18n/admin-layers";
import { Button } from "@/ui/action/Button";
import { Card } from "@/ui/content/Card";
import { useToast } from "@/ui/feedback/Toast";
import { useConfirm } from "@/ui/overlay/Confirm";

export interface BackgroundDTO {
  id: string;
  name: string;
  url: string;
  uses: number;
}

/** Spec 017, RF-6 y RF-9: biblioteca de fondos de la colección (subir, ver y quitar los que no usa ninguna carta). */
export function BackgroundsLibrary({ setId, backgrounds }: { setId: string; backgrounds: BackgroundDTO[] }) {
  const t = useAdminLayersT().backgrounds;
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();

  async function upload(files: File[]) {
    if (!files.length) return;
    setUploading(true);
    try {
      // Uno a uno: cada fondo se acepta o se rechaza con su motivo sin parar el resto.
      for (const f of files) {
        const body = new FormData();
        body.set("file", f);
        const res = await fetch(`/api/admin/sets/${setId}/backgrounds`, { method: "POST", body });
        const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
        toast(json.ok ? { kind: "success", title: t.uploaded(f.name) } : { kind: "error", title: `${f.name}: ${json.message ?? res.status}` });
      }
      router.refresh();
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove(bg: BackgroundDTO) {
    if (!(await confirm({ title: t.remove(bg.name), body: t.confirmRemove(bg.name), confirmLabel: t.removeShort, tone: "danger" }))) return;
    start(async () => {
      const r = await removeBackgroundAction(setId, bg.id);
      toast(r.ok ? { kind: "success", title: t.removed } : { kind: "error", title: r.error ?? "" });
      if (r.ok) router.refresh();
    });
  }

  return (
    <Card
      title={t.title}
      data-testid="backgrounds-library"
      aside={
        <Button size="sm" variant="secondary" loading={uploading} onClick={() => input.current?.click()}>
          {t.upload}
        </Button>
      }
    >
      <input
        ref={input}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        data-testid="backgrounds-input"
        onChange={(e) => void upload([...(e.target.files ?? [])])}
      />
      <p className="mb-4 text-sm text-ui-text-2">{t.intro}</p>
      {backgrounds.length === 0 ? (
        <p className="text-sm text-ui-text-3">{t.empty}</p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-4">
          {backgrounds.map((bg) => (
            <li key={bg.id} className="space-y-1.5" data-testid="background-item">
              {/* eslint-disable-next-line @next/next/no-img-element -- imagen privada del panel, servida por la API */}
              <img src={bg.url} alt="" loading="lazy" className="aspect-[700/991] w-full rounded-m border border-ui-line object-cover" />
              <p className="truncate text-sm font-semibold" title={bg.name}>
                {bg.name}
              </p>
              {bg.uses > 0 ? (
                <p className="text-xs text-ui-text-3" data-testid="background-uses">
                  {t.inUse(bg.uses)}
                </p>
              ) : (
                <div className="flex items-center gap-2 text-xs text-ui-text-3">
                  <span>{t.unused}</span>
                  <Button size="sm" variant="ghost" aria-label={t.remove(bg.name)} disabled={pending} onClick={() => void remove(bg)}>
                    {t.removeShort}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
