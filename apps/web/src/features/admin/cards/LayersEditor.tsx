"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BLEND_MODES,
  CORNERS,
  framingOf,
  imageLayers,
  isImageLayer,
  isImageSeal,
  isVisible,
  PARTICLE_TYPES,
  resetFraming,
  SEAL_STYLES,
  setBackground,
  TIERS,
  type Framing,
  type ImageLayer,
  type Layer,
  type LayersConfig,
} from "@/domain/cards/layers";
import { applyTierStyle, replaceCharacter, settleAutoStyle } from "@/domain/cards/layers-rarity";
import { rarityTier } from "@/domain/catalog/rarity-tier";
import { useT } from "@/i18n/client";
import { useAdminLayersT } from "@/i18n/admin-layers";
import { Button, IconButton } from "@/ui/action/Button";
import { Badge } from "@/ui/content/Badge";
import { Tabs } from "@/ui/content/Tabs";
import { Alert } from "@/ui/feedback/Alert";
import { Checkbox } from "@/ui/form/Choice";
import { Select } from "@/ui/form/Select";
import { TextField } from "@/ui/form/TextField";
import { CartaCapas } from "@/ui/game/CartaCapas";
import { ArrowDown, ArrowUp, Plus, Sparkles, Trash2 } from "@/ui/icons/glyphs";
import { useConfirm } from "@/ui/overlay/Confirm";
import { focusRing } from "@/ui/focus";
import type { CardDTO } from "./types";

/** Fondo de la biblioteca de la colección, para elegirlo en el editor (spec 017, RF-8). */
export interface LibraryBackground {
  key: string;
  name: string;
  url: string;
}

type Notice = { tone: "success" | "warning" | "danger"; text: string } | null;
type Upload = { id: number; name: string; status: "uploading" | "ok" | "warning" | "error"; message?: string };

const asset = (key: string) => `/api/admin/assets/${key}`;
const emptyConfig = (card: CardDTO): LayersConfig => ({ capas: [], marco: rarityTier(card.rarity), sello: null });
const randomSeed = () => 1 + Math.floor(Math.random() * 9_999);
/** Profundidad y margen de partida de la capa n (0 = fondo): el fondo casi quieto y con margen, el resto delante. */
const defaultsFor = (n: number) => (n === 0 ? { profundidad: 0.2, margen: 5 } : { profundidad: Math.round((0.7 + n * 0.3) * 100) / 100 });

/** Cambia las claves del almacén por enlaces del panel, para la vista previa (spec 017: con el encuadre completo). */
function previewConfig(c: LayersConfig) {
  return {
    ...c,
    // Sin la animación de entrada: la vista previa se vuelve a montar con cada cambio.
    aparecer: false,
    capas: c.capas.map((l) => (isImageLayer(l) ? { ...l, encuadre: framingOf(l), src: asset(l.key) } : l)),
    sello: isImageSeal(c.sello) ? { ...c.sello, src: asset(c.sello.key) } : c.sello,
  };
}

const clamp = (v: number, min: number, max: number) => Math.round(Math.min(max, Math.max(min, v)) * 100) / 100;
/** Spec 017, RF-11: límites del encuadre (los mismos que valida el servidor). */
function boundFraming(f: Framing): Framing {
  return { ...f, x: clamp(f.x, -100, 100), y: clamp(f.y, -100, 100), escala: clamp(f.escala, 0.1, 4), giro: clamp(f.giro, -180, 180) };
}
const framingCss = (f: Framing) => `translate(${f.x}%,${f.y}%) scale(${f.escala}) rotate(${f.giro}deg)`;

/** Capa que se encuadra al abrir: la chica o, si no hay, la primera imagen. */
function defaultSelection(c: LayersConfig) {
  const chica = c.capas.findIndex((l) => isImageLayer(l) && l.rol === "personaje");
  return chica >= 0 ? chica : c.capas.findIndex(isImageLayer);
}

