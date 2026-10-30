"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BLEND_MODES,
  BORDER_RANGE,
  CORNERS,
  DEFAULT_GLOSS_INTENSITY,
  DEFAULT_HOLO_INTENSITY,
  framingOf,
  GLOSS_TYPES,
  imageLayers,
  isImageLayer,
  isImageSeal,
  isVisible,
  PARTICLE_TYPES,
  resetFraming,
  SEAL_STYLES,
  setBackground,
  TIERS,
  type Frame,
  type Framing,
  type GlossType,
  type ImageLayer,
  type Layer,
  type LayersConfig,
} from "@/domain/cards/layers";
import { applyTierStyle, replaceCharacter, settleAutoStyle, TIER_PRESETS } from "@/domain/cards/layers-rarity";
import { addParticles, byNaturalName, placeUpload, planUpload, trimBox, layerToSeal, type UploadPlan } from "@/domain/cards/layers-editing";
import { parseCreatorConfig, withKeys } from "@/domain/cards/layers-io";
import { rarityTier } from "@/domain/catalog/rarity-tier";
import { useT } from "@/i18n/client";
import { useAdminLayersT } from "@/i18n/admin-layers";
import { Button, IconButton } from "@/ui/action/Button";
import { Badge } from "@/ui/content/Badge";
import { Card } from "@/ui/content/Card";
import { LayerList, LayerRow } from "@/ui/content/LayerList";
import { Tabs } from "@/ui/content/Tabs";
import { Alert } from "@/ui/feedback/Alert";
import { Checkbox } from "@/ui/form/Choice";
import { ChipGroup } from "@/ui/form/ChipGroup";
import { ColorField } from "@/ui/form/ColorField";
import { Segmented } from "@/ui/form/Segmented";
import { Select } from "@/ui/form/Select";
import { Slider } from "@/ui/form/Slider";
import { TextField } from "@/ui/form/TextField";
import { CartaCapas, type CartaCapasHandle } from "@/ui/game/CartaCapas";
import { PreviewStage } from "@/ui/game/PreviewStage";
import cartaCapas from "@/ui/game/carta-capas/carta-capas.js";
import type { CartaCapasApi } from "@/ui/game/carta-capas/carta-capas";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Shuffle, Sparkles, X } from "@/ui/icons/glyphs";
import { useConfirm } from "@/ui/overlay/Confirm";
import { focusRing } from "@/ui/focus";
import { cx } from "@/ui/variants";
import type { CardDTO } from "./types";
import { LibraryPicker, type LibraryEntry } from "@/features/admin/library/LibraryPicker";
import { SaveToLibraryDialog, type SaveTarget } from "@/features/admin/library/SaveToLibraryDialog";
import { kindForLayer, layerFromPreset } from "@/domain/cards/library";

type Notice = { tone: "success" | "warning" | "danger"; text: string } | null;
type Upload = { id: number; name: string; status: "uploading" | "ok" | "warning" | "error"; message?: string };

const lib = cartaCapas as unknown as CartaCapasApi;
const asset = (key: string) => `/api/admin/assets/${key}`;
const emptyConfig = (card: CardDTO): LayersConfig => ({ capas: [], marco: rarityTier(card.rarity), sello: null });
const randomSeed = () => 1 + Math.floor(Math.random() * 9_999);
/** Profundidad y margen de partida de la capa n (0 = fondo): el fondo casi quieto y con margen, el resto delante. */
const defaultsFor = (n: number) => (n === 0 ? { profundidad: 0.2, margen: 5 } : { profundidad: Math.round((0.7 + n * 0.3) * 100) / 100 });
const DEFAULT_CUSTOM = { color: "#6d5cff", brillo: "#d7ff3a" };
const fixed = (v: number) => v.toFixed(2);
const percent = (v: number) => `${Math.round(v * 100)} %`;

/** Cambia las claves del almacén por enlaces del panel, para la vista previa (spec 017: con el encuadre completo). */
function previewConfig(c: LayersConfig) {
  // La intensidad del holo va aparte (`view`): moverla no vuelve a montar la carta.
  const { holoIntensidad: _holoIntensidad, ...rest } = c;
  void _holoIntensidad;
  return {
    ...rest,
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

/** Spec 025, RF-13: recorte del sello a su contenido, leyendo su transparencia (imagen del mismo dominio). */
function measureSeal(key: string): Promise<ReturnType<typeof trimBox>> {
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => {
      try {
        const k = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * k));
        const h = Math.max(1, Math.round(img.naturalHeight * k));
        const cv = document.createElement("canvas");
        cv.width = w;
        cv.height = h;
        const cx2 = cv.getContext("2d");
        if (!cx2) return ok(null);
        cx2.drawImage(img, 0, 0, w, h);
        const d = cx2.getImageData(0, 0, w, h).data;
        ok(trimBox((i) => d[i * 4 + 3], w, h));
      } catch {
        ok(null);
      }
    };
    img.onerror = () => ok(null);
    img.src = asset(key);
  });
}

/** Muestra de cada marco para las fichas de rareza (los degradados de carta-capas.js). */
function frameSwatch(f: Frame, custom: LayersConfig["marcoColores"]) {
  if (f === "ninguno") return "transparent";
  if (f === "personalizado") return lib.marcoPersonalizado(custom ?? DEFAULT_CUSTOM)?.[0] ?? "transparent";
  return lib.marcos[f]?.[0] ?? "transparent";
}

