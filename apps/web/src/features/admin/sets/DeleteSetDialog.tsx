"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSetAction, setDeletionInfoAction } from "@/app/admin/sets/actions";
import { matchesCode } from "@/domain/catalog/set-deletion";
import type { SetDeletionInfo } from "@/server/services/set-deletion";
import { useT } from "@/i18n/client";
import { Button } from "@/ui/action/Button";
import { Alert } from "@/ui/feedback/Alert";
import { useToast } from "@/ui/feedback/Toast";
import { TextField } from "@/ui/form/TextField";
import { LoaderCircle } from "@/ui/icons/glyphs";
import { Modal } from "@/ui/overlay/Modal";
import { ArchiveButton } from "./ArchiveButton";
import { DeletionBlockerList } from "./DeletionBlockerList";

type State = { phase: "loading" } | { phase: "error" } | { phase: "ready"; info: SetDeletionInfo };

/**
 * Spec 032, RF-2 a RF-6 y RF-9 a RF-14: el aviso para eliminar una colección. Pide la información al abrirse (siempre
 * al día) y, si no se puede eliminar, dice por qué con enlaces y sin el campo del código.
 */
export function DeleteSetDialog({ setId, code, version, onClose }: { setId: string; code: string; version: number; onClose: () => void }) {
  const tt = useT();
  const t = tt.admin.deleteSet;
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState<State>({ phase: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let live = true;
    setState({ phase: "loading" });
    setDeletionInfoAction(setId).then(
      (r) => {
        if (!live) return;
        if (r.code === "not_found") return gone();
        setState(r.ok && r.info ? { phase: "ready", info: r.info } : { phase: "error" });
      },
      () => live && setState({ phase: "error" }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `gone` solo navega
  }, [setId, attempt]);

  function gone() {
    toast({ kind: "error", title: t.gone });
    router.push("/admin/sets");
  }

  const remove = () =>
    start(async () => {
      setError(null);
      const r = await deleteSetAction(setId, typed);
      if (r.ok) {
        // RF-6: de vuelta a «Sets» con el aviso del código eliminado.
        toast({ kind: "success", title: r.message ?? t.deleted(code) });
        router.push("/admin/sets");
        return;
      }
      if (r.code === "not_found") return gone();
      // RF-14: algo cambió desde que se abrió el aviso: se redibuja con lo nuevo.
      if (r.code === "set_not_deletable" && r.info) return setState({ phase: "ready", info: r.info });
      setError(r.error ?? t.loadError);
    });

  return (
    <Modal open onOpenChange={(open) => !open && !pending && onClose()} size="md" testId="delete-set-dialog" closeLabel={tt.common.close} title={t.title(code)}>
      {state.phase === "loading" && (
        <p role="status" className="flex items-center gap-3 text-sm text-ui-text-2" data-testid="delete-set-loading">
          <LoaderCircle aria-hidden className="size-5 animate-spin motion-reduce:animate-none" />
          {t.loading}
        </p>
      )}
      {state.phase === "error" && (
        <Alert
          tone="danger"
          actions={
            <Button size="sm" onClick={() => setAttempt((n) => n + 1)}>
              {tt.common.retry}
            </Button>
          }
        >
          {t.loadError}
        </Alert>
      )}
      {state.phase === "ready" &&
        (state.info.blockers.length ? (
          <div className="space-y-4" data-testid="delete-set-blocked">
            <Alert tone="warning">
              <p className="font-medium">{t.cannot}</p>
              <DeletionBlockerList blockers={state.info.blockers} onNavigate={onClose} />
            </Alert>
            {state.info.canArchive && <ArchiveButton setId={setId} version={version} onArchived={onClose} />}
          </div>
        ) : (
          <form
            className="space-y-4"
            data-testid="delete-set-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (matchesCode(typed, state.info.code)) remove();
            }}
          >
            <p className="text-sm" data-testid="delete-set-counts">
              {t.willDelete(state.info.cards, state.info.images, state.info.packDesigns)}
            </p>
            <p className="text-sm font-medium text-ui-danger-text">{t.irreversible}</p>
            <TextField label={t.typeCode(state.info.code)} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} data-testid="delete-set-code" />
            {error && <Alert tone="danger">{error}</Alert>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
                {tt.common.cancel}
              </Button>
              <Button type="submit" variant="danger" loading={pending} disabled={!matchesCode(typed, state.info.code)} data-testid="delete-set-confirm">
                {t.confirm}
              </Button>
            </div>
          </form>
        ))}
    </Modal>
  );
}
