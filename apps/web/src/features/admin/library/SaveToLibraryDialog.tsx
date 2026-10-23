"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveToLibraryAction } from "@/app/admin/library/actions";
import type { ParticleLayer } from "@/domain/cards/layers";
import type { LibraryImageKind } from "@/domain/cards/library";
import { useAdminLayersT } from "@/i18n/admin-layers";
import { Button } from "@/ui/action/Button";
import { Alert } from "@/ui/feedback/Alert";
import { useToast } from "@/ui/feedback/Toast";
import { Select } from "@/ui/form/Select";
import { TextField } from "@/ui/form/TextField";
import { Modal } from "@/ui/overlay/Modal";

/** Lo que se guarda: una imagen de la carta (capa del lienzo o sello) o unas partículas. */
export type SaveTarget = { kind: LibraryImageKind; key: string; name: string } | { kind: "particulas"; particles: ParticleLayer; name: string };

/**
 * Spec 017 (ampliación), RF-21: «Guardar en la biblioteca» un fondo, un sello, un adorno o unas partículas de la carta.
 * Una capa del lienzo se puede guardar como fondo o como adorno; la carta no cambia.
 */
export function SaveToLibraryDialog({ target, onClose }: { target: SaveTarget | null; onClose: () => void }) {
  const t = useAdminLayersT();
  const toast = useToast();
  const router = useRouter();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<SaveTarget["kind"]>("adorno");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!target) return;
    setName(target.name);
    setKind(target.kind);
    setError(null);
  }, [target]);

  const canvasImage = target && (target.kind === "fondo" || target.kind === "adorno");

  return (
    <Modal open={Boolean(target)} onOpenChange={(o) => !o && onClose()} title={t.pick.saveTitle} description={t.pick.saveHint} size="md" testId="save-to-library" closeLabel={t.pick.cancel}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!target) return;
          start(async () => {
            const r = await saveToLibraryAction(target.kind === "particulas" ? { kind: "particulas", particles: target.particles, name } : { kind: kind as LibraryImageKind, key: target.key, name });
            if (!r.ok) {
              setError(r.error ?? "");
              return;
            }
            toast({ kind: "success", title: t.pick.saved(name.trim()) });
            router.refresh();
            onClose();
          });
        }}
      >
        <TextField label={t.library.nameLabel} value={name} maxLength={60} autoFocus onChange={(e) => setName(e.target.value)} data-testid="save-to-library-name" />
        {canvasImage && (
          <Select
            label={t.pick.kind}
            value={kind}
            onValueChange={(v) => setKind(v as LibraryImageKind)}
            options={(["fondo", "adorno"] as const).map((k) => ({ value: k, label: t.library.kinds[k] }))}
          />
        )}
        {error && <Alert tone="danger">{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t.pick.cancel}
          </Button>
          <Button type="submit" loading={pending} data-testid="save-to-library-submit">
            {t.pick.save}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
