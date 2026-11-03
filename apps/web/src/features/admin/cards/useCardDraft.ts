"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clearDraft, DRAFT_WRITE_DELAY_MS, readDraft, writeDraft, type CardDraft, type DraftStorage } from "@/domain/cards/draft";
import { imageKeys, isImageLayer, isImageSeal, type LayersConfig } from "@/domain/cards/layers";
import { sameLayers, sameSheet, sheetOf, type CardSheet } from "@/domain/cards/versions";
import { rarityTier } from "@/domain/catalog/rarity-tier";
import type { SaveState } from "@/ui/feedback/SaveStatus";
import type { CardDTO } from "./types";

export type Notice = { tone: "success" | "warning" | "danger"; text: string } | null;

export interface DraftSnapshot {
  ficha: CardSheet;
  layers: LayersConfig | null;
}

export interface SaveTexts {
  saved: string;
  savedLayers: string;
  savedPending: string;
  repeated: string;
  reloaded: string;
  serverError: (status: number) => string;
  draftRecovered: string;
  draftMissing: (n: number) => string;
  restored: (n: number) => string;
}

const storage = (): DraftStorage | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

/** La configuración de una carta sin capas (spec 016): sin capas, el marco de su rareza y sin sello. */
export const emptyLayers = (rarity: CardDTO["rarity"]): LayersConfig => ({ capas: [], marco: rarityTier(rarity), sello: null });
const emptyConfig = emptyLayers;
const snapshotOf = (card: CardDTO): DraftSnapshot => ({ ficha: sheetOf(card), layers: card.layers });
const fichaPatch = (from: CardSheet, to: CardSheet): Partial<CardSheet> => {
  const patch: Partial<CardSheet> = {};
  for (const k of Object.keys(to) as (keyof CardSheet)[]) {
    if (from[k] !== to[k]) (patch as Record<string, unknown>)[k] = to[k];
  }
  return patch;
};

/**
 * Spec 027: el estado único de la ventana de la carta. Lo guardado (`saved`) viene de la carta; `draft` son los
 * cambios de la ficha y de las capas; `dirty` dice si difieren. Un solo `save()` manda las dos cosas (RF-1 a RF-3);
 * el borrador se escribe en el navegador poco después de cada cambio y se borra al guardar o descartar (RF-10 a
 * RF-16); mientras haya cambios, salir de la página pide confirmación (RF-9).
 */
