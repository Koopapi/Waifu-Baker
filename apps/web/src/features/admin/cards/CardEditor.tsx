"use client";

// Spec 031, RF-9: la ventana de edición de una carta. Se descarga al abrir la primera carta (`CardEditorLoader`), no
// con la página de la colección.
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RARITIES, type Rarity } from "@/domain/catalog/card-rules";
import { deleteCardAction, discardPendingLayersAction, reviewCardAction } from "@/app/admin/sets/card-actions";
import type { ActionState } from "@/server/auth/admin-action";
import { Button } from "@/ui/action/Button";
import { Alert } from "@/ui/feedback/Alert";
import { Select } from "@/ui/form/Select";
import { TextArea, TextField } from "@/ui/form/TextField";
import { useChoice, useConfirm } from "@/ui/overlay/Confirm";
import { SaveStatus } from "@/ui/feedback/SaveStatus";
import { Modal } from "@/ui/overlay/Modal";
import { CardPreview } from "./CardPreview";
import { LayersEditor } from "./LayersEditor";
import { VersionsPanel } from "./VersionsPanel";
import { emptyLayers, useCardDraft, type SaveTexts } from "./useCardDraft";
import type { LibraryEntry } from "@/features/admin/library/LibraryPicker";
import type { CardDTO, CharacterOption, Permissions } from "./types";
import { useLocale, useT } from "@/i18n/client";
import { useAdminLayersT } from "@/i18n/admin-layers";
import { Notice, pad, pct, ReviewBadge } from "./card-bits";

