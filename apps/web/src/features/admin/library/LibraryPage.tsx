"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeLibraryItemAction, renameLibraryItemAction } from "@/app/admin/library/actions";
import type { LibraryKind } from "@/domain/cards/library";
import type { ParticlePreset } from "@/domain/cards/library";
import { useAdminLayersT } from "@/i18n/admin-layers";
import { Button, IconButton } from "@/ui/action/Button";
import { Tabs } from "@/ui/content/Tabs";
import { useToast } from "@/ui/feedback/Toast";
import { TextField } from "@/ui/form/TextField";
import { Pencil } from "@/ui/icons/admin-glyphs";
import { useConfirm } from "@/ui/overlay/Confirm";

export interface LibraryItemDTO {
  id: string;
  kind: LibraryKind;
  name: string;
  /** Enlace privado del panel a la imagen (null en las partículas). */
  url: string | null;
  particles: ParticlePreset | null;
  uses: number;
  sets: string[];
}

const KINDS: LibraryKind[] = ["fondo", "sello", "adorno", "particulas"];

/** Spec 017 (ampliación), RF-6 y RF-9: la biblioteca general, con una pestaña por tipo. */
export function LibraryPage({ items }: { items: LibraryItemDTO[] }) {
  const t = useAdminLayersT().library;
  const [tab, setTab] = useState<LibraryKind>("fondo");
  const router = useRouter();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(files: File[]) {
    if (!files.length || tab === "particulas") return;
    setUploading(true);
    try {
      // Uno a uno: cada archivo se acepta o se rechaza con su motivo sin parar el resto.
      for (const f of files) {
        const body = new FormData();
        body.set("kind", tab);
        body.set("file", f);
        const res = await fetch("/api/admin/library", { method: "POST", body });
        const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
        toast(json.ok ? { kind: "success", title: t.uploaded(f.name) } : { kind: "error", title: `${f.name}: ${json.message ?? res.status}` });
      }
      router.refresh();
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="space-y-5" data-testid="library-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="max-w-3xl text-sm text-ui-text-3">{t.intro}</p>
        </div>
        {tab !== "particulas" && (
          <Button loading={uploading} onClick={() => input.current?.click()} data-testid="library-upload-button">
            {t.upload[tab]}
          </Button>
        )}
        <input ref={input} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" data-testid="library-input" onChange={(e) => void upload([...(e.target.files ?? [])])} />
      </div>
      <Tabs
        label={t.title}
        value={tab}
        onValueChange={(v) => setTab(v as LibraryKind)}
        items={KINDS.map((kind) => {
          const list = items.filter((i) => i.kind === kind);
          return {
            value: kind,
            label: (
              <span className="inline-flex items-center gap-2" data-testid={`library-tab-${kind}`}>
                {t.kinds[kind]}
                <span className="rounded-full bg-ui-hover px-2 text-xs font-bold tabular-nums">{list.length}</span>
              </span>
            ),
            content: (
              <div className="space-y-4">
                <p className="text-sm text-ui-text-3">{t.rules[kind]}</p>
                {list.length === 0 ? (
                  <p className="text-sm text-ui-text-3">{t.empty}</p>
                ) : kind === "particulas" ? (
                  <ul className="space-y-2">
                    {list.map((i) => (
                      <LibraryRow key={i.id} item={i} />
                    ))}
                  </ul>
                ) : (
                  <ul className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
                    {list.map((i) => (
                      <LibraryTile key={i.id} item={i} />
                    ))}
                  </ul>
                )}
              </div>
            ),
          };
        })}
      />
    </div>
  );
}

/** Nombre del elemento, con el lápiz para renombrarlo ahí mismo. */
function ItemName({ item }: { item: LibraryItemDTO }) {
  const t = useAdminLayersT().library;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  if (!editing) {
    return (
      <div className="flex min-w-0 items-center justify-between gap-1">
        <p className="truncate text-sm font-semibold" title={item.name} data-testid="library-item-name">
          {item.name}
        </p>
        <IconButton label={t.rename(item.name)} size="sm" variant="ghost" onClick={() => setEditing(true)}>
          <Pencil className="size-4" aria-hidden />
        </IconButton>
      </div>
    );
  }
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await renameLibraryItemAction(item.id, name);
          toast(r.ok ? { kind: "success", title: t.renamed } : { kind: "error", title: r.error ?? "" });
          if (r.ok) {
            setEditing(false);
            router.refresh();
          }
        });
      }}
    >
      <TextField label={t.nameLabel} value={name} maxLength={60} autoFocus onChange={(e) => setName(e.target.value)} data-testid="library-rename-input" />
      <div className="flex gap-2">
        <Button size="sm" type="submit" loading={pending}>
          {t.save}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}

/** RF-9: dónde se usa o, si nadie lo usa, el botón para quitarlo. */
function ItemUse({ item }: { item: LibraryItemDTO }) {
  const t = useAdminLayersT().library;
  const confirm = useConfirm();
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  if (item.uses > 0) {
    return (
      <p className="text-xs text-ui-text-3" data-testid="library-item-uses">
        {t.inUse(item.uses, item.sets.join(", "))}
      </p>
    );
  }
  const remove = async () => {
    if (!(await confirm({ title: t.remove(item.name), body: t.confirmRemove(item.name), confirmLabel: t.removeShort, tone: "danger" }))) return;
    start(async () => {
      const r = await removeLibraryItemAction(item.id);
      toast(r.ok ? { kind: "success", title: t.removed } : { kind: "error", title: r.error ?? "" });
      if (r.ok) router.refresh();
    });
  };
  return (
    <div className="flex items-center gap-2 text-xs text-ui-text-3">
      {item.kind !== "particulas" && <span>{t.unused}</span>}
      <Button size="sm" variant="ghost" aria-label={t.remove(item.name)} disabled={pending} onClick={() => void remove()}>
        {t.removeShort}
      </Button>
    </div>
  );
}

function LibraryTile({ item }: { item: LibraryItemDTO }) {
  return (
    <li className="space-y-1.5 rounded-l border border-ui-line bg-ui-nav p-2" data-testid="library-item">
      {/* eslint-disable-next-line @next/next/no-img-element -- imagen privada del panel, servida por la API */}
      <img
        src={item.url ?? ""}
        alt=""
        loading="lazy"
        className={item.kind === "sello" ? "h-28 w-full rounded-m bg-ui-rail object-contain p-3" : "aspect-[700/991] w-full rounded-m bg-ui-rail object-cover"}
      />
      <ItemName item={item} />
      <ItemUse item={item} />
    </li>
  );
}

function LibraryRow({ item }: { item: LibraryItemDTO }) {
  const t = useAdminLayersT().library;
  const p = item.particles;
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-l border border-ui-line bg-ui-nav px-3 py-2" data-testid="library-item">
      <span aria-hidden className="size-7 shrink-0 rounded-full border border-ui-line" style={{ background: p?.color ?? "var(--ui-k-lavanda)" }} />
      <div className="min-w-0 flex-1">
        <ItemName item={item} />
        {p && <p className="text-xs text-ui-text-3">{t.particles(p.particulas, p.cantidad ?? 40)}</p>}
      </div>
      <ItemUse item={item} />
    </li>
  );
}