/**
 * Spec 016, 017 y 025: editor de la carta por capas dentro del editor de carta del panel, con la distribución y los
 * controles del configurador de Bruno (spec 025, RF-21 a RF-26): vista previa grande en escena oscura con sus ajustes
 * debajo; a la derecha la chica, el fondo, el encuadre, la lista de capas (la de adelante arriba), la rareza y el
 * sello. Las imágenes se suben al área temporal y nada cambia en la carta hasta «Guardar capas».
 */
export function LayersEditor({ card, library = [], onSaved }: { card: CardDTO; library?: LibraryEntry[]; onSaved: (version: number) => void }) {
  const tt = useT();
  const t = useAdminLayersT();
  const v4 = t.v4;
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
  const live = useRef<CartaCapasHandle>(null);
  const seq = useRef(0);
  const [selected, setSelected] = useState(() => defaultSelection(card.layers ?? emptyConfig(card)));
  const [openRow, setOpenRow] = useState(-1);
  // Spec 025, RF-8 y RF-10: ajustes de la vista previa (no se guardan).
  const [depth, setDepth] = useState(14);
  const [tilt, setTilt] = useState(14);
  const [holoPreview, setHoloPreview] = useState(false);
  const [autoMove, setAutoMove] = useState(true);
  // Spec 017 (ampliación): biblioteca general de elementos.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saveTarget, setSaveTarget] = useState<SaveTarget | null>(null);
  const backgrounds = library.filter((i): i is LibraryEntry & { key: string; url: string } => i.kind === "fondo" && Boolean(i.key && i.url));
  const librarySeals = library.filter((i): i is LibraryEntry & { key: string; url: string } => i.kind === "sello" && Boolean(i.key && i.url));
  const libraryKeys = new Set(library.map((i) => i.key).filter((k): k is string => Boolean(k)));
  const cardLabel = card.name || `#${String(card.number).padStart(3, "0")}`;
  const drag = useRef<{ x0: number; y0: number; width: number; start: Framing; next: Framing; img: HTMLImageElement | null } | null>(null);

  // La vista previa solo se vuelve a montar si cambia algo distinto de la intensidad del holo.
  const { holoIntensidad: _hi, ...shape } = draft;
  void _hi;
  const shapeKey = JSON.stringify(shape);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const preview = useMemo(() => (imageLayers(draft).some(isVisible) ? previewConfig(draft) : null), [shapeKey]);
  const holoIntensity = draft.holoIntensidad ?? DEFAULT_HOLO_INTENSITY;
  const view = useMemo(() => ({ profundidad: depth, inclinacion: tilt, reposo: autoMove, holoIntensidad: holoIntensity }), [depth, tilt, autoMove, holoIntensity]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved ?? emptyConfig(card));
  const tier = rarityTier(card.rarity);
  // Spec 017, RF-13 y RF-14: el mismo criterio que aplica el servidor al guardar.
  const autoStyle = Boolean(settleAutoStyle(saved, draft, tier).estiloAuto);
  const characterIndex = draft.capas.findIndex((l) => isImageLayer(l) && l.rol === "personaje");
  const backgroundLayer = imageLayers(draft).find((l) => l.rol === "fondo");
  const sel = isImageLayer(draft.capas[selected] ?? { particulas: "nieve" }) ? selected : defaultSelection(draft);
  const selLayer = sel >= 0 ? (draft.capas[sel] as ImageLayer) : null;
  const holoShown = holoPreview || Boolean(draft.holo);

  const update = (fn: (c: LayersConfig) => LayersConfig) => setDraft((c) => fn(c));
  const setLayer = (i: number, patch: Partial<Layer>) => update((c) => ({ ...c, capas: c.capas.map((l, j) => (j === i ? ({ ...l, ...patch } as Layer) : l)) }));
  const move = (i: number, to: number) => {
    update((c) => {
      const capas = [...c.capas];
      const [l] = capas.splice(i, 1);
      capas.splice(to, 0, l);
      return { ...c, capas };
    });
    if (openRow === i) setOpenRow(to);
    if (selected === i) setSelected(to);
  };
  const removeLayer = (i: number) => {
    update((c) => ({ ...c, capas: c.capas.filter((_, j) => j !== i) }));
    setOpenRow(-1);
  };

  /** Spec 017, RF-10 y RF-11: cambia el encuadre de la capa i, dentro de sus límites. */
  const setFraming = (i: number, patch: Partial<Framing>) =>
    update((c) => {
      const l = c.capas[i];
      if (!l || !isImageLayer(l)) return c;
      const encuadre = boundFraming({ ...framingOf(l), ...patch });
      return { ...c, capas: c.capas.map((x, j) => (j === i ? { ...l, encuadre } : x)) };
    });

  // Abrir la fila de una imagen la elige también para encuadrarla.
  function toggleRow(i: number, open: boolean) {
    setOpenRow(open ? i : -1);
    if (open && isImageLayer(draft.capas[i])) setSelected(i);
  }

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

  /** Spec 025, RF-13: pone el sello de imagen y, si trae mucho espacio transparente, lo recorta a su contenido. */
  async function trimSeal(key: string) {
    const box = await measureSeal(key);
    update((c) => {
      if (!isImageSeal(c.sello) || c.sello.key !== key) return c;
      const { recorte: _r, relacion: _q, ...rest } = c.sello;
      void _r;
      void _q;
      return { ...c, sello: box ? { ...rest, ...box } : rest };
    });
    if (box) setNotice({ tone: "success", text: v4.sealCropped });
  }

  // Spec 017, RF-4: la chica nueva ocupa su capa con el mismo encuadre.
  async function replaceGirl(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploads([]);
    const key = await uploadOne(file, "character");
    if (key) update((c) => replaceCharacter(c, key));
  }

  /** Spec 017 (ampliación), RF-8: lo elegido en «Añadir de la biblioteca» (adornos y partículas se suman; fondo y sello se ponen). */
  function addFromLibrary(picked: LibraryEntry[]) {
    let sealKey: string | null = null;
    update((c) => {
      let next = c;
      let n = imageLayers(c).length;
      for (const item of picked) {
        if (item.kind === "fondo" && item.key) next = setBackground(next, item.key);
        else if (item.kind === "sello" && item.key) {
          next = { ...next, sello: { key: item.key, esquina: next.sello?.esquina ?? "sup-izq", tamano: 36 } };
          sealKey = item.key;
        } else if (item.kind === "adorno" && item.key) next = { ...next, capas: [...next.capas, { key: item.key, rol: "extra", ...defaultsFor(n++) }] };
        else if (item.kind === "particulas" && item.particles) next = { ...next, capas: [...next.capas, layerFromPreset(item.particles, randomSeed())] };
      }
      return next;
    });
    if (sealKey) void trimSeal(sealKey);
  }

  // Spec 017, RF-8: un fondo propio de esta carta (las reglas de las capas, RF-7).
  async function uploadOwnBackground(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploads([]);
    const key = await uploadOne(file, "layer");
    if (key) update((c) => setBackground(c, key));
  }

  /**
   * RF-6 y spec 025, RF-20: varias capas a la vez, ordenadas por nombre; el nombre propone su papel (fondo, chica,
   * brillo, sello…). Cada una se acepta o se rechaza con su motivo y se ponen en su sitio.
   */
  async function addLayers(files: FileList | File[] | null) {
    const list = [...(files ?? [])].filter((f) => /^image\//.test(f.type)).sort((a, b) => byNaturalName(a.name, b.name));
    if (!list.length) return;
    setUploads([]);
    // El papel de cada archivo depende de los anteriores (p. ej. solo el primer «sello» es el sello).
    let sim = draft;
    const plans: UploadPlan[] = list.map((f) => {
      const plan = planUpload(f.name, sim);
      sim = placeUpload(sim, `sim:${f.name}`, plan);
      return plan;
    });
    const keys = await Promise.all(list.map((f, i) => uploadOne(f, plans[i].kind === "seal" ? "seal" : plans[i].kind === "character" ? "character" : "layer")));
    let sealKey: string | null = null;
    update((c) => keys.reduce<LayersConfig>((acc, key, i) => (key ? placeUpload(acc, key, plans[i]) : acc), c));
    keys.forEach((key, i) => {
      if (key && plans[i].kind === "seal") sealKey = key;
    });
    if (sealKey) void trimSeal(sealKey);
  }

  async function setSealImage(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const key = await uploadOne(file, "seal");
    if (key) {
      update((c) => ({ ...c, sello: { key, esquina: c.sello?.esquina ?? "sup-izq", tamano: 36 } }));
      void trimSeal(key);
    }
  }

  /**
   * Spec 017, RF-18 y RF-19: importa una configuración del creador con sus archivos. Si algo falla (configuración no
   * válida, archivos que faltan o que no se pueden subir), la carta no cambia y se dice qué parte falla.
   */
  async function importCreator(files: FileList | null) {
    const list = [...(files ?? [])];
    if (!list.length) return;
    const fail = (text: string) => setNotice({ tone: "danger", text });
    const jsonFile = list.find((f) => f.name.toLowerCase().endsWith(".json"));
    if (!jsonFile) return fail(t.io.noJson);
    let raw: unknown;
    try {
      raw = JSON.parse(await jsonFile.text());
    } catch {
      return fail(t.io.invalid(""));
    }
    const parsed = parseCreatorConfig(raw);
    if (!parsed.ok) return fail(parsed.max ? t.io.tooMany(parsed.max) : t.io.invalid(parsed.path));
    const byName = new Map(list.map((f) => [f.name, f]));
    const missing = parsed.files.filter((f) => !byName.has(f.name)).map((f) => f.name);
    if (missing.length) return fail(t.io.missing(missing.join(", ")));
    if (characterIndex >= 0 && !parsed.config.capas.some((l) => "src" in l && l.rol === "personaje")) return fail(t.io.noCharacter);
    setUploads([]);
    setNotice(null);
    const keys: Record<string, string> = {};
    for (const f of parsed.files) {
      const key = await uploadOne(byName.get(f.name)!, f.kind);
      if (!key) return fail(t.io.failed);
      keys[f.name] = key;
    }
    // Lo importado es un estilo hecho a mano: no sigue a la rareza hasta que se aplique el de la rareza.
    const next: LayersConfig = { ...withKeys(parsed.config, keys), estiloAuto: false };
    setDraft(next);
    setSelected(defaultSelection(next));
    setOpenRow(-1);
    setNotice(parsed.changedBlends.length ? { tone: "warning", text: t.io.blends(parsed.changedBlends.join(", ")) } : { tone: "success", text: t.io.done });
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
      // Spec 018, RF-18: en una 18+ publicada, lo guardado queda pendiente de revisión.
      setNotice(
        method === "DELETE"
          ? { tone: "success", text: t.removed }
          : body.pending
            ? { tone: "warning", text: t.pending.saved }
            : body.repeated?.length
              ? { tone: "warning", text: `${t.saved} ${t.repeated}` }
              : { tone: "success", text: t.saved },
      );
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
    setOpenRow(-1);
  }

  async function forceSave() {
    if (await confirm({ title: t.forceSave, body: t.confirmForce, confirmLabel: t.forceSave, tone: "danger" })) await send("PUT", true);
  }

  async function removeAll() {
    if (await confirm({ title: t.removeAll, body: t.confirmRemoveAll, confirmLabel: t.removeAll, tone: "danger" })) await send("DELETE");
  }

  // Spec 025, RF-9: oculta el sello y lo hace entrar con su animación y el destello.
  const reveal = useRef<number | undefined>(undefined);
  function testReveal() {
    live.current?.ocultarSello();
    window.clearTimeout(reveal.current);
    reveal.current = window.setTimeout(() => live.current?.entrar(), 350);
  }
  useEffect(() => () => window.clearTimeout(reveal.current), []);

  /** Nombre de una capa: Chica, Fondo, Imagen n o el tipo de partículas. */
  function labelOf(l: Layer, i: number) {
    if (!isImageLayer(l)) return v4.particleNames[l.particulas];
    if (l.rol === "personaje" || l.rol === "fondo") return t.roles[l.rol];
    return t.layerImage(draft.capas.slice(0, i + 1).filter((x) => isImageLayer(x) && x.rol !== "personaje" && x.rol !== "fondo").length);
  }

  const sealKind = !draft.sello ? "none" : isImageSeal(draft.sello) ? "image" : "text";
  const blendOptions = BLEND_MODES.map((m) => ({ value: m, label: v4.blendNames[m] }));
  const frameOptions = [
    ...TIERS.map((x) => ({ value: x, label: TIER_PRESETS[x].seal?.texto ?? x.toUpperCase(), swatch: frameSwatch(x, draft.marcoColores) })),
    { value: "personalizado", label: v4.rarity.custom, swatch: frameSwatch("personalizado", draft.marcoColores) },
    { value: "ninguno", label: v4.rarity.none, swatch: frameSwatch("ninguno", draft.marcoColores) },
  ];
  const custom = draft.marcoColores ?? DEFAULT_CUSTOM;
  const borderValue = draft.borde ?? lib.marcos[draft.marco]?.[2] ?? 2.2;

  /** Ajustes de una capa, dentro de su fila abierta (spec 025, RF-24). */
  function layerSettings(l: Layer, i: number, label: string) {
    const locked = isImageLayer(l) && l.rol === "personaje";
    return (
      <>
        {!isImageLayer(l) && (
          <>
            <Select label={t.particleType} value={l.particulas} onValueChange={(v) => setLayer(i, { particulas: v as (typeof PARTICLE_TYPES)[number] })} options={PARTICLE_TYPES.map((p) => ({ value: p, label: v4.particleNames[p] }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Slider label={t.amount} value={l.cantidad ?? 60} min={0} max={200} onValueChange={(v) => setLayer(i, { cantidad: v })} />
              <Slider label={t.size} value={l.tamano ?? 1} min={0.3} max={2.5} step={0.05} format={fixed} onValueChange={(v) => setLayer(i, { tamano: v })} />
              <Slider label={t.speed} value={l.velocidad ?? 1} min={0.3} max={3} step={0.05} format={fixed} onValueChange={(v) => setLayer(i, { velocidad: v })} />
            </div>
            {/* Spec 025, RF-14 y RF-15: un solo color y otra variación (otra semilla). */}
            <div className="flex flex-wrap items-center gap-3">
              <Checkbox label={v4.singleColor} checked={Boolean(l.color)} onCheckedChange={(on) => setLayer(i, { color: on ? (l.color ?? "#ffd36e") : undefined })} data-testid="particles-single-color" />
              {l.color && <ColorField label={t.color} value={l.color} onValueChange={(c) => setLayer(i, { color: c })} />}
              <Button size="sm" variant="secondary" icon={<Shuffle className="size-4" aria-hidden />} onClick={() => setLayer(i, { semilla: randomSeed() })} data-testid="particles-reseed">
                {v4.reseed}
              </Button>
            </div>
          </>
        )}
        <Select label={t.blend} value={l.mezcla ?? "normal"} onValueChange={(v) => setLayer(i, { mezcla: v as (typeof BLEND_MODES)[number] })} options={blendOptions} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Slider label={t.opacity} value={l.opacidad ?? 1} min={0} max={1} step={0.01} format={percent} onValueChange={(v) => setLayer(i, { opacidad: v })} />
          <Slider label={t.depth} value={l.profundidad ?? 1} min={0} max={2.5} step={0.05} format={fixed} onValueChange={(v) => setLayer(i, { profundidad: v })} />
        </div>
        <Slider label={v4.marginLong} value={l.margen ?? 0} min={0} max={15} step={0.5} unit="%" onValueChange={(v) => setLayer(i, { margen: v })} />
        {isImageLayer(l) && (
          <>
            {/* Spec 025, RF-1 y RF-2: brillo solo sobre el dibujo de la capa. */}
            <Select
              label={v4.gloss.title}
              value={l.brillo?.tipo ?? "none"}
              onValueChange={(v) => setLayer(i, { brillo: v === "none" ? undefined : { tipo: v as GlossType, intensidad: l.brillo?.intensidad ?? DEFAULT_GLOSS_INTENSITY } })}
              options={[{ value: "none", label: v4.gloss.none }, ...GLOSS_TYPES.map((g) => ({ value: g, label: v4.gloss.types[g] }))]}
            />
            {l.brillo && (
              <Slider label={v4.gloss.intensity} value={l.brillo.intensidad ?? DEFAULT_GLOSS_INTENSITY} min={0} max={1} step={0.01} format={percent} onValueChange={(v) => setLayer(i, { brillo: { ...l.brillo!, intensidad: v } })} data-testid="layer-gloss-intensity" />
            )}
          </>
        )}
        <div className="flex flex-wrap gap-2">
          {/* Spec 025, RF-12: una imagen (no la chica) pasa a ser el sello. */}
          {isImageLayer(l) && !locked && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                update((c) => layerToSeal(c, i));
                setOpenRow(-1);
                setNotice({ tone: "success", text: v4.usedAsSeal });
                void trimSeal(l.key);
              }}
              data-testid="layer-use-as-seal"
            >
              {v4.useAsSeal}
            </Button>
          )}
          {/* Spec 017 (ampliación), RF-21: lo propio de la carta se puede guardar en la biblioteca (la chica no). */}
          {(isImageLayer(l) ? kindForLayer(l) && !libraryKeys.has(l.key) : true) && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSaveTarget(isImageLayer(l) ? { kind: kindForLayer(l)!, key: l.key, name: `${label} · ${cardLabel}` } : { kind: "particulas", particles: l, name: `${l.particulas} · ${cardLabel}` })}
              data-testid="layer-save-to-library"
            >
              {t.pick.save}
            </Button>
          )}
        </div>
      </>
    );
  }

  return (
    <section className="space-y-4 border-t border-ui-line pt-5" data-testid="layers-editor" aria-labelledby={`layers-${card.id}`}>
      <div className="space-y-1">
        <h3 id={`layers-${card.id}`} className="text-base font-bold text-ui-text">
          {t.title} {dirty && <span className="ml-2 text-xs font-semibold text-ui-warning-text">· {t.unsaved}</span>}
        </h3>
        <p className="text-sm text-ui-text-2">{t.intro}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
        {/* Spec 025, RF-21: vista previa grande en escena oscura y, debajo, sus ajustes. Acompaña al bajar. */}
        <div className="min-w-0 space-y-3 self-start lg:sticky lg:top-0">
          <PreviewStage
            ref={zone}
            className={cx("min-h-[420px]", focusRing)}
            hint={v4.stageHint}
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
            {preview ? (
              <CartaCapas ref={live} tier={tier} image={card.midUrl ?? ""} config={preview} holo={holoPreview} view={view} label={card.name || t.previewLabel} zone={zone} className="w-full max-w-[300px]" />
            ) : (
              <p className="px-2 text-center text-sm text-ui-text-3">{t.empty}</p>
            )}
          </PreviewStage>

          {/* Spec 025, RF-8 a RF-10: ajustes de la vista previa (no se guardan) y la intensidad del holo (se guarda). */}
          <Card className="space-y-4" data-testid="layers-preview-controls">
            <div className="grid gap-4 sm:grid-cols-2">
              <Slider label={v4.preview.depth} value={depth} min={0} max={30} unit=" px" onValueChange={setDepth} data-testid="preview-depth" />
              <Slider label={v4.preview.tilt} value={tilt} min={0} max={26} unit="°" onValueChange={setTilt} data-testid="preview-tilt" />
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Checkbox label={v4.preview.holo} checked={holoShown} disabled={Boolean(draft.holo)} onCheckedChange={setHoloPreview} data-testid="preview-holo" />
              <Checkbox label={v4.preview.autoMove} checked={autoMove} onCheckedChange={setAutoMove} data-testid="preview-auto-move" />
              <Button size="sm" variant="secondary" onClick={testReveal} disabled={!preview} data-testid="layers-test-reveal">
                {v4.preview.reveal}
              </Button>
            </div>
            {holoShown && (
              <Slider
                label={v4.preview.holoIntensity}
                value={holoIntensity}
                min={0}
                max={1}
                step={0.01}
                format={percent}
                onValueChange={(v) => update((c) => ({ ...c, holoIntensidad: v }))}
                data-testid="layers-holo-intensity"
              />
            )}
            <p className="text-xs text-ui-text-3">{v4.preview.note}</p>
          </Card>
          <p id={`framing-hint-${card.id}`} className="text-xs text-ui-text-3">
            {t.framing.hint}
          </p>
        </div>

        <div className="min-w-0 space-y-4">
          {/* Spec 017, RF-4 y RF-5: la chica no se quita; se sustituye conservando el encuadre. */}
          {characterIndex >= 0 && (
            <Card title={t.character.title} data-testid="layers-character">
              <div className="flex flex-wrap items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- capa privada servida por la API del panel */}
                <img src={asset((draft.capas[characterIndex] as ImageLayer).key)} alt="" className="h-16 w-12 shrink-0 rounded-s bg-ui-rail object-contain" />
                <p className="min-w-0 flex-1 text-xs text-ui-text-3">{t.characterLocked}</p>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ui-hover px-4 py-2 text-sm font-semibold text-ui-text hover:bg-ui-line">
                  {t.character.replace}
                  <input type="file" accept="image/png,image/webp" className="sr-only" onChange={(e) => void replaceGirl(e.target.files).finally(() => (e.target.value = ""))} data-testid="layers-replace-character" />
                </label>
              </div>
            </Card>
          )}

          {/* Spec 017, RF-8: fondo de la biblioteca de la colección o propio de la carta. */}
          <Card title={t.background.title} data-testid="layers-background">
            {!backgroundLayer && <p className="mb-2 text-xs text-ui-warning-text">{t.background.missing}</p>}
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
          </Card>

          {/* Spec 017, RF-10 y RF-11: encuadre de la capa elegida; también arrastrando y con el teclado. */}
          {selLayer && (
            <Card title={t.framing.title} className="space-y-4" data-testid="layers-framing">
              <Select
                label={t.framing.layer}
                value={String(sel)}
                onValueChange={(v) => setSelected(Number(v))}
                options={draft.capas.flatMap((l, i) => (isImageLayer(l) ? [{ value: String(i), label: labelOf(l, i) }] : []))}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Slider label={t.framing.x} value={framingOf(selLayer).x} min={-100} max={100} unit="%" onValueChange={(v) => setFraming(sel, { x: v })} data-testid="framing-x" />
                <Slider label={t.framing.y} value={framingOf(selLayer).y} min={-100} max={100} unit="%" onValueChange={(v) => setFraming(sel, { y: v })} data-testid="framing-y" />
                <Slider label={t.framing.scale} value={Math.round(framingOf(selLayer).escala * 100)} min={10} max={400} step={5} unit="%" onValueChange={(v) => setFraming(sel, { escala: v / 100 })} data-testid="framing-scale" />
                <Slider label={t.framing.rotation} value={framingOf(selLayer).giro} min={-180} max={180} unit="°" onValueChange={(v) => setFraming(sel, { giro: v })} data-testid="framing-rotation" />
              </div>
              <Button size="sm" variant="ghost" onClick={() => update((c) => ({ ...c, capas: c.capas.map((l, j) => (j === sel && isImageLayer(l) ? resetFraming(l) : l)) }))} data-testid="framing-reset">
                {t.framing.reset}
              </Button>
            </Card>
          )}

          {/* Spec 017, RF-13 y RF-14: estilo automático (sigue a la rareza) o manual. */}
          <Card data-testid="layers-style">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-ui-text">{t.style.title}</h4>
              <Badge tone={autoStyle ? "success" : "neutral"}>{autoStyle ? t.style.auto(card.rarity ? tt.common.rarity[card.rarity] : "—", tier.toUpperCase()) : t.style.manual}</Badge>
            </div>
            <p className="mt-1 text-xs text-ui-text-3">{autoStyle ? t.style.autoNote : t.style.manualNote}</p>
          </Card>

          {/* Spec 025, RF-23 y RF-24: la lista de capas del configurador. */}
          <Card title={v4.layersTitle} aside={<span className="text-xs font-extrabold uppercase italic tracking-wide text-ui-accent-text">{draft.capas.length ? v4.layersCount(draft.capas.length) : ""}</span>} className="space-y-3">
            <label
              className={cx("block cursor-pointer rounded-m border-2 border-dashed border-ui-line px-4 py-5 text-center transition-colors hover:border-ui-accent", focusRing)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void addLayers(e.dataTransfer.files);
              }}
            >
              <span className="block text-sm font-extrabold uppercase italic tracking-wide text-ui-text">{v4.dropTitle}</span>
              <span className="mt-1 block text-xs text-ui-text-3">{v4.dropHint}</span>
              <input type="file" multiple accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => void addLayers(e.target.files).finally(() => (e.target.value = ""))} data-testid="layers-upload" />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setPickerOpen(true)} data-testid="library-picker-open">
                {t.pick.open}
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

            <LayerList
              frontLabel={v4.front}
              backLabel={v4.back}
              data-testid="layers-list"
              action={
                <Button size="sm" icon={<Sparkles className="size-4" aria-hidden />} onClick={() => update((c) => addParticles(c, randomSeed()))}>
                  {t.addParticles}
                </Button>
              }
            >
              {draft.capas.length === 0 && <li className="text-sm text-ui-text-3">{t.empty}</li>}
              {/* La de adelante arriba: se recorre al revés. */}
              {draft.capas
                .map((l, i) => ({ l, i }))
                .reverse()
                .map(({ l, i }) => {
                  const label = labelOf(l, i);
                  const locked = isImageLayer(l) && l.rol === "personaje";
                  const shown = l.visible !== false;
                  const blend = v4.blendNames[l.mezcla ?? "normal"];
                  return (
                    <LayerRow
                      key={i}
                      data-testid="layer-row"
                      open={openRow === i}
                      onOpenChange={(o) => toggleRow(i, o)}
                      thumb={
                        isImageLayer(l) ? (
                          // eslint-disable-next-line @next/next/no-img-element -- capa privada servida por la API del panel
                          <img src={asset(l.key)} alt="" className="size-full object-contain" />
                        ) : (
                          <Sparkles className="size-4 text-ui-k-oro" aria-hidden />
                        )
                      }
                      title={
                        <>
                          {label}
                          {isImageLayer(l) && libraryKeys.has(l.key) && <span className="ml-2 text-xs font-normal text-ui-text-3">· {t.pick.fromLibrary}</span>}
                        </>
                      }
                      subtitle={isImageLayer(l) ? v4.summary(blend, fixed(l.profundidad ?? 1), Boolean(l.brillo)) : v4.particlesSummary(blend, fixed(l.profundidad ?? 1))}
                      actions={
                        <>
                          <IconButton
                            label={`${shown ? v4.hide : v4.show} · ${label}`}
                            size="sm"
                            aria-pressed={!shown}
                            disabled={locked}
                            title={locked ? t.characterLocked : undefined}
                            onClick={() => setLayer(i, { visible: !shown })}
                            data-testid="layer-visibility"
                          >
                            {shown ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
                          </IconButton>
                          <IconButton label={`${t.moveUp} · ${label}`} size="sm" disabled={i === draft.capas.length - 1} onClick={() => move(i, i + 1)}>
                            <ArrowUp className="size-4" aria-hidden />
                          </IconButton>
                          <IconButton label={`${t.moveDown} · ${label}`} size="sm" disabled={i === 0} onClick={() => move(i, i - 1)}>
                            <ArrowDown className="size-4" aria-hidden />
                          </IconButton>
                          <IconButton label={`${t.removeLayer} · ${label}`} size="sm" disabled={locked} title={locked ? t.characterLocked : undefined} onClick={() => removeLayer(i)}>
                            <X className="size-4" aria-hidden />
                          </IconButton>
                        </>
                      }
                    >
                      {layerSettings(l, i, label)}
                    </LayerRow>
                  );
                })}
            </LayerList>
          </Card>

          {/* Spec 025, RF-11, RF-16 y RF-25: rareza (marco) en fichas, marco personalizado y grosor del borde. */}
          <Card title={v4.rarity.title} className="space-y-4" data-testid="layers-rarity">
            <ChipGroup
              label={v4.rarity.frame}
              hideLabel
              value={draft.marco}
              options={frameOptions}
              onValueChange={(v) => update((c) => ({ ...c, marco: v as Frame, ...(v === "personalizado" && !c.marcoColores ? { marcoColores: DEFAULT_CUSTOM } : {}) }))}
              data-testid="layers-frame"
            />
            {draft.marco === "personalizado" && (
              <div className="flex flex-wrap gap-4" data-testid="layers-custom-frame">
                <ColorField label={v4.rarity.color} value={custom.color} onValueChange={(color) => update((c) => ({ ...c, marcoColores: { ...custom, color } }))} data-testid="frame-color" />
                <ColorField label={v4.rarity.shine} value={custom.brillo} onValueChange={(brillo) => update((c) => ({ ...c, marcoColores: { ...custom, brillo } }))} data-testid="frame-shine" />
              </div>
            )}
            <div className="space-y-2 rounded-m border-2 border-dashed border-ui-line p-3">
              <p className="text-xs text-ui-text-2">{v4.rarity.applyHint}</p>
              <Button size="sm" onClick={() => update((c) => ({ ...applyTierStyle(c, tier, randomSeed()), estiloAuto: true }))} data-testid="layers-apply-rarity">
                {t.applyRarity}
              </Button>
            </div>
            <Slider
              label={v4.rarity.border}
              value={borderValue}
              min={BORDER_RANGE.min}
              max={BORDER_RANGE.max}
              step={0.1}
              format={(v) => v.toFixed(1)}
              disabled={draft.marco === "ninguno"}
              onValueChange={(v) => update((c) => ({ ...c, borde: v }))}
              data-testid="layers-border"
            />
          </Card>

          {/* RF-10 y spec 025, RF-25: sello de texto o de imagen, en una esquina. */}
          <Card className="space-y-4" data-testid="layers-seal">
            <Segmented
              label={v4.seal.title}
              value={sealKind}
              onValueChange={(v) =>
                update((c) => ({
                  ...c,
                  sello:
                    v === "none"
                      ? null
                      : v === "text"
                        ? { ...(TIER_PRESETS[tier].seal ?? { texto: "EX", estilo: "oro" as const, tamano: 14 }), esquina: c.sello?.esquina ?? "sup-izq" }
                        : c.sello && isImageSeal(c.sello)
                          ? c.sello
                          : saved?.sello && isImageSeal(saved.sello)
                            ? saved.sello
                            : null,
                }))
              }
              options={[
                { value: "none", label: t.sealNone },
                { value: "text", label: t.sealText },
                { value: "image", label: t.sealImage },
              ]}
            />
            {draft.sello && !isImageSeal(draft.sello) && (
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label={t.sealTextLabel} value={draft.sello.texto} maxLength={6} onChange={(e) => update((c) => (c.sello && !isImageSeal(c.sello) ? { ...c, sello: { ...c.sello, texto: e.target.value } } : c))} />
                <Select label={t.sealStyle} value={draft.sello.estilo} onValueChange={(v) => update((c) => (c.sello && !isImageSeal(c.sello) ? { ...c, sello: { ...c.sello, estilo: v as (typeof SEAL_STYLES)[number] } } : c))} options={SEAL_STYLES.map((s) => ({ value: s, label: v4.seal.styles[s] }))} />
              </div>
            )}
            {sealKind === "image" && librarySeals.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-ui-text-2">{t.pick.sealLibrary}</p>
                <ul className="flex flex-wrap gap-2">
                  {librarySeals.map((s) => {
                    const chosen = isImageSeal(draft.sello) && draft.sello.key === s.key;
                    return (
                      <li key={s.key}>
                        <button
                          type="button"
                          aria-pressed={chosen}
                          aria-label={t.pick.choose(s.name)}
                          title={s.name}
                          onClick={() => {
                            update((c) => ({ ...c, sello: { key: s.key, esquina: c.sello?.esquina ?? "sup-izq", tamano: isImageSeal(c.sello) ? (c.sello.tamano ?? 36) : 36 } }));
                            void trimSeal(s.key);
                          }}
                          className={`grid h-14 w-20 place-items-center rounded-s border-2 bg-ui-rail p-1 ${chosen ? "border-ui-accent" : "border-transparent hover:border-ui-line"}`}
                          data-testid="layers-seal-option"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- sello privado servido por la API del panel */}
                          <img src={s.url} alt="" className="max-h-full max-w-full object-contain" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {sealKind === "image" && (
              <div className="flex flex-wrap items-center gap-3 rounded-m border-2 border-ui-line p-2">
                {isImageSeal(draft.sello) && (
                  // eslint-disable-next-line @next/next/no-img-element -- sello privado servido por la API del panel
                  <img src={asset(draft.sello.key)} alt="" className="h-10 rounded-s bg-ui-rail object-contain p-1" />
                )}
                <label className="ml-auto inline-flex cursor-pointer items-center gap-2 rounded-full bg-ui-hover px-4 py-2 text-sm font-semibold text-ui-text hover:bg-ui-line">
                  <Plus className="size-4" aria-hidden />
                  {isImageSeal(draft.sello) ? v4.seal.choose : t.sealUpload}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => void setSealImage(e.target.files).finally(() => (e.target.value = ""))} data-testid="layers-seal-upload" />
                </label>
                {isImageSeal(draft.sello) && !libraryKeys.has(draft.sello.key) && (
                  <Button size="sm" variant="secondary" onClick={() => isImageSeal(draft.sello) && setSaveTarget({ kind: "sello", key: draft.sello.key, name: `${t.seal} · ${cardLabel}` })} data-testid="seal-save-to-library">
                    {t.pick.save}
                  </Button>
                )}
              </div>
            )}
            {draft.sello && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Select label={t.sealCorner} value={draft.sello.esquina} onValueChange={(v) => update((c) => (c.sello ? { ...c, sello: { ...c.sello, esquina: v as (typeof CORNERS)[number] } } : c))} options={CORNERS.map((x) => ({ value: x, label: t.corners[x] }))} />
                {isImageSeal(draft.sello) ? (
                  <Slider label={t.sealSize} value={draft.sello.tamano ?? 36} min={10} max={60} unit="%" onValueChange={(v) => update((c) => (c.sello ? { ...c, sello: { ...c.sello, tamano: v } } : c))} data-testid="seal-size" />
                ) : (
                  <Slider label={t.sealSize} value={draft.sello.tamano ?? 14} min={8} max={26} onValueChange={(v) => update((c) => (c.sello ? { ...c, sello: { ...c.sello, tamano: v } } : c))} data-testid="seal-size" />
                )}
              </div>
            )}
          </Card>

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
            {/* Spec 017, RF-17 y RF-18: el formato del creador de cartas. */}
            {saved && (
              <Button variant="secondary" asChild title={t.io.exportHint}>
                <a href={`/api/admin/cards/${card.id}/layers/export`} download data-testid="layers-export">
                  {t.io.export}
                </a>
              </Button>
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ui-hover px-4 py-2 text-sm font-semibold text-ui-text hover:bg-ui-line" title={t.io.importHint}>
              {t.io.import}
              <input type="file" multiple accept="application/json,.json,image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => void importCreator(e.target.files).finally(() => (e.target.value = ""))} data-testid="layers-import" />
            </label>
            {/* Spec 017, RF-5: una carta con chica no vuelve a la imagen original. */}
            {saved && characterIndex < 0 && (
              <Button variant="danger" onClick={() => void removeAll()} disabled={busy || !card.hasOriginal} title={card.hasOriginal ? undefined : t.cannotRemoveAll} data-testid="layers-remove">
                {t.removeAll}
              </Button>
            )}
            {saved && characterIndex < 0 && !card.hasOriginal && <p className="text-xs text-ui-text-3">{t.cannotRemoveAll}</p>}
          </div>
          <p className="text-xs text-ui-text-3">{t.io.importHint}</p>
        </div>
      </div>
      <LibraryPicker open={pickerOpen} onOpenChange={setPickerOpen} items={library} onPick={addFromLibrary} />
      <SaveToLibraryDialog target={saveTarget} onClose={() => setSaveTarget(null)} />
    </section>
  );
}