function numberOr(v: string, fallback: number | undefined) {
  const n = Number(v);
  return v.trim() === "" || !Number.isFinite(n) ? fallback : n;
}

/**
 * Spec 016, RF-3 y RF-5 a RF-18: editor de la carta por capas dentro del editor de carta del panel (estilo actual del panel;
 * solo la vista previa va sobre fondo oscuro). Las imágenes se suben al área temporal y nada cambia en la carta hasta
 * «Guardar capas». Spec 017: la chica (sustituir, no quitar), el fondo (biblioteca o propio), el encuadre de cada capa
 * (arrastrando, con números o con el teclado) y el estilo automático.
 */
export function LayersEditor({ card, backgrounds = [], onSaved }: { card: CardDTO; backgrounds?: LibraryBackground[]; onSaved: (version: number) => void }) {
  const tt = useT();
  const t = useAdminLayersT();
  const confirm = useConfirm();
  const router = useRouter();
  const [saved, setSaved] = useState<LayersConfig | null>(card.layers);
  const [draft, setDraft] = useState<LayersConfig>(card.layers ?? emptyConfig(card));
  const [version, setVersion] = useState(card.version);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const zone = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const [selected, setSelected] = useState(() => defaultSelection(card.layers ?? emptyConfig(card)));
  const drag = useRef<{ x0: number; y0: number; width: number; start: Framing; next: Framing; img: HTMLImageElement | null } | null>(null);

  const preview = useMemo(() => (imageLayers(draft).some(isVisible) ? previewConfig(draft) : null), [draft]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved ?? emptyConfig(card));
  const tier = rarityTier(card.rarity);
  // Spec 017, RF-13 y RF-14: el mismo criterio que aplica el servidor al guardar.
  const autoStyle = Boolean(settleAutoStyle(saved, draft, tier).estiloAuto);
  const characterIndex = draft.capas.findIndex((l) => isImageLayer(l) && l.rol === "personaje");
  const backgroundLayer = imageLayers(draft).find((l) => l.rol === "fondo");
  const sel = isImageLayer(draft.capas[selected] ?? { particulas: "nieve" }) ? selected : defaultSelection(draft);
  const selLayer = sel >= 0 ? (draft.capas[sel] as ImageLayer) : null;

  const update = (fn: (c: LayersConfig) => LayersConfig) => setDraft((c) => fn(c));
  const setLayer = (i: number, patch: Partial<Layer>) => update((c) => ({ ...c, capas: c.capas.map((l, j) => (j === i ? ({ ...l, ...patch } as Layer) : l)) }));
  const move = (i: number, to: number) =>
    update((c) => {
      const capas = [...c.capas];
      const [l] = capas.splice(i, 1);
      capas.splice(to, 0, l);
      return { ...c, capas };
    });

  /** Spec 017, RF-10 y RF-11: cambia el encuadre de la capa i, dentro de sus límites. */
  const setFraming = (i: number, patch: Partial<Framing>) =>
    update((c) => {
      const l = c.capas[i];
      if (!l || !isImageLayer(l)) return c;
      const encuadre = boundFraming({ ...framingOf(l), ...patch });
      return { ...c, capas: c.capas.map((x, j) => (j === i ? { ...l, encuadre } : x)) };
    });

  /** La imagen que dibuja la capa i en la vista previa (las capas ocultas no se dibujan). */
  function renderedImage(i: number) {
    const n = draft.capas.slice(0, i).filter((l) => l.visible !== false).length;
    return zone.current?.querySelectorAll(".cc-capa")[n]?.querySelector("img") ?? null;
  }

  // Spec 017, RF-10: arrastrar sobre la vista previa mueve la capa elegida. Mientras se arrastra, la imagen se mueve
  // directamente (sin volver a montar la carta) y el encuadre se guarda en el borrador al soltar.
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || !selLayer || selLayer.visible === false) return;
    const width = zone.current?.querySelector(".cc-card")?.getBoundingClientRect().width ?? 0;
    if (!width) return;
    // En captura: la carta no recibe el gesto (si no, además se inclinaría al arrastrar).
    e.stopPropagation();
    const start = framingOf(selLayer);
    drag.current = { x0: e.clientX, y0: e.clientY, width, start, next: start, img: renderedImage(sel) };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    // En % enteros del lienzo: el arrastre no necesita más precisión y los números quedan limpios.
    d.next = boundFraming({ ...d.start, x: Math.round(d.start.x + ((e.clientX - d.x0) / d.width) * 100), y: Math.round(d.start.y + ((e.clientY - d.y0) / d.width) * 100) });
    if (d.img) d.img.style.transform = framingCss(d.next);
  }

  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    if (d && (d.next.x !== d.start.x || d.next.y !== d.start.y)) setFraming(sel, { x: d.next.x, y: d.next.y });
  }

  // Spec 017, RF-10: flechas para mover (Mayús ×5), + y − para escalar, [ y ] para girar.
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!selLayer) return;
    const f = framingOf(selLayer);
    const step = e.shiftKey ? 5 : 1;
    const patch: Partial<Framing> | undefined = (
      {
        ArrowLeft: { x: f.x - step },
        ArrowRight: { x: f.x + step },
        ArrowUp: { y: f.y - step },
        ArrowDown: { y: f.y + step },
        "+": { escala: f.escala + 0.05 * step },
        "=": { escala: f.escala + 0.05 * step },
        "-": { escala: f.escala - 0.05 * step },
        "[": { giro: f.giro - step },
        "]": { giro: f.giro + step },
      } as Record<string, Partial<Framing>>
    )[e.key];
    if (!patch) return;
    e.preventDefault();
    e.stopPropagation();
    setFraming(sel, patch);
    // La carta se vuelve a montar con el cambio: el foco queda en el recuadro para seguir con el teclado.
    zone.current?.focus();
  }

  async function uploadOne(file: File, kind: "layer" | "seal" | "character") {
    const id = ++seq.current;
    setUploads((u) => [...u, { id, name: file.name, status: "uploading" }]);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    const res = await fetch("/api/admin/layer-uploads", { method: "POST", body: fd });
    const body = await res.json().catch(() => ({ ok: false, message: tt.admin.serverError(res.status) }));
    if (!body.ok) {
      setUploads((u) => u.map((x) => (x.id === id ? { ...x, status: "error", message: t.rejected(file.name, body.message) } : x)));
      return null;
    }
    const message = body.uncut ? `${file.name}: ${t.uncut}` : body.scaled && kind !== "character" ? t.uploadedScaled(file.name) : undefined;
    setUploads((u) => u.map((x) => (x.id === id ? { ...x, status: body.uncut ? "warning" : "ok", message } : x)));
    return body.key as string;
  }

  // Spec 017, RF-4: la chica nueva ocupa su capa con el mismo encuadre.
  async function replaceGirl(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploads([]);
    const key = await uploadOne(file, "character");
    if (key) update((c) => replaceCharacter(c, key));
  }

  // Spec 017, RF-8: un fondo propio de esta carta (las reglas de las capas, RF-7).
  async function uploadOwnBackground(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploads([]);
    const key = await uploadOne(file, "layer");
    if (key) update((c) => setBackground(c, key));
  }

  // RF-6: varias capas a la vez; cada una se acepta o se rechaza con su motivo (RF-31) y se añaden en orden.
  async function addLayers(files: FileList | null) {
    if (!files?.length) return;
    setUploads([]);
    const keys = await Promise.all([...files].map((f) => uploadOne(f, "layer")));
    update((c) => {
      let n = imageLayers(c).length;
      const added = keys.filter((k): k is string => Boolean(k)).map((key) => ({ key, rol: "extra" as const, ...defaultsFor(n++) }));
      return { ...c, capas: [...c.capas, ...added] };
    });
  }

  async function setSealImage(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const key = await uploadOne(file, "seal");
    if (key) update((c) => ({ ...c, sello: { key, esquina: c.sello?.esquina ?? "sup-izq", tamano: 36 } }));
  }

  async function send(method: "PUT" | "DELETE", force = false) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/cards/${card.id}/layers`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(method === "PUT" ? { config: draft, version, force } : { version, force }),
      });
      const body = await res.json().catch(() => ({ ok: false, message: tt.admin.serverError(res.status) }));
      if (body.code === "stale_version") {
        setConflict(true);
        return;
      }
      if (!body.ok) {
        setNotice({ tone: "danger", text: body.message });
        return;
      }
      setConflict(false);
      setSaved(body.layers);
      setDraft(body.layers ?? emptyConfig(card));
      setSelected(defaultSelection(body.layers ?? emptyConfig(card)));
      setVersion(body.version);
      onSaved(body.version);
      setNotice(method === "DELETE" ? { tone: "success", text: t.removed } : body.repeated?.length ? { tone: "warning", text: `${t.saved} ${t.repeated}` } : { tone: "success", text: t.saved });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  // RF-20: recargar descarta los cambios y muestra lo guardado por el otro administrador.
  async function reload() {
    const res = await fetch(`/api/admin/cards/${card.id}/layers`);
    const body = await res.json();
    if (!body.ok) return;
    setSaved(body.layers);
    setDraft(body.layers ?? emptyConfig(card));
    setVersion(body.version);
    onSaved(body.version);
    setConflict(false);
    setUploads([]);
  }

  async function forceSave() {
    if (await confirm({ title: t.forceSave, body: t.confirmForce, confirmLabel: t.forceSave, tone: "danger" })) await send("PUT", true);
  }

  async function removeAll() {
    if (await confirm({ title: t.removeAll, body: t.confirmRemoveAll, confirmLabel: t.removeAll, tone: "danger" })) await send("DELETE");
  }

  /** Nombre de una capa de imagen en el selector del encuadre: Chica, Fondo o Imagen n. */
  function roleLabel(l: ImageLayer, i: number) {
    if (l.rol === "personaje" || l.rol === "fondo") return t.roles[l.rol];
    return t.layerImage(draft.capas.slice(0, i + 1).filter((x) => isImageLayer(x) && x.rol !== "personaje" && x.rol !== "fondo").length);
  }

  const sealKind = !draft.sello ? "none" : isImageSeal(draft.sello) ? "image" : "text";
  let imageN = 0;

  return (
    <section className="space-y-4 border-t border-ui-line pt-5" data-testid="layers-editor" aria-labelledby={`layers-${card.id}`}>
      <div className="space-y-1">
        <h3 id={`layers-${card.id}`} className="text-base font-bold text-ui-text">
          {t.title} {dirty && <span className="ml-2 text-xs font-semibold text-ui-warning-text">· {t.unsaved}</span>}
        </h3>
        <p className="text-sm text-ui-text-2">{t.intro}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        {/* RF-4, RF-5, RF-14: vista previa en vivo sobre fondo oscuro; el ratón se escucha en todo el recuadro. */}
        <div className="space-y-2">
          <div
            ref={zone}
            className={`grid min-h-[360px] touch-none place-items-center rounded-l bg-ui-rail px-7 pb-6 pt-9 ${focusRing}`}
            aria-label={t.previewLabel}
            aria-describedby={`framing-hint-${card.id}`}
            tabIndex={0}
            data-testid="layers-preview"
            onPointerDownCapture={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDownCapture={onKeyDown}
          >
            {preview ? <CartaCapas tier={tier} image={card.midUrl ?? ""} config={preview} label={card.name || t.previewLabel} zone={zone} className="w-full" /> : <p className="px-2 text-center text-sm text-ui-text-3">{t.empty}</p>}
          </div>
          <p className="text-xs text-ui-text-3">{t.previewHint}</p>
          <p id={`framing-hint-${card.id}`} className="text-xs text-ui-text-3">
            {t.framing.hint}
          </p>
        </div>

        <div className="min-w-0 space-y-4">
          {/* Spec 017, RF-4 y RF-5: la chica no se quita; se sustituye conservando el encuadre. */}
          {characterIndex >= 0 && (
            <div className="space-y-2 rounded-l border border-ui-line bg-ui-nav p-3" data-testid="layers-character">
              <h4 className="text-sm font-bold text-ui-text">{t.character.title}</h4>
              <div className="flex flex-wrap items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- capa privada servida por la API del panel */}
                <img src={asset((draft.capas[characterIndex] as ImageLayer).key)} alt="" className="h-16 w-12 shrink-0 rounded-s bg-ui-rail object-contain" />
                <p className="min-w-0 flex-1 text-xs text-ui-text-3">{t.characterLocked}</p>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ui-hover px-4 py-2 text-sm font-semibold text-ui-text hover:bg-ui-line">
                  {t.character.replace}
                  <input type="file" accept="image/png,image/webp" className="sr-only" onChange={(e) => void replaceGirl(e.target.files).finally(() => (e.target.value = ""))} data-testid="layers-replace-character" />
                </label>
              </div>
            </div>
          )}

          {/* Spec 017, RF-8: fondo de la biblioteca de la colección o propio de la carta. */}
          <div className="space-y-2 rounded-l border border-ui-line bg-ui-nav p-3" data-testid="layers-background">
            <h4 className="text-sm font-bold text-ui-text">{t.background.title}</h4>
            {!backgroundLayer && <p className="text-xs text-ui-warning-text">{t.background.missing}</p>}
            <Tabs
              label={t.background.title}
              defaultValue={backgroundLayer && !backgrounds.some((b) => b.key === backgroundLayer.key) ? "own" : "library"}
              items={[
                {
                  value: "library",
                  label: t.background.library,
                  content:
                    backgrounds.length === 0 ? (
                      <p className="text-xs text-ui-text-3">{t.background.noLibrary}</p>
                    ) : (
                      <ul className="flex flex-wrap gap-2">
                        {backgrounds.map((b) => {
                          const chosen = backgroundLayer?.key === b.key;
                          return (
                            <li key={b.key}>
                              <button
                                type="button"
                                aria-label={t.background.choose(b.name)}
                                aria-pressed={chosen}
                                title={b.name}
                                onClick={() => update((c) => setBackground(c, b.key))}
                                className={`block w-14 overflow-hidden rounded-s border-2 ${chosen ? "border-ui-accent" : "border-transparent hover:border-ui-line"}`}
                                data-testid="layers-background-option"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element -- fondo privado servido por la API del panel */}
                                <img src={b.url} alt="" className="aspect-[700/991] w-full object-cover" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ),
                },
                {
                  value: "own",
                  label: t.background.own,
                  content: (
                    <div className="flex flex-wrap items-center gap-3">
                      {backgroundLayer && !backgrounds.some((b) => b.key === backgroundLayer.key) && (
                        // eslint-disable-next-line @next/next/no-img-element -- capa privada servida por la API del panel
                        <img src={asset(backgroundLayer.key)} alt="" className="aspect-[700/991] w-14 rounded-s object-cover" />
                      )}
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ui-hover px-4 py-2 text-sm font-semibold text-ui-text hover:bg-ui-line">
                        <Plus className="size-4" aria-hidden />
                        {t.background.uploadOwn}
                        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => void uploadOwnBackground(e.target.files).finally(() => (e.target.value = ""))} data-testid="layers-background-upload" />
                      </label>
                    </div>
                  ),
                },
              ]}
            />
          </div>

          {/* Spec 017, RF-10 y RF-11: encuadre de la capa elegida con números; también arrastrando y con el teclado. */}
          {selLayer && (
            <div className="space-y-3 rounded-l border border-ui-line bg-ui-nav p-3" data-testid="layers-framing">
              <h4 className="text-sm font-bold text-ui-text">{t.framing.title}</h4>
              <div className="grid gap-3 sm:grid-cols-5">
                <Select
                  label={t.framing.layer}
                  value={String(sel)}
                  onValueChange={(v) => setSelected(Number(v))}
                  options={draft.capas.flatMap((l, i) => (isImageLayer(l) ? [{ value: String(i), label: roleLabel(l, i) }] : []))}
                />
                <TextField label={t.framing.x} type="number" step={1} min={-100} max={100} value={framingOf(selLayer).x} onChange={(e) => setFraming(sel, { x: numberOr(e.target.value, 0) })} data-testid="framing-x" />
                <TextField label={t.framing.y} type="number" step={1} min={-100} max={100} value={framingOf(selLayer).y} onChange={(e) => setFraming(sel, { y: numberOr(e.target.value, 0) })} data-testid="framing-y" />
                <TextField label={t.framing.scale} type="number" step={5} min={10} max={400} value={Math.round(framingOf(selLayer).escala * 100)} onChange={(e) => setFraming(sel, { escala: (numberOr(e.target.value, 100) ?? 100) / 100 })} data-testid="framing-scale" />
                <TextField label={t.framing.rotation} type="number" step={1} min={-180} max={180} value={framingOf(selLayer).giro} onChange={(e) => setFraming(sel, { giro: numberOr(e.target.value, 0) })} data-testid="framing-rotation" />
              </div>
              <Button size="sm" variant="ghost" onClick={() => update((c) => ({ ...c, capas: c.capas.map((l, j) => (j === sel && isImageLayer(l) ? resetFraming(l) : l)) }))} data-testid="framing-reset">
                {t.framing.reset}
              </Button>
            </div>
          )}

          {/* Spec 017, RF-13 y RF-14: estilo automático (sigue a la rareza) o manual. */}
          <div className="space-y-1 rounded-l border border-ui-line bg-ui-nav p-3" data-testid="layers-style">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-ui-text">{t.style.title}</h4>
              <Badge tone={autoStyle ? "success" : "neutral"}>{autoStyle ? t.style.auto(card.rarity ? tt.common.rarity[card.rarity] : "—", tier.toUpperCase()) : t.style.manual}</Badge>
            </div>
            <p className="text-xs text-ui-text-3">{autoStyle ? t.style.autoNote : t.style.manualNote}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ui-hover px-4 py-2 text-sm font-semibold text-ui-text hover:bg-ui-line">
              <Plus className="size-4" aria-hidden />
              {t.upload}
              <input type="file" multiple accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => void addLayers(e.target.files).finally(() => (e.target.value = ""))} data-testid="layers-upload" />
            </label>
            <Button size="sm" variant="secondary" icon={<Sparkles className="size-4" aria-hidden />} onClick={() => update((c) => ({ ...c, capas: [...c.capas, { particulas: "destellos-dorados", cantidad: 40, semilla: randomSeed(), profundidad: 0.55, margen: 4 }] }))}>
              {t.addParticles}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => update((c) => ({ ...applyTierStyle(c, tier, randomSeed()), estiloAuto: true }))} data-testid="layers-apply-rarity">
              {t.applyRarity}
            </Button>
          </div>

          {uploads.length > 0 && (
            <ul className="space-y-1 text-xs" data-testid="layers-uploads">
              {uploads.map((u) => (
                <li key={u.id} className={u.status === "error" ? "text-ui-danger-text" : u.status === "warning" ? "text-ui-warning-text" : "text-ui-text-2"}>
                  {u.status === "uploading" ? t.uploading(u.name) : (u.message ?? `${u.name} ✓`)}
                </li>
              ))}
            </ul>
          )}

          {draft.capas.length === 0 ? (
            <p className="text-sm text-ui-text-3">{t.empty}</p>
          ) : (
            // RF-6 a RF-10: de atrás (arriba) hacia adelante (abajo).
            <ol className="space-y-3" data-testid="layers-list">
              {draft.capas.map((l, i) => {
                const label = isImageLayer(l) ? (l.rol === "personaje" || l.rol === "fondo" ? t.roles[l.rol] : t.layerImage(++imageN)) : t.layerParticles(l.particulas);
                const locked = isImageLayer(l) && l.rol === "personaje";
                return (
                  <li key={i} className="space-y-3 rounded-l border border-ui-line bg-ui-nav p-3" data-testid="layer-row">
                    <div className="flex flex-wrap items-center gap-3">
                      {isImageLayer(l) ? (
                        // eslint-disable-next-line @next/next/no-img-element -- capa privada servida por la API del panel
                        <img src={asset(l.key)} alt="" className="h-14 w-10 shrink-0 rounded-s bg-ui-rail object-cover" />
                      ) : (
                        <span aria-hidden className="grid h-14 w-10 shrink-0 place-items-center rounded-s bg-ui-rail">
                          <Sparkles className="size-4 text-ui-text-3" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ui-text">{label}</span>
                      <Checkbox label={t.visible} checked={l.visible !== false} disabled={locked} onCheckedChange={(v) => setLayer(i, { visible: v })} />
                      <IconButton label={`${t.moveDown} · ${label}`} size="sm" disabled={i === 0} onClick={() => move(i, i - 1)}>
                        <ArrowUp className="size-4" aria-hidden />
                      </IconButton>
                      <IconButton label={`${t.moveUp} · ${label}`} size="sm" disabled={i === draft.capas.length - 1} onClick={() => move(i, i + 1)}>
                        <ArrowDown className="size-4" aria-hidden />
                      </IconButton>
                      <IconButton label={`${t.removeLayer} · ${label}`} size="sm" disabled={locked} title={locked ? t.characterLocked : undefined} onClick={() => update((c) => ({ ...c, capas: c.capas.filter((_, j) => j !== i) }))}>
                        <Trash2 className="size-4" aria-hidden />
                      </IconButton>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-4">
                      {!isImageLayer(l) && (
                        <Select label={t.particleType} value={l.particulas} onValueChange={(v) => setLayer(i, { particulas: v as (typeof PARTICLE_TYPES)[number] })} options={PARTICLE_TYPES.map((p) => ({ value: p, label: p }))} />
                      )}
                      <TextField label={t.depth} type="number" step={0.05} min={-3} max={3} value={l.profundidad ?? 1} onChange={(e) => setLayer(i, { profundidad: numberOr(e.target.value, undefined) })} />
                      <TextField label={t.margin} type="number" step={1} min={0} max={30} value={l.margen ?? 0} onChange={(e) => setLayer(i, { margen: numberOr(e.target.value, undefined) })} />
                      <Select label={t.blend} value={l.mezcla ?? "normal"} onValueChange={(v) => setLayer(i, { mezcla: v as (typeof BLEND_MODES)[number] })} options={BLEND_MODES.map((m) => ({ value: m, label: m }))} />
                      <TextField label={t.opacity} type="number" step={0.05} min={0} max={1} value={l.opacidad ?? 1} onChange={(e) => setLayer(i, { opacidad: numberOr(e.target.value, undefined) })} />
                      {!isImageLayer(l) && (
                        <>
                          <TextField label={t.amount} type="number" step={1} min={0} max={200} value={l.cantidad ?? 40} onChange={(e) => setLayer(i, { cantidad: numberOr(e.target.value, undefined) })} />
                          <TextField label={t.size} type="number" step={0.1} min={0.2} max={5} value={l.tamano ?? 1} onChange={(e) => setLayer(i, { tamano: numberOr(e.target.value, undefined) })} />
                          <TextField label={t.speed} type="number" step={0.1} min={0.2} max={5} value={l.velocidad ?? 1} onChange={(e) => setLayer(i, { velocidad: numberOr(e.target.value, undefined) })} />
                          <TextField label={t.color} value={l.color ?? ""} maxLength={7} onChange={(e) => setLayer(i, { color: /^#[0-9a-fA-F]{6}$/.test(e.target.value) ? e.target.value : undefined })} />
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {/* RF-11 y RF-12: marco de rareza y sello (texto o imagen) en una esquina. */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Select label={t.frame} value={draft.marco} onValueChange={(v) => update((c) => ({ ...c, marco: v as (typeof TIERS)[number] }))} options={TIERS.map((x) => ({ value: x, label: x.toUpperCase() }))} />
            <Select
              label={t.seal}
              value={sealKind}
              onValueChange={(v) =>
                update((c) => ({ ...c, sello: v === "none" ? null : v === "text" ? { texto: tier.toUpperCase(), estilo: "oro", esquina: c.sello?.esquina ?? "sup-izq", tamano: 14 } : c.sello && isImageSeal(c.sello) ? c.sello : null }))
              }
              options={[
                { value: "none", label: t.sealNone },
                { value: "text", label: t.sealText },
                { value: "image", label: t.sealImage },
              ]}
            />
            {draft.sello && (
              <Select label={t.sealCorner} value={draft.sello.esquina} onValueChange={(v) => update((c) => (c.sello ? { ...c, sello: { ...c.sello, esquina: v as (typeof CORNERS)[number] } } : c))} options={CORNERS.map((x) => ({ value: x, label: t.corners[x] }))} />
            )}
          </div>
          {draft.sello && !isImageSeal(draft.sello) && (
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField label={t.sealTextLabel} value={draft.sello.texto} maxLength={8} onChange={(e) => update((c) => (c.sello && !isImageSeal(c.sello) ? { ...c, sello: { ...c.sello, texto: e.target.value } } : c))} />
              <Select label={t.sealStyle} value={draft.sello.estilo} onValueChange={(v) => update((c) => (c.sello && !isImageSeal(c.sello) ? { ...c, sello: { ...c.sello, estilo: v as (typeof SEAL_STYLES)[number] } } : c))} options={SEAL_STYLES.map((s) => ({ value: s, label: s }))} />
              <TextField label={t.sealSize} type="number" step={1} min={4} max={40} value={draft.sello.tamano ?? 14} onChange={(e) => update((c) => (c.sello ? { ...c, sello: { ...c.sello, tamano: numberOr(e.target.value, undefined) } } : c))} />
            </div>
          )}
          {sealKind === "image" ? (
            <div className="flex flex-wrap items-center gap-3">
              {isImageSeal(draft.sello) && (
                // eslint-disable-next-line @next/next/no-img-element -- sello privado servido por la API del panel
                <img src={asset(draft.sello.key)} alt="" className="h-12 rounded-s bg-ui-rail object-contain p-1" />
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ui-hover px-4 py-2 text-sm font-semibold text-ui-text hover:bg-ui-line">
                <Plus className="size-4" aria-hidden />
                {t.sealUpload}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => void setSealImage(e.target.files).finally(() => (e.target.value = ""))} />
              </label>
            </div>
          ) : null}

          {conflict && (
            <div data-testid="layers-conflict">
              <Alert
                tone="warning"
                title={t.conflictTitle}
                actions={
                  <>
                    <Button size="sm" variant="secondary" onClick={() => void reload()} data-testid="layers-reload">
                      {t.reload}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => void forceSave()} disabled={busy} data-testid="layers-force">
                      {t.forceSave}
                    </Button>
                  </>
                }
              >
                {t.conflictBody}
              </Alert>
            </div>
          )}
          {notice && (
            <div data-testid="layers-notice">
              <Alert tone={notice.tone}>{notice.text}</Alert>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void send("PUT")} loading={busy} disabled={!dirty || conflict} data-testid="layers-save">
              {t.save}
            </Button>
            {/* Spec 017, RF-5: una carta con chica no vuelve a la imagen original. */}
            {saved && characterIndex < 0 && (
              <Button variant="danger" onClick={() => void removeAll()} disabled={busy || !card.hasOriginal} title={card.hasOriginal ? undefined : t.cannotRemoveAll} data-testid="layers-remove">
                {t.removeAll}
              </Button>
            )}
            {saved && characterIndex < 0 && !card.hasOriginal && <p className="text-xs text-ui-text-3">{t.cannotRemoveAll}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
