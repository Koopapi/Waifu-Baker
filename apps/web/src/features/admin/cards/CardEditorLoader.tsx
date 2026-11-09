"use client";

import { useCallback, useEffect, useState, type ComponentType } from "react";
import { Button } from "@/ui/action/Button";
import { Alert } from "@/ui/feedback/Alert";
import { LoaderCircle } from "@/ui/icons/glyphs";
import { Modal } from "@/ui/overlay/Modal";
import type { LibraryEntry } from "@/features/admin/library/LibraryPicker";
import { useLocale, useT } from "@/i18n/client";
import { pad, pct } from "./card-bits";
import type { CardEditor as CardEditorType } from "./CardEditor";
import type { CardDTO, CardTileDTO, CharacterOption, Permissions } from "./types";

type EditorProps = Parameters<typeof CardEditorType>[0];

/**
 * Spec 031, RF-10: el código del editor y la biblioteca se piden una sola vez por visita. Si fallan, se olvidan para que
 * «Reintentar» los vuelva a pedir.
 */
let editorModule: Promise<ComponentType<EditorProps>> | null = null;
let libraryRequest: Promise<LibraryEntry[]> | null = null;

function loadEditor() {
  editorModule ??= import("./CardEditor").then(
    (m) => m.CardEditor,
    (e) => {
      editorModule = null;
      throw e;
    },
  );
  return editorModule;
}

function loadLibrary() {
  libraryRequest ??= fetch("/api/admin/library")
    .then(async (r) => {
      const body = r.ok ? await r.json() : null;
      if (!body?.ok) throw new Error(`library ${r.status}`);
      return body.items as LibraryEntry[];
    })
    .catch((e) => {
      libraryRequest = null;
      throw e;
    });
  return libraryRequest;
}

async function loadCard(id: string, signal: AbortSignal) {
  const r = await fetch(`/api/admin/cards/${id}`, { signal });
  const body = r.ok ? await r.json() : null;
  if (!body?.ok) throw new Error(`card ${r.status}`);
  return body.card as CardDTO;
}

/** Solo para los tests: olvida lo que ya se descargó. */
export function resetEditorCacheForTests() {
  editorModule = null;
  libraryRequest = null;
}

type State = { phase: "loading" } | { phase: "error" } | { phase: "ready"; Editor: ComponentType<EditorProps>; card: CardDTO; library: LibraryEntry[] };

/**
 * Spec 031, RF-8 a RF-12: la ventana de una carta se abre al instante con su miniatura y un indicador. Mientras tanto se
 * descargan el editor (solo la primera vez), la carta completa y la biblioteca. Si algo falla, avisa con «Reintentar»
 * sin cerrar la ventana. Al cerrarla antes de tiempo se cancela la carga sin avisos.
 */
export function CardEditorLoader({
  setId,
  tile,
  characters,
  perms,
  onClose,
  onSaved,
}: {
  setId: string;
  tile: CardTileDTO;
  characters: CharacterOption[];
  perms: Permissions;
  onClose: () => void;
  onSaved: (version: number) => void;
}) {
  const tt = useT();
  const t = tt.admin.cards;
  const locale = useLocale();
  const [state, setState] = useState<State>({ phase: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctl = new AbortController();
    setState({ phase: "loading" });
    Promise.all([loadEditor(), loadCard(tile.id, ctl.signal), loadLibrary()]).then(
      ([Editor, card, library]) => {
        // El editor muestra la probabilidad que calculó la página (la carta suelta no la sabe).
        if (!ctl.signal.aborted) setState({ phase: "ready", Editor, card: { ...card, chance: tile.chance }, library });
      },
      () => {
        // RF-12: si la ventana ya se cerró (o se abrió otra carta), no se avisa de nada.
        if (!ctl.signal.aborted) setState({ phase: "error" });
      },
    );
    return () => ctl.abort();
  }, [tile.id, tile.chance, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (state.phase === "ready") {
    const { Editor } = state;
    return <Editor setId={setId} card={state.card} characters={characters} library={state.library} perms={perms} onClose={onClose} onSaved={onSaved} />;
  }

  return (
    <Modal open onOpenChange={(open) => !open && onClose()} size="2xl" testId="card-editor-loading" closeLabel={tt.common.close} title={t.cardN(pad(tile.number))} description={t.chance(pct(locale, tile.chance))}>
      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <div className="rounded-l bg-ui-rail p-4">
          {tile.thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- recurso privado servido por la API del panel
            <img src={tile.thumbUrl} alt="" className="aspect-[700/991] w-full rounded-m object-cover" data-testid="card-editor-loading-thumb" />
          ) : (
            <div className="grid aspect-[700/991] place-items-center text-xs text-ui-text-3">{t.processing}</div>
          )}
        </div>
        <div className="flex min-h-40 items-center justify-center">
          {state.phase === "error" ? (
            <div className="w-full" data-testid="card-editor-error">
              <Alert
                tone="danger"
                actions={
                  <Button size="sm" onClick={retry} data-testid="card-editor-retry">
                    {tt.common.retry}
                  </Button>
                }
              >
                {t.editorLoadError}
              </Alert>
            </div>
          ) : (
            <p role="status" className="flex items-center gap-3 text-sm text-ui-text-2" data-testid="card-editor-spinner">
              <LoaderCircle aria-hidden className="size-5 animate-spin motion-reduce:animate-none" />
              {t.editorLoading}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
