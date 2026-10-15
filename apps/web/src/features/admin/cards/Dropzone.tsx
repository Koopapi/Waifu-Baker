"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";
import type { Dict } from "@/i18n";

type Item = { id: string; name: string; status: "queued" | "uploading" | "ok" | "error"; progress: number; message?: string };

// Una a una y en orden de nombre: así la numeración sigue el orden de los archivos (RF-15).
const PARALLEL = 1;
const byName = new Intl.Collator("es", { numeric: true, sensitivity: "base" });
const ACCEPT = "image/png,image/jpeg,image/webp";

function uploadOne(t: Dict["admin"], setId: string, file: File, onProgress: (p: number) => void): Promise<{ ok: boolean; message?: string; number?: number }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append("setId", setId);
    fd.append("file", file);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        resolve(body.ok ? { ok: true, number: body.card.number } : { ok: false, message: body.message });
      } catch {
        resolve({ ok: false, message: xhr.status === 404 ? t.upload.sessionExpired : t.serverError(xhr.status) });
      }
    };
    xhr.onerror = () => resolve({ ok: false, message: t.upload.connectionLost });
    xhr.open("POST", "/api/admin/uploads");
    xhr.send(fd);
  });
}

/** RF-11: zona de arrastre con cola, 3 subidas en paralelo y estado por archivo. */
export function Dropzone({ setId, disabled }: { setId: string; disabled: boolean }) {
  const [items, setItems] = useState<Item[]>([]);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const t = useT().admin;
  const busy = items.some((i) => i.status === "queued" || i.status === "uploading");

  const patch = (id: string, p: Partial<Item>) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...p } : i)));

  async function enqueue(files: File[]) {
    if (!files.length) return;
    const sorted = [...files].sort((a, b) => byName.compare(a.name, b.name));
    const batch = sorted.map((f) => ({ file: f, item: { id: crypto.randomUUID(), name: f.name, status: "queued" as const, progress: 0 } }));
    setItems((list) => [...list, ...batch.map((b) => b.item)]);
    let next = 0;
    const worker = async () => {
      while (next < batch.length) {
        const { file, item } = batch[next++];
        patch(item.id, { status: "uploading" });
        const r = await uploadOne(t, setId, file, (progress) => patch(item.id, { progress }));
        patch(item.id, r.ok ? { status: "ok", progress: 100, message: t.cards.cardN(String(r.number).padStart(3, "0")) } : { status: "error", message: r.message });
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, batch.length) }, worker));
    router.refresh();
  }

  if (disabled) {
    return <p className="rounded-xl border border-white/10 p-4 text-sm text-white/50">{t.upload.locked}</p>;
  }

  const done = items.filter((i) => i.status === "ok").length;
  const failed = items.filter((i) => i.status === "error").length;

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void enqueue([...e.dataTransfer.files].filter((f) => ACCEPT.includes(f.type) || f.type.startsWith("image/")));
        }}
        onClick={() => input.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${over ? "border-[#d6b370] bg-[#d6b370]/10" : "border-white/15 hover:border-white/30"}`}
      >
        <p className="font-semibold">{t.upload.dropHere}</p>
        <p className="mt-1 text-sm text-white/50">{t.upload.hint}</p>
        <input
          ref={input}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          data-testid="file-input"
          onChange={(e) => {
            void enqueue([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
      </div>
      {items.length > 0 && (
        <div className="rounded-xl border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs text-white/60">
            <span>
              {busy ? t.upload.uploading : t.upload.finished} · {t.upload.summary(done, failed)}
            </span>
            {!busy && (
              <button className="underline" onClick={() => setItems([])}>
                {t.upload.clear}
              </button>
            )}
          </div>
          <ul className="max-h-56 divide-y divide-white/5 overflow-y-auto text-sm" data-testid="upload-list">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 px-4 py-2">
                <span className="w-5 text-center">{i.status === "ok" ? "✓" : i.status === "error" ? "✕" : "…"}</span>
                <span className="min-w-0 flex-1 truncate">{i.name}</span>
                {i.status === "uploading" && (
                  <span className="h-1.5 w-28 overflow-hidden rounded bg-white/10">
                    <span className="block h-full bg-[#d6b370]" style={{ width: `${i.progress}%` }} />
                  </span>
                )}
                {i.message && <span className={`text-xs ${i.status === "error" ? "text-red-300" : "text-white/50"}`}>{i.message}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