export function CardEditor({
  setId,
  card: initial,
  characters,
  library,
  perms,
  onClose,
  onSaved,
}: {
  setId: string;
  card: CardDTO;
  characters: CharacterOption[];
  library: LibraryEntry[];
  perms: Permissions;
  onClose: () => void;
  /** Versión nueva tras guardar: la cuadrícula la recuerda aunque el refresco llegue tarde. */
  onSaved: (version: number) => void;
}) {
  const tt = useT();
  const tl = useAdminLayersT();
  const tg = tl.guardado;
  const confirm = useConfirm();
  const choose = useChoice();
  const t = tt.admin.cards;
  const locale = useLocale();
  const [state, setState] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const texts = useMemo<SaveTexts>(
    () => ({
      saved: tg.savedCard,
      savedLayers: tl.saved,
      savedPending: tl.pending.saved,
      repeated: tl.repeated,
      reloaded: tg.reloaded,
      serverError: tt.admin.serverError,
      draftRecovered: tg.draft.recovered,
      draftMissing: tg.draft.missing,
      restored: tg.versions.restored,
    }),
    [tg, tl, tt],
  );
  // Spec 027: el estado único de la ventana (ficha y capas), su borrador en el navegador y el guardado único.
  const d = useCardDraft(initial, texts, onSaved);
  const card = d.card;
  const [versionsKey, setVersionsKey] = useState(0);
  useEffect(() => setVersionsKey((k) => k + 1), [card.version]);
  const time = new Intl.DateTimeFormat(locale, { timeStyle: "short" });
  const when = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const statusLabel = {
    clean: tg.status.clean,
    dirty: tg.status.dirty,
    saving: tg.status.saving,
    saved: tg.status.saved(d.savedAt ? time.format(d.savedAt) : ""),
    conflict: tg.status.conflict,
    "no-storage": tg.status.dirty,
  }[d.state];

  /**
   * RF-7 y RF-8: con cambios sin guardar, pregunta (guardar, descartar o seguir editando) antes de cerrar o de otra
   * acción que cambie la carta. Devuelve si se puede seguir y con qué versión de la carta.
   */
  async function settle(body: string, confirmLabel: string): Promise<{ ok: boolean; version: number }> {
    if (!d.dirty) return { ok: true, version: card.version };
    const answer = await choose({ title: tg.closeTitle, body, confirmLabel, secondary: { label: tg.discard, tone: "danger" }, cancelLabel: tg.keepEditing });
    if (answer === "cancel") return { ok: false, version: card.version };
    if (answer === "secondary") {
      d.discard();
      return { ok: true, version: card.version };
    }
    const saved = await d.save();
    return saved ? { ok: true, version: saved.version } : { ok: false, version: card.version };
  }
  const requestClose = async () => {
    if ((await settle(tg.closeBody, tg.saveAndClose)).ok) onClose();
  };
  const guard = () => settle(tg.continueBody, tg.saveAndContinue);

  async function forceSave() {
    if (await confirm({ title: tl.forceSave, body: tl.confirmForce, confirmLabel: tl.forceSave, tone: "danger" })) await d.forceSave();
  }

  const review = (reviewed: boolean) =>
    start(async () => {
      const g = await guard();
      if (!g.ok) return;
      const r = await reviewCardAction(setId, card.id, g.version, reviewed);
      setState(r);
      if (r.version) onSaved(r.version);
      if (r.code === "stale_version") router.refresh();
      if (r.ok) {
        router.refresh();
        onClose();
      }
    });

  const discardPending = () =>
    start(async () => {
      const g = await guard();
      if (!g.ok) return;
      const r = await discardPendingLayersAction(setId, card.id, g.version);
      setState(r.ok ? { ...r, message: tl.pending.discarded } : r);
      if (r.version) onSaved(r.version);
      if (r.ok) {
        await d.reload();
        router.refresh();
      }
    });

  const [file, setFile] = useState<File | null>(null);
  const replaceArt = () =>
    start(async () => {
      if (!file) return;
      const g = await guard();
      if (!g.ok) return;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("version", String(g.version));
      const res = await fetch(`/api/admin/cards/${card.id}/art`, { method: "POST", body: fd });
      const body = await res.json().catch(() => ({ ok: false, message: tt.admin.serverError(res.status) }));
      setState(body.ok ? { ok: true, message: body.pending ? t.newArtPending : t.artReplaced } : { ok: false, error: body.message });
      // Spec 017, RF-3: si la chica nueva no está recortada, el editor sigue abierto para que se vea el aviso.
      if (body.ok && body.uncut) {
        setState({ ok: true, message: `${t.artReplaced} ${tl.uncut}` });
        await d.reload();
        router.refresh();
        return;
      }
      if (body.ok) {
        router.refresh();
        onClose();
      }
    });

  const remove = async () => {
    // Spec 011, RF-12: borrar una carta es irreversible.
    if (!(await confirm({ title: t.deleteCard, body: t.confirmDelete(pad(card.number)), confirmLabel: t.deleteCard, tone: "danger" }))) return;
    start(async () => {
      const r = await deleteCardAction(setId, card.id);
      setState(r);
      if (r.ok) {
        d.discard();
        router.refresh();
        onClose();
      }
    });
  };

  return (
    <Modal open onOpenChange={(open) => !open && void requestClose()} preventClose={d.dirty} size="2xl" testId="card-editor" closeLabel={tt.common.close} title={t.cardN(pad(card.number))} description={t.chance(pct(locale, card.chance))}>
      {/* RF-11 y RF-14: el borrador de este navegador se ofrece, nunca se aplica solo. */}
      {d.pendingDraft && (
        <div className="mb-4" data-testid="card-draft-offer">
          <Alert
            tone="info"
            title={tg.draft.title(when.format(new Date(d.pendingDraft.savedAt)))}
            actions={
              <>
                <Button size="sm" onClick={() => void d.recoverDraft()} data-testid="draft-recover">
                  {tg.draft.recover}
                </Button>
                <Button size="sm" variant="ghost" onClick={d.dismissDraft} data-testid="draft-discard">
                  {tg.draft.discard}
                </Button>
              </>
            }
          >
            {d.pendingDraft.baseVersion !== card.version ? tg.draft.changed : null}
          </Alert>
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <div>
          <CardPreview card={card} />
          <p className="mt-2 text-xs text-ui-text-3">{t.tiltHint}</p>
          {card.pendingArtUrl && (
            <div className="mt-3 space-y-1 rounded-m border border-ui-info/40 p-2">
              <p className="text-xs text-ui-info-text">{t.pendingArtNote}</p>
              {/* eslint-disable-next-line @next/next/no-img-element -- original privado servido por la API del panel */}
              <img src={card.pendingArtUrl} alt={t.pendingArtAlt} className="w-full rounded-s" />
            </div>
          )}
          <div className="mt-3 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-ui-text-2">{t.replaceArt}</span>
            <input type="file" accept="image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-xs text-ui-text-2" data-testid="replace-art" />
            {file && (
              <Button size="sm" variant="secondary" onClick={replaceArt} disabled={pending}>
                {t.uploadNewArt}
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <TextField label={t.name} name="name" value={d.draft.ficha.name} onChange={(e) => d.setFicha({ name: e.target.value })} maxLength={60} autoFocus />
          <TextArea label={t.flavorText} name="flavorText" value={d.draft.ficha.flavorText} onChange={(e) => d.setFicha({ flavorText: e.target.value })} rows={2} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label={t.character}
              name="characterId"
              value={d.draft.ficha.characterId ?? ""}
              onValueChange={(v) => d.setFicha({ characterId: v || null })}
              searchable={characters.length > 8}
              options={[{ value: "", label: t.noCharacter }, ...characters.map((c) => ({ value: c.id, label: c.name }))]}
            />
            <Select
              label={t.rarity}
              name="rarity"
              value={d.draft.ficha.rarity ?? "__none"}
              onValueChange={(v) => d.setFicha({ rarity: v === "__none" ? null : (v as Rarity) })}
              disabled={!perms.canEditRarity}
              options={[{ value: "__none", label: t.noRarity }, ...RARITIES.map((r) => ({ value: r, label: tt.common.rarity[r] }))]}
            />
            <Select
              label={t.variant}
              name="variant"
              value={d.draft.ficha.variant}
              onValueChange={(v) => d.setFicha({ variant: v as CardDTO["variant"] })}
              disabled={!perms.canEditRarity}
              options={[
                { value: "normal", label: t.variants.normal },
                { value: "holo", label: t.variants.holo },
                { value: "alt", label: t.variants.alt },
              ]}
            />
          </div>
          {perms.isAdultSet && (
            <div className="space-y-2 rounded-m border border-ui-danger/40 bg-ui-danger/5 p-3" data-testid="review-box">
              <p className="flex flex-wrap items-center gap-2 text-sm">
                {t.review18} <ReviewBadge card={card} />
              </p>
              {/* Spec 018, RF-19 y RF-20: el cambio de capas pendiente, junto a lo vigente, para aprobarlo o descartarlo. */}
              {card.pendingLayersUrl ? (
                <div className="space-y-2" data-testid="pending-layers-review">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      [card.midUrl, tl.pending.current],
                      [card.pendingLayersUrl, tl.pending.proposed],
                    ].map(([src, label]) => (
                      <figure key={label} className="space-y-1">
                        {/* eslint-disable-next-line @next/next/no-img-element -- imagen privada del panel */}
                        <img src={src ?? ""} alt="" className="aspect-[700/991] w-full rounded-s object-cover" />
                        <figcaption className="text-xs text-ui-text-3">{label}</figcaption>
                      </figure>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => review(true)} disabled={pending} data-testid="approve-pending-layers">
                      {tl.pending.approve}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={discardPending} disabled={pending} data-testid="discard-pending-layers">
                      {tl.pending.discard}
                    </Button>
                  </div>
                </div>
              ) : card.adultReviewedAt && !card.pendingArtUrl ? (
                <Button size="sm" variant="secondary" onClick={() => review(false)} disabled={pending}>
                  {t.removeReview}
                </Button>
              ) : (
                <Button size="sm" onClick={() => review(true)} disabled={pending}>
                  {card.pendingArtUrl ? t.approveNewArt : t.confirmAdult}
                </Button>
              )}
            </div>
          )}
          <Notice state={state} />
          {perms.canRemove && (
            <div className="flex justify-end border-t border-ui-line pt-4">
              <Button variant="danger" onClick={remove} disabled={pending}>
                {t.deleteCard}
              </Button>
            </div>
          )}
        </div>
      </div>
      {/* Spec 027, RF-1: la carta por capas se edita aquí y se guarda junto con la ficha, con el único «Guardar». */}
      <LayersEditor
        card={card}
        library={library}
        draft={d.draft.layers ?? emptyLayers(d.draft.ficha.rarity)}
        setDraft={d.setLayers}
        saved={d.saved.layers}
        rarity={d.draft.ficha.rarity}
        notice={d.notice}
        setNotice={d.setNotice}
        onRemoveAll={() => void d.save({ layersOverride: null })}
        busy={d.busy}
      />
      {/* RF-19 a RF-21: las versiones de la carta. */}
      <div className="mt-6 border-t border-ui-line pt-5">
        <VersionsPanel cardId={card.id} refreshKey={versionsKey} onRestore={(n) => void d.restore(n)} disabled={d.busy} />
      </div>
      {/* Spec 016, RF-17 y RF-18: otro administrador guardó antes. */}
      {d.conflict && (
        <div className="mt-4" data-testid="layers-conflict">
          <Alert
            tone="warning"
            title={tl.conflictTitle}
            actions={
              <>
                <Button size="sm" variant="secondary" onClick={() => void d.reload()} data-testid="layers-reload">
                  {tl.reload}
                </Button>
                <Button size="sm" variant="danger" onClick={() => void forceSave()} disabled={d.busy} data-testid="layers-force">
                  {tl.forceSave}
                </Button>
              </>
            }
          >
            {tl.conflictBody}
          </Alert>
        </div>
      )}
      {/* RF-3 a RF-5: un solo «Guardar» y el estado, siempre a la vista al pie de la ventana. */}
      <div className="sticky -bottom-6 z-10 -mx-6 -mb-6 mt-4 flex flex-wrap items-center gap-3 border-t border-ui-line bg-ui-nav px-6 py-3" data-testid="card-save-bar">
        <Button onClick={() => void d.save()} loading={d.busy} disabled={!d.dirty || d.conflict} data-testid="layers-save">
          {tg.save}
        </Button>
        <Button variant="ghost" onClick={() => void requestClose()} data-testid="card-cancel">
          {tt.common.cancel}
        </Button>
        <SaveStatus state={d.state} label={statusLabel} detail={d.storageOk ? undefined : tg.status.noStorage} className="ml-auto" />
      </div>
    </Modal>
  );
}
