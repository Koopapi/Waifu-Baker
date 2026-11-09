"use client";

import { Suspense, lazy, useState } from "react";
import { useT } from "@/i18n/client";
import { Button } from "@/ui/action/Button";
import { Card } from "@/ui/content/Card";
import { ArchiveButton } from "./ArchiveButton";
// El aviso (con el formulario y los motivos) solo se descarga al pulsar «Eliminar colección» (presupuesto de la spec 031).
const DeleteSetDialog = lazy(() => import("./DeleteSetDialog").then((m) => ({ default: m.DeleteSetDialog })));

/** Spec 032, RF-1: al final de la página de una colección, archivar (si está publicada) y eliminar. */
export function DangerZone({ setId, code, version, status }: { setId: string; code: string; version: number; status: "draft" | "published" | "archived" }) {
  const t = useT().admin.deleteSet;
  const [open, setOpen] = useState(false);
  return (
    <Card className="space-y-3 border-ui-danger/40" title={t.zoneTitle} data-testid="danger-zone">
      <p className="text-sm text-ui-text-3">{t.zoneNote}</p>
      <div className="flex flex-wrap items-start gap-3">
        {status === "published" && <ArchiveButton setId={setId} version={version} />}
        <Button variant="danger" onClick={() => setOpen(true)} data-testid="delete-set-open">
          {t.open}
        </Button>
      </div>
      {open && (
        <Suspense fallback={null}>
          <DeleteSetDialog setId={setId} code={code} version={version} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </Card>
  );
}
