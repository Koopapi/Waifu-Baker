"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { craftAction, previewRecycleAction, recycleAction } from "@/app/(app)/collection/character/actions";
import type { RecyclePlan } from "@/domain/bonds/recycle";
import type { RecycleTarget, LineCard } from "@/server/services/bonds";
import { useGamesT } from "@/i18n/games";
import { useT } from "@/i18n/client";
import { Button } from "@/ui/action/Button";
import { CardLine } from "@/ui/content/CardLine";
import { Alert } from "@/ui/feedback/Alert";
import { GainSummary } from "@/ui/feedback/GainSummary";
import { useToast } from "@/ui/feedback/Toast";
import { Modal } from "@/ui/overlay/Modal";
import { useConfirm } from "@/ui/overlay/Confirm";

type Card = LineCard & { rarityLabel: string; thumb: string | null };
const pad = (n: number) => String(n).padStart(3, "0");

/**
 * Spec 029, RF-4, RF-5, RF-15 y RF-18: la línea de un personaje con sus acciones. Antes de reciclar se pide al servidor
 * lo que dará (copias, puntos, polvo y nivel) y se confirma; la interfaz no calcula nada.
 */
export function CharacterLineView({ characterId, characterName, cards, recyclableTotal }: { characterId: string; characterName: string; cards: Card[]; recyclableTotal: number }) {
  const t = useGamesT().bond;
  const tt = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ask, setAsk] = useState<{ target: RecycleTarget; plan: RecyclePlan } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preview = (target: RecycleTarget) =>
    start(async () => {
      setError(null);
      const r = await previewRecycleAction(target);
      if (r.ok) setAsk({ target, plan: r.value });
      else setError(r.error);
    });

  const doRecycle = () =>
    start(async () => {
      if (!ask) return;
      const r = await recycleAction(ask.target);
      setAsk(null);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast({ kind: "success", title: t.recycled(r.value.copies, r.value.points, r.value.dust) });
      router.refresh();
    });

  const craft = async (c: Card) => {
    const name = c.name || pad(c.number);
    if (!(await confirm({ title: t.craftTitle, body: t.craftBody(c.craft.cost ?? 0), confirmLabel: t.craft(c.craft.cost ?? 0) }))) return;
    start(async () => {
      setError(null);
      const r = await craftAction(c.cardId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast({ kind: "success", title: t.crafted(name) });
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={recyclableTotal === 0 || pending} onClick={() => preview({ characterId })} data-testid="recycle-all">
          {t.recycleAll(recyclableTotal)}
        </Button>
        {recyclableTotal === 0 && <span className="text-sm text-ui-text-3">{t.noDuplicates}</span>}
      </div>
      {error && <Alert tone="danger">{error}</Alert>}
      <CardLine
        label={t.barLabel(characterName)}
        items={cards.map((c) => {
          const owned = c.owned.normal + c.owned.holo > 0;
          return {
            key: c.cardId,
            label: `${c.setCode} · ${pad(c.number)} · ${c.name || tt.collection.binder.cardFallbackName(pad(c.number))} · ${c.rarityLabel}`,
            image: c.thumb,
            owned,
            missingLabel: t.missing,
            detail: owned ? (
              <span data-testid="line-owned">
                {t.owned(c.owned.normal, c.owned.holo)}
                {c.recyclable.normal + c.recyclable.holo > 0 && ` · ${t.recyclable(c.recyclable.normal + c.recyclable.holo)}`}
              </span>
            ) : null,
            actions: (
              <>
                {c.recyclable.normal > 0 && (
                  <Button size="sm" variant="secondary" disabled={pending} onClick={() => preview({ cardId: c.cardId, holo: false })} data-testid="recycle-card">
                    {t.recycle}
                  </Button>
                )}
                {c.recyclable.holo > 0 && (
                  <Button size="sm" variant="secondary" disabled={pending} onClick={() => preview({ cardId: c.cardId, holo: true })} data-testid="recycle-card-holo">
                    {t.recycleHolo}
                  </Button>
                )}
                {c.craft.cost !== null &&
                  (c.craft.problem ? (
                    <span className="text-xs text-ui-text-3" data-testid="craft-blocked">
                      {t.noCraft[c.craft.problem]} · {t.craft(c.craft.cost)}
                    </span>
                  ) : (
                    <Button size="sm" disabled={pending} onClick={() => void craft(c)} data-testid="craft-card">
                      {t.craft(c.craft.cost)}
                    </Button>
                  ))}
              </>
            ),
          };
        })}
      />
      <Modal open={Boolean(ask)} onOpenChange={(o) => !o && setAsk(null)} title={t.confirmTitle} description={t.confirmBody} closeLabel={tt.common.close} testId="recycle-dialog">
        {ask && (
          <div className="space-y-4">
            <GainSummary
              rows={[
                { label: t.gain.copies, value: String(ask.plan.copies) },
                { label: t.gain.points, value: `+${ask.plan.points}` },
                { label: t.gain.dust, value: `+${ask.plan.dust}` },
                { label: t.gain.level, value: t.levelAfter(ask.plan.levelBefore, ask.plan.levelAfter) },
              ]}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setAsk(null)}>
                {tt.common.cancel}
              </Button>
              <Button variant="danger" loading={pending} onClick={doRecycle} data-testid="recycle-confirm">
                {t.confirm}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
