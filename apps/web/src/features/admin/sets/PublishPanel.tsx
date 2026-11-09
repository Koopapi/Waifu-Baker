"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishSetAction } from "@/app/admin/sets/actions";
import type { Problem } from "@/domain/catalog/odds";
import { useT } from "@/i18n/client";
import { translateError } from "@/i18n/errors";
import { useAdminLayersT } from "@/i18n/admin-layers";
import { Button } from "@/ui/action/Button";
import { Alert } from "@/ui/feedback/Alert";
import { useConfirm } from "@/ui/overlay/Confirm";

// Spec 022: los problemas de la tabla gold llevan a su pestaña.
const anchor = (p: Problem) => {
  const gold = p.params?.kind === "gold";
  return p.target.kind === "card"
    ? `#carta-${String(p.target.number).padStart(3, "0")}`
    : p.target.kind === "slot"
      ? `#ranura-${gold ? "gold-" : ""}${p.target.index + 1}`
      : p.target.kind === "rarity"
        ? "#probabilidades"
        : gold
          ? "#probabilidades-gold"
          : null;
};

/** RF-6/RF-7: publicar con lista de problemas enlazados. Archivar (RF-9) vive en la zona de peligro (spec 032). */
export function PublishPanel({ setId, version, status }: { setId: string; version: number; status: "draft" | "published" | "archived" }) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const tt = useT();
  const tl = useAdminLayersT();
  // Spec 017, RF-15: el texto de las cartas sin armar vive en el diccionario del panel (no viaja al coleccionista).
  const problemText = (p: Problem) => (p.code === "card_not_assembled" ? tl.notAssembledCard(Number(p.params?.number), String(p.params?.missing ?? "")) : translateError(tt, p));
  const t = tt.admin.publish;
  const confirm = useConfirm();

  if (status === "archived") {
    return <p className="text-sm text-ui-text-3">{t.archivedNote}</p>;
  }

  return (
    <div className="space-y-3" data-testid="publish-panel">
      {status === "draft" ? (
        <Button
          variant="success"
          loading={pending}
          onClick={async () => {
            // Spec 011, RF-12: publicar fija las probabilidades para siempre.
            if (!(await confirm({ title: t.checkAndPublish, body: t.confirmPublish, confirmLabel: t.checkAndPublish }))) return;
            start(async () => {
              const r = await publishSetAction(setId, version);
              setProblems(r.problems ?? []);
              if (r.code === "stale_version") {
                // Suele ser un guardado propio que aún no había llegado a la página: se refresca sola.
                setMsg({ ok: false, text: t.stalePublish });
                router.refresh();
                return;
              }
              setMsg({ ok: r.ok, text: r.error ?? r.message ?? "" });
              if (r.ok) router.refresh();
            });
          }}
        >
          {pending ? t.checking : t.checkAndPublish}
        </Button>
      ) : (
        // Spec 032, RF-1: «Archivar» se mueve a la zona de peligro, al final de la página.
        <p className="text-sm text-ui-text-3">{t.publishedNote}</p>
      )}
      {msg && <Alert tone={msg.ok ? "success" : "danger"}>{msg.text}</Alert>}
      {problems.length > 0 && (
        <ul className="space-y-1 rounded-l border border-ui-danger/40 bg-ui-danger/5 p-3 text-sm" data-testid="publish-problems">
          {problems.map((p, i) => {
            const href = anchor(p);
            return (
              <li key={i} className="flex gap-2">
                <span className="text-ui-danger-text">•</span>
                {href ? (
                  <a href={href} className="underline decoration-ui-line underline-offset-4 hover:decoration-ui-text">
                    {problemText(p)}
                  </a>
                ) : (
                  <span>{problemText(p)}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