export function useCardDraft(initial: CardDTO, texts: SaveTexts, onSaved: (version: number) => void) {
  const router = useRouter();
  const [card, setCard] = useState<CardDTO>(initial);
  const [draft, setDraftState] = useState<DraftSnapshot>(() => snapshotOf(initial));
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [restoredFrom, setRestoredFrom] = useState<number | null>(null);
  const [pendingDraft, setPendingDraft] = useState<CardDraft | null>(null);
  const [storageOk, setStorageOk] = useState(true);
  const saved = useMemo(() => snapshotOf(card), [card]);

  // Comparación con claves ordenadas (jsonb las reordena); una carta sin capas equivale a la configuración vacía.
  const norm = useCallback((c: LayersConfig | null) => c ?? emptyConfig(card.rarity), [card.rarity]);
  const layersChanged = !sameLayers(norm(saved.layers), norm(draft.layers));
  const fichaChanged = !sameSheet(saved.ficha, draft.ficha);
  const dirty = layersChanged || fichaChanged;

  // RF-11: al abrir, si hay un borrador en este navegador se ofrece (nunca se aplica solo).
  useEffect(() => {
    const r = readDraft(storage(), initial.id, Date.now());
    setStorageOk(r.available);
    if (r.draft && !(sameSheet(r.draft.ficha, saved.ficha) && sameLayers(norm(r.draft.layers), norm(saved.layers)))) setPendingDraft(r.draft);
    // Solo al abrir la ventana.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.id]);

  // RF-10 y RF-13: el borrador se escribe con un pequeño retraso tras el último cambio; sin cambios, se borra.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!dirty) {
      clearDraft(storage(), card.id);
      return;
    }
    timer.current = setTimeout(() => {
      const ok = writeDraft(storage(), { cardId: card.id, baseVersion: card.version, ficha: draft.ficha, layers: draft.layers, savedAt: Date.now(), ...(restoredFrom ? { restoredFrom } : {}) });
      setStorageOk(ok);
    }, DRAFT_WRITE_DELAY_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [dirty, draft, card.id, card.version, restoredFrom]);

  // RF-9: salir o recargar con cambios sin guardar pide confirmación al navegador.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setFicha = useCallback((patch: Partial<CardSheet>) => setDraftState((d) => ({ ...d, ficha: { ...d.ficha, ...patch } })), []);
  const setLayers = useCallback((next: LayersConfig | null | ((c: LayersConfig) => LayersConfig | null)) => {
    setDraftState((d) => ({ ...d, layers: typeof next === "function" ? next(d.layers ?? emptyConfig(d.ficha.rarity)) : next }));
  }, []);

  const applyCard = useCallback(
    (next: CardDTO) => {
      const merged = { ...next, chance: card.chance };
      setCard(merged);
      setDraftState(snapshotOf(merged));
      setRestoredFrom(null);
      setConflict(false);
      onSaved(merged.version);
    },
    [card.chance, onSaved],
  );

  /** RF-1 a RF-3: guarda ficha y capas juntas. Devuelve la carta guardada o null si no se pudo. */
  const save = useCallback(
    async (opts: { force?: boolean; layersOverride?: LayersConfig | null } = {}): Promise<CardDTO | null> => {
      setBusy(true);
      setNotice(null);
      try {
        const sendLayers = opts.layersOverride !== undefined || layersChanged;
        const body: Record<string, unknown> = { version: card.version, force: Boolean(opts.force) };
        const patch = fichaPatch(saved.ficha, draft.ficha);
        if (Object.keys(patch).length) body.ficha = patch;
        if (sendLayers) body.layers = opts.layersOverride !== undefined ? opts.layersOverride : draft.layers;
        if (restoredFrom) body.restoredFrom = restoredFrom;
        const res = await fetch(`/api/admin/cards/${card.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const data = await res.json().catch(() => ({ ok: false, message: texts.serverError(res.status) }));
        if (data.code === "stale_version") {
          setConflict(true);
          return null;
        }
        if (!data.ok) {
          setNotice({ tone: "danger", text: data.message ?? texts.serverError(res.status) });
          return null;
        }
        applyCard(data.card);
        setSavedAt(new Date());
        clearDraft(storage(), card.id);
        // Spec 018, RF-18: en una 18+ publicada lo guardado queda pendiente de revisión.
        setNotice(
          sendLayers
            ? data.pending
              ? { tone: "warning", text: texts.savedPending }
              : data.repeated?.length
                ? { tone: "warning", text: `${texts.savedLayers} ${texts.repeated}` }
                : { tone: "success", text: texts.savedLayers }
            : { tone: "success", text: texts.saved },
        );
        router.refresh();
        return data.card as CardDTO;
      } finally {
        setBusy(false);
      }
    },
    [card.id, card.version, saved.ficha, draft.ficha, draft.layers, layersChanged, restoredFrom, texts, applyCard, router],
  );

  /** RF-8: descarta los cambios (y el borrador) y vuelve a lo guardado. */
  const discard = useCallback(() => {
    setDraftState(snapshotOf(card));
    setRestoredFrom(null);
    setConflict(false);
    setNotice(null);
    clearDraft(storage(), card.id);
  }, [card]);

  /** Spec 016, RF-18: tras un conflicto, recargar trae lo que guardó el otro administrador (y descarta lo propio). */
  const reload = useCallback(async () => {
    const res = await fetch(`/api/admin/cards/${card.id}`);
    const data = await res.json().catch(() => ({ ok: false }));
    if (!data.ok) return;
    applyCard(data.card);
    clearDraft(storage(), card.id);
    setNotice({ tone: "success", text: texts.reloaded });
  }, [card.id, applyCard, texts.reloaded]);

  /** RF-12 y RF-16: recupera el borrador como cambios sin guardar, sin las capas cuyas imágenes ya no estén. */
  const recoverDraft = useCallback(async () => {
    const d = pendingDraft;
    if (!d) return;
    let layers = d.layers;
    let missing: string[] = [];
    if (layers) {
      const keys = imageKeys(layers);
      if (keys.length) {
        const res = await fetch(`/api/admin/cards/${card.id}/layers/present`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keys }) });
        const data = await res.json().catch(() => ({ ok: false }));
        if (data.ok) missing = data.missing as string[];
      }
      if (missing.length) {
        const gone = new Set(missing);
        layers = { ...layers, capas: layers.capas.filter((l) => !isImageLayer(l) || !gone.has(l.key)), sello: isImageSeal(layers.sello) && gone.has(layers.sello.key) ? null : layers.sello };
      }
    }
    setDraftState({ ficha: d.ficha, layers });
    setRestoredFrom(d.restoredFrom ?? null);
    setPendingDraft(null);
    setNotice(missing.length ? { tone: "warning", text: texts.draftMissing(missing.length) } : { tone: "success", text: texts.draftRecovered });
  }, [pendingDraft, card.id, texts]);

  const dismissDraft = useCallback(() => {
    clearDraft(storage(), card.id);
    setPendingDraft(null);
  }, [card.id]);

  /** RF-20: carga una versión como cambios sin guardar; nada cambia en la carta hasta pulsar Guardar. */
  const restore = useCallback(
    async (number: number) => {
      const res = await fetch(`/api/admin/cards/${card.id}/versions/${number}`);
      const data = await res.json().catch(() => ({ ok: false }));
      if (!data.ok) {
        setNotice({ tone: "danger", text: data.message ?? texts.serverError(res.status) });
        return;
      }
      setDraftState({ ficha: data.version.ficha, layers: data.version.layers ?? null });
      setRestoredFrom(number);
      setPendingDraft(null);
      setNotice({ tone: "success", text: texts.restored(number) });
    },
    [card.id, texts],
  );

  const state: SaveState = busy ? "saving" : conflict ? "conflict" : dirty ? "dirty" : savedAt ? "saved" : "clean";

  return {
    card,
    saved,
    draft,
    dirty,
    layersChanged,
    state,
    savedAt,
    busy,
    conflict,
    storageOk,
    notice,
    setNotice,
    pendingDraft,
    setFicha,
    setLayers,
    save,
    discard,
    reload,
    recoverDraft,
    dismissDraft,
    restore,
    forceSave: () => save({ force: true }),
  };
}

export type CardDraftApi = ReturnType<typeof useCardDraft>;
