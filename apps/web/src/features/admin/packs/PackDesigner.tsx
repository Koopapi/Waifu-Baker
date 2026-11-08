"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PackKind } from "@/domain/catalog/default-odds";
import { BLEND_MODES, PARTICLE_TYPES } from "@/domain/cards/layers";
import {
  BRAND_SEALS,
  DEFAULT_BADGE_COLOR,
  designRefs,
  emptyDesign,
  isPackImageLayer,
  MAX_BADGE_TEXT,
  PACK_GLOSS,
  PACK_PATTERNS,
  patternPath,
  toRegistro,
  UPLOAD_REF,
  type PackDesign,
  type PackGloss,
  type PackImageLayer,
  type PackInfo,
  type PackLayer,
  type PackParticleLayer,
  type PackPattern,
  type PackPatternRef,
} from "@/domain/packs/design";
import { addParticles, byName, exportRegistro, placeUpload, reviewDesign, type ReviewIssue } from "@/domain/packs/editor";
import { exampleDesign, PACK_EXAMPLE_FILES } from "@/domain/packs/example";
import { useT } from "@/i18n/client";
import { useAdminPacksT } from "@/i18n/admin-packs";
import { Button, IconButton } from "@/ui/action/Button";
import { Badge } from "@/ui/content/Badge";
import { Card } from "@/ui/content/Card";
import { LayerList, LayerRow } from "@/ui/content/LayerList";
import { Alert } from "@/ui/feedback/Alert";
import { SaveStatus } from "@/ui/feedback/SaveStatus";
import { useToast } from "@/ui/feedback/Toast";
import { Checkbox } from "@/ui/form/Choice";
import { ChipGroup } from "@/ui/form/ChipGroup";
import { ColorField } from "@/ui/form/ColorField";
import { Segmented } from "@/ui/form/Segmented";
import { Select } from "@/ui/form/Select";
import { Slider } from "@/ui/form/Slider";
import { TextField } from "@/ui/form/TextField";
import { dibujarMiniatura } from "@/ui/game/sobre-capas/miniatura";
import type { SobreRegistro } from "@/ui/game/sobre-capas/sobre-capas";
import { ArrowDown, ArrowUp, Eye, EyeOff, Shuffle, Sparkles, X } from "@/ui/icons/glyphs";
import { useConfirm } from "@/ui/overlay/Confirm";
import { focusRing } from "@/ui/focus";
import { cx } from "@/ui/variants";
import { DesignerStage, type SampleCard, type Scene } from "./DesignerStage";
import { inspect, isAccepted, type DesignFile } from "./designer-files";
import "./pack-designer.css";

const asset = (key: string) => `/api/admin/assets/${key}`;
const fixed2 = (v: number) => v.toFixed(2);
const pct = (v: number) => `${Math.round(v * 100)}%`;
const times = (v: number) => `×${v.toFixed(2)}`;
const randomSeed = () => 1 + Math.floor(Math.random() * 9998);
const r3 = (v: number) => Math.round(v * 1000) / 1000;

type LogoChoice = "texto" | "imagen" | "ninguno";
type WavesChoice = "auto" | "css" | "archivo" | PackPattern;
type SealChoice = "ninguno" | "archivo" | PackPattern;

export interface PackDesignerProps {
  set: { id: string; code: string; name: string; packSize: number };
  kind: PackKind;
  kindLabel: string;
  /** El diseño guardado (claves del almacén) o `null` si aún no tiene. */
  initial: PackDesign | null;
  savedAt: string | null;
  samples: SampleCard[];
}

/**
 * Spec 030, RF-1 a RF-13: el editor de sobres del panel, con la misma distribución, controles y textos que el creador de
 * Bruno (`docs/waifu-baker/sobres/src/creador-sobres.html`) y los componentes del editor de cartas: a la izquierda la
 * vista previa y sus controles rápidos; a la derecha capas, revisión, sobre, sellos y el registro. Guardar sube las
 * imágenes nuevas, la miniatura y el diseño en una sola petición (RF-10); al volver se cargan las guardadas (RF-11).
 */
export function PackDesigner({ set, kind, kindLabel, initial, savedAt: savedAtProp, samples }: PackDesignerProps) {
  const t = useAdminPacksT();
  const tt = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const info: PackInfo = useMemo(() => ({ nombre: set.name, codigo: set.code, cartas: set.packSize }), [set]);

  const [design, setDesign] = useState<PackDesign>(() => initial ?? emptyDesign(kind));
  const [saved, setSaved] = useState(() => JSON.stringify(initial ?? null));
  const [savedAt, setSavedAt] = useState<string | null>(savedAtProp);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<Record<string, DesignFile>>({});
  const [openRow, setOpenRow] = useState<number | null>(null);
  // Solo de la vista previa (no se guardan).
  const [tilt, setTilt] = useState(1);
  const [guides, setGuides] = useState(false);
  const [autoMove, setAutoMove] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [scene, setScene] = useState<Scene>("rayos");
  const uploadN = useRef(0);
  const dirty = JSON.stringify(design) !== saved;

  // RF-11: las imágenes guardadas se cargan del almacén (sin volver a subirlas) y se revisan.
  useEffect(() => {
    if (!initial) return;
    for (const key of designRefs(initial)) {
      const layer = initial.capas.find((l): l is PackImageLayer => isPackImageLayer(l) && l.key === key);
      const name = layer?.nombre || (typeof initial.logo === "object" && initial.logo.key === key ? initial.logo.nombre : undefined) || key.split("/").pop()!;
      void register(key, asset(key), name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const register = useCallback(async (ref: string, url: string, name: string, file?: File) => {
    setFiles((f) => ({ ...f, [ref]: { url, name, file, width: 0, height: 0, analysis: null } }));
    const facts = await inspect(url);
    setFiles((f) => (f[ref] ? { ...f, [ref]: { ...f[ref], ...(facts ?? { analysis: { error: true } }) } } : f));
  }, []);

  /** RF-4: añade archivos (arrastrados o elegidos) con sus valores iniciales por nombre. */
  const addFiles = useCallback(
    async (list: FileList | File[] | null) => {
      const arr = [...(list ?? [])].filter(isAccepted).sort((a, b) => byName(a.name, b.name));
      if (arr.length === 0) return;
      let next = design;
      for (const f of arr) {
        const ref = `upload:${++uploadN.current}`;
        await register(ref, URL.createObjectURL(f), f.name, f);
        next = placeUpload(next, ref, f.name);
      }
      setDesign(next);
    },
    [design, register],
  );

  /** Una imagen suelta (logo o patrón propio): devuelve su marca. */
  const addOne = useCallback(
    async (f: File | undefined) => {
      if (!f || !isAccepted(f)) return null;
      const ref = `upload:${++uploadN.current}`;
      await register(ref, URL.createObjectURL(f), f.name, f);
      return ref;
    },
    [register],
  );

  // Como el creador: se pueden soltar archivos en cualquier parte de la página.
  const [over, setOver] = useState(false);
  useEffect(() => {
    let n = 0;
    const hasFiles = (e: DragEvent) => Boolean(e.dataTransfer && [...e.dataTransfer.types].includes("Files"));
    const enter = (e: DragEvent) => hasFiles(e) && (n++, setOver(true));
    const leave = () => ((n = Math.max(0, n - 1)), n === 0 && setOver(false));
    const overFn = (e: DragEvent) => hasFiles(e) && e.preventDefault();
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      n = 0;
      setOver(false);
      void addFiles(e.dataTransfer?.files ?? null);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", overFn);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", overFn);
      window.removeEventListener("drop", drop);
    };
  }, [addFiles]);

  // Con cambios sin guardar, salir de la página pregunta.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = t.leave;
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty, t.leave]);

  const has = (ref: string) => Boolean(files[ref]);
  /** La vista previa: sin las imágenes que faltan (como el creador). */
  const preview = useMemo(() => {
    const pat = (p: PackPatternRef | null | undefined) => (p && "key" in p && !files[p.key] ? null : p);
    const d: PackDesign = {
      ...design,
      capas: design.capas.filter((l) => l.visible !== false && (!isPackImageLayer(l) || files[l.key])).map((l) => (isPackImageLayer(l) && l.brillo?.patron ? { ...l, brillo: { ...l.brillo, patron: pat(l.brillo.patron) ?? undefined } } : l)),
      sellos: { ...design.sellos, patron: pat(design.sellos.patron) },
      logo: typeof design.logo === "object" && !files[design.logo.key] ? true : design.logo,
    };
    return toRegistro(d, info, (ref) => files[ref]?.url ?? "");
  }, [design, files, info]);

  const issues = useMemo(() => reviewDesign(design, info, (ref) => files[ref]), [design, info, files]);
  const missing = design.capas.filter((l) => isPackImageLayer(l) && !has(l.key)).length;
  const json = useMemo(() => {
    const nameOf = (ref: string) => files[ref]?.name ?? ref;
    const shown = toRegistro(design, info, nameOf);
    return JSON.stringify(exportRegistro(shown), null, 2);
  }, [design, info, files]);

  const update = (fn: (d: PackDesign) => PackDesign) => setDesign((d) => fn(d));
  const setLayer = (i: number, patch: Partial<PackImageLayer> | Partial<PackParticleLayer>) => update((d) => ({ ...d, capas: d.capas.map((l, j) => (j === i ? ({ ...l, ...patch } as PackLayer) : l)) }));
  const move = (from: number, to: number) =>
    update((d) => {
      const capas = [...d.capas];
      const [l] = capas.splice(from, 1);
      capas.splice(to, 0, l);
      return { ...d, capas };
    });

  /** RF-10: guarda el diseño, sus imágenes nuevas y la miniatura (500 × 875) en una sola petición. */
  const save = async () => {
    setSaving(true);
    try {
      const blob = await dibujarMiniatura(preview as unknown as SobreRegistro, { carta: tt.packs.sobre.card, cartas: tt.packs.sobre.cards });
      if (!blob) throw new Error(t.thumbFailed);
      const body = new FormData();
      body.set("setId", set.id);
      body.set("kind", kind);
      body.set("design", JSON.stringify(design));
      body.set("thumb", blob, "miniatura.png");
      for (const ref of designRefs(design).filter((r) => UPLOAD_REF.test(r))) {
        const f = files[ref]?.file;
        if (f) body.set(ref, f, f.name);
      }
      const res = await fetch("/api/admin/pack-designs", { method: "POST", body });
      const r = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; design?: PackDesign; keys?: Record<string, string>; updatedAt?: string };
      if (!r.ok || !r.design) throw new Error(r.message ?? t.saveFailed);
      const keys = r.keys ?? {};
      setFiles((f) => {
        const out = { ...f };
        for (const [ref, key] of Object.entries(keys)) if (f[ref]) out[key] = { ...f[ref], file: undefined };
        return out;
      });
      setDesign(r.design);
      setSaved(JSON.stringify(r.design));
      setSavedAt(r.updatedAt ?? new Date().toISOString());
      toast({ kind: "success", title: t.savedToast });
      router.refresh();
    } catch (e) {
      toast({ kind: "error", title: e instanceof Error && e.message ? e.message : t.saveFailed });
    } finally {
      setSaving(false);
    }
  };

  const downloadThumb = async () => {
    const blob = await dibujarMiniatura(preview as unknown as SobreRegistro, { carta: tt.packs.sobre.card, cartas: tt.packs.sobre.cards });
    if (!blob) return toast({ kind: "error", title: t.thumbFailed });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sobre-${set.code.toLowerCase()}-${kind}-miniatura.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  /** «Cargar ejemplo FA01»: las capas del paquete de Bruno como imágenes nuevas, con los ajustes de su registro. */
  const loadExample = async () => {
    try {
      const refs: Record<string, string> = {};
      for (const name of PACK_EXAMPLE_FILES.filter((n) => n.startsWith("sobre_"))) {
        const res = await fetch(`/api/admin/pack-example/${name}`);
        if (!res.ok) throw new Error();
        const file = new File([await res.blob()], name, { type: "image/webp" });
        const ref = `upload:${++uploadN.current}`;
        await register(ref, URL.createObjectURL(file), name, file);
        refs[name] = ref;
      }
      setDesign(exampleDesign((f) => refs[f]));
      setOpenRow(null);
    } catch {
      toast({ kind: "error", title: t.exampleFailed });
    }
  };

  const reset = async () => {
    if (!(await confirm({ title: t.resetTitle, body: t.resetBody, confirmLabel: t.resetConfirm, cancelLabel: t.cancel, tone: "danger" }))) return;
    setDesign(emptyDesign(kind));
    setOpenRow(null);
  };

  const logoChoice: LogoChoice = design.logo === false ? "ninguno" : design.logo === true ? "texto" : "imagen";
  const [logoWanted, setLogoWanted] = useState<LogoChoice>(logoChoice);
  const sealChoice: SealChoice = !design.sellos.patron ? "ninguno" : "incluido" in design.sellos.patron ? design.sellos.patron.incluido : "archivo";
  const [ownSeal, setOwnSeal] = useState<string | null>(design.sellos.patron && "key" in design.sellos.patron ? design.sellos.patron.key : null);
  const blendOptions = BLEND_MODES.map((m) => ({ value: m, label: t.blendNames[m] }));
  const short = (m: string | undefined) => t.blendNames[(m ?? "normal") as keyof typeof t.blendNames].replace(/ \(.*\)/, "");

  const fixedLayers: [string, string, string][] = [];
  if (design.vista === "3d") fixedLayers.push(["3D", t.fixed.plastic[0], t.fixed.plastic[1]]);
  if (set.name.trim() || set.code.trim()) fixedLayers.push(["SET", t.fixed.band, `${set.name.trim() || "—"} · ${set.code.trim() || "—"}`]);
  if (design.insignia) fixedLayers.push(["INS", t.fixed.badge, design.insignia.texto]);
  if (design.logo !== false) fixedLayers.push(["WB", t.fixed.logo, typeof design.logo === "object" ? (files[design.logo.key]?.name ?? t.fixed.logoImage) : t.fixed.logoBrand]);
  fixedLayers.push(["▲▼", t.fixed.seals, t.fixed.sealsDetail + (design.sellos.patron ? t.fixed.sealsPattern : "")]);
  if (design.foil !== false) fixedLayers.push(["FX", t.fixed.foil[0], t.fixed.foil[1]]);

  const issueText = (i: ReviewIssue) => {
    switch (i.kind) {
      case "size":
        return i.sameRatio ? t.issues.size_ratio(i.name, i.width, i.height) : t.issues.size_bad(i.name, i.width, i.height);
      case "missing_file":
      case "unreadable":
      case "transparent_background":
      case "crosses_line":
        return t.issues[i.kind](i.name);
      case "long_name":
        return t.issues.long_name(i.length);
      default:
        return t.issues[i.kind];
    }
  };

  function filePick(label: string, current: string | null, onFile: (f: File | undefined) => void, testId: string) {
    const f = current ? files[current] : null;
    return (
      <label className={cx("flex cursor-pointer items-center gap-3 rounded-m border-2 border-dashed border-ui-line p-2 hover:border-ui-accent", focusRing)}>
        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-s bg-ui-rail text-ui-text-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen privada o recién elegida */}
          {f ? <img src={f.url} alt="" className="size-full object-contain" /> : "+"}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-ui-text-2">{f ? f.name : label}</span>
        <span className="rounded-full bg-ui-hover px-3 py-1 text-xs font-semibold text-ui-text">{t.choose}</span>
        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" data-testid={testId} onChange={(e) => (onFile(e.target.files?.[0]), (e.target.value = ""))} />
      </label>
    );
  }

  function layerBody(l: PackLayer, i: number) {
    const common = (
      <>
        <Select label={t.blend} value={l.mezcla ?? "normal"} options={blendOptions} onValueChange={(v) => setLayer(i, { mezcla: v === "normal" ? undefined : (v as PackImageLayer["mezcla"]) })} />
        <div className="grid gap-4 @md:grid-cols-2">
          <Slider label={t.opacity} value={l.opacidad ?? 1} min={0} max={1} step={0.01} format={pct} onValueChange={(v) => setLayer(i, { opacidad: v })} />
          <Slider label={t.depth} value={l.profundidad ?? 1} min={0} max={2.5} step={0.05} format={fixed2} onValueChange={(v) => setLayer(i, { profundidad: v })} data-testid="layer-depth" />
        </div>
        <Slider label={t.margin} value={l.margen ?? 0} min={0} max={15} step={0.5} unit="%" onValueChange={(v) => setLayer(i, { margen: v })} />
      </>
    );
    if (!isPackImageLayer(l)) {
      return (
        <>
          <Select label={t.particleType} value={l.particulas} options={PARTICLE_TYPES.map((p) => ({ value: p, label: t.particleNames[p] }))} onValueChange={(v) => setLayer(i, { particulas: v as PackParticleLayer["particulas"], color: undefined })} />
          <div className="grid gap-4 @md:grid-cols-2">
            <Slider label={t.amount} value={l.cantidad ?? 18} min={0} max={200} onValueChange={(v) => setLayer(i, { cantidad: v })} />
            <Slider label={t.size} value={l.tamano ?? 1} min={0.3} max={2.5} step={0.05} format={times} onValueChange={(v) => setLayer(i, { tamano: v })} />
          </div>
          <Slider label={t.speed} value={l.velocidad ?? 1} min={0.3} max={3} step={0.05} format={times} onValueChange={(v) => setLayer(i, { velocidad: v })} />
          <div className="flex flex-wrap items-center gap-3">
            <Checkbox label={t.oneColor} checked={Boolean(l.color)} onCheckedChange={(c) => setLayer(i, { color: c ? "#ffd36e" : undefined })} />
            {l.color && <ColorField label={t.particleColor} value={l.color} onValueChange={(c) => setLayer(i, { color: c })} />}
            <Button size="sm" variant="secondary" icon={<Shuffle className="size-4" aria-hidden />} onClick={() => setLayer(i, { semilla: randomSeed() })}>
              {t.reseed}
            </Button>
          </div>
          {common}
        </>
      );
    }
    const b = l.brillo;
    const waves: WavesChoice = !b || b.patron === undefined ? "auto" : b.patron === null ? "css" : "incluido" in b.patron ? b.patron.incluido : "archivo";
    return (
      <>
        {common}
        <Select
          label={t.gloss}
          value={b?.tipo ?? ""}
          options={[{ value: "", label: t.glossNone }, ...PACK_GLOSS.map((g) => ({ value: g, label: t.glossNames[g] }))]}
          onValueChange={(v) => setLayer(i, { brillo: v ? { ...(b ?? {}), tipo: v as PackGloss, intensidad: b?.intensidad ?? 0.7 } : undefined })}
        />
        {b && <Slider label={t.glossIntensity} value={b.intensidad ?? 0.7} min={0} max={1} step={0.05} format={pct} onValueChange={(v) => setLayer(i, { brillo: { ...b, intensidad: v } })} />}
        {b?.tipo === "ondas" && (
          <>
            <Select
              label={t.wavesPattern}
              value={waves}
              options={[
                { value: "auto", label: t.wavesAuto },
                ...PACK_PATTERNS.filter((p) => p !== "estelas").map((p) => ({ value: p, label: t.patternNames[p] })),
                { value: "css", label: t.wavesCss },
                { value: "archivo", label: t.wavesOwn },
              ]}
              onValueChange={(v) => {
                const patron = v === "auto" ? undefined : v === "css" ? null : v === "archivo" ? (b.patron && "key" in b.patron ? b.patron : undefined) : { incluido: v as PackPattern };
                setLayer(i, { brillo: { ...b, patron } });
              }}
            />
            {filePick(t.wavesUpload, b.patron && "key" in b.patron ? b.patron.key : null, (f) => void addOne(f).then((ref) => ref && setLayer(i, { brillo: { ...b, patron: { key: ref, nombre: f!.name } } })), "layer-waves-file")}
            {waves !== "css" && <Slider label={t.wavesSize} value={b.patronTamano ?? 100} min={20} max={200} unit="%" onValueChange={(v) => setLayer(i, { brillo: { ...b, patronTamano: v } })} />}
            <p className="text-xs text-ui-text-3">{t.wavesHint}</p>
          </>
        )}
        {!has(l.key) && <p className="text-xs text-ui-warning-text">{t.dropForLayer(l.nombre ?? l.key)}</p>}
      </>
    );
  }

  const layerCount = design.capas.length;
  const saveState = saving ? "saving" : dirty ? "dirty" : savedAt ? "saved" : "clean";
  const saveLabel = saving ? t.saving : dirty ? t.dirty : savedAt ? t.saved(new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })) : t.clean;

  return (
    <div className="space-y-5" data-testid="pack-designer" data-dirty={dirty || undefined}>
      <div className="space-y-2">
        <Link href={`/admin/sets/${set.id}`} className="text-sm text-ui-text-3 hover:text-ui-text">
          {t.back}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span aria-hidden className="pack-designer__logo">
              WB
            </span>
            <div>
              <h1 className="text-2xl font-bold">
                {t.title} · <span className="font-mono text-ui-text-2">{set.code}</span>
              </h1>
              <p className="text-sm text-ui-text-2">{t.subtitle(kindLabel)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SaveStatus state={saveState} label={saveLabel} />
            <Button onClick={() => void save()} loading={saving} disabled={!dirty && Boolean(savedAt)} data-testid="pack-save">
              {t.save}
            </Button>
          </div>
        </div>
      </div>

      <div className="@container grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,460px)]">
        {/* Izquierda: la vista previa y sus controles rápidos (RF-3). */}
        <div className="min-w-0 space-y-4 self-start lg:sticky lg:top-4">
          <DesignerStage
            registro={preview}
            samples={samples}
            inclinacion={tilt}
            reposo={autoMove}
            sonido={soundOn}
            guias={guides}
            scene={scene}
            hint={missing > 0 ? t.missingFiles(missing) : design.apertura === "sticker" ? t.stageHint.sticker : t.stageHint.tear}
            warn={missing > 0}
          />
          <Card className="space-y-4" data-testid="pack-quick">
            <div className="grid gap-4 @lg:grid-cols-2">
              <Segmented label={t.view} value={design.vista} options={(["3d", "plano"] as const).map((v) => ({ value: v, label: t.views[v] }))} onValueChange={(v) => update((d) => ({ ...d, vista: v as PackDesign["vista"] }))} data-testid="pack-view" />
              <Segmented label={t.opening} value={design.apertura} options={(["rasgar", "sticker"] as const).map((v) => ({ value: v, label: t.openings[v] }))} onValueChange={(v) => update((d) => ({ ...d, apertura: v as PackDesign["apertura"] }))} data-testid="pack-opening" />
              <Slider label={t.tilt} value={tilt} min={0} max={2} step={0.05} format={times} onValueChange={setTilt} />
              <Slider label={t.plastic} value={design.plastico ?? 1} min={0} max={1.5} step={0.05} format={pct} disabled={design.vista !== "3d"} onValueChange={(v) => update((d) => ({ ...d, plastico: v }))} />
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <Checkbox label={t.guides} checked={guides} onCheckedChange={setGuides} data-testid="pack-guides" />
              <Checkbox label={t.autoMove} checked={autoMove} onCheckedChange={setAutoMove} />
              <Checkbox label={t.sound} checked={soundOn} onCheckedChange={setSoundOn} />
            </div>
            <Segmented label={t.scene} value={scene} options={(["rayos", "oscuro", "claro"] as const).map((v) => ({ value: v, label: t.scenes[v] }))} onValueChange={(v) => setScene(v as Scene)} />
            <p className="text-xs text-ui-text-3">{t.quickNote}</p>
          </Card>
        </div>

        {/* Derecha: el panel del creador. */}
        <div className="@container min-w-0 space-y-4">
          <Card title={t.layers} aside={<span className="text-xs font-extrabold uppercase italic tracking-wide text-ui-accent-text">{layerCount ? t.layersCount(layerCount) : ""}</span>} className="space-y-3" data-testid="pack-layers">
            <label
              className={cx("block cursor-pointer rounded-m border-2 border-dashed px-4 py-5 text-center transition-colors hover:border-ui-accent", over ? "border-ui-accent bg-ui-accent/10" : "border-ui-line", focusRing)}
              data-testid="pack-drop"
            >
              <span className="block text-sm font-extrabold uppercase italic tracking-wide text-ui-text">{t.dropTitle}</span>
              <span className="mt-1 block text-xs text-ui-text-3">{t.dropHint}</span>
              <input type="file" multiple accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => void addFiles(e.target.files).finally(() => (e.target.value = ""))} data-testid="pack-upload" />
            </label>
            <LayerList
              frontLabel={t.frontMark}
              backLabel={t.backMark}
              action={
                <Button size="sm" icon={<Sparkles className="size-4" aria-hidden />} onClick={() => update((d) => addParticles(d, randomSeed()))} data-testid="pack-add-particles">
                  {t.addParticles}
                </Button>
              }
            >
              {/* Las capas que pone el código, bloqueadas (como el creador). */}
              {fixedLayers.map(([code, name, detail]) => (
                <li key={code} className="flex items-center gap-3 rounded-m border-2 border-dashed border-ui-line bg-ui-nav/60 p-2" aria-label={`${t.fixedLabel}: ${name}`} data-testid="pack-fixed-layer">
                  <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-s bg-ui-rail font-mono text-[11px] font-bold text-ui-accent-text">
                    {code}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ui-text">{name}</span>
                    <span className="block truncate text-xs text-ui-text-3">{detail}</span>
                  </span>
                  <Badge>{t.byCode}</Badge>
                </li>
              ))}
              {design.capas
                .map((l, i) => ({ l, i }))
                .reverse()
                .map(({ l, i }) => {
                  const img = isPackImageLayer(l);
                  const label = img ? (l.nombre || files[l.key]?.name || l.key.split("/").pop()!) : t.particleNames[l.particulas];
                  const shown = l.visible !== false;
                  const miss = img && !has(l.key);
                  return (
                    <LayerRow
                      key={`${i}-${img ? l.key : l.particulas}`}
                      data-testid="pack-layer"
                      open={openRow === i}
                      onOpenChange={(o) => setOpenRow(o ? i : null)}
                      className={shown ? undefined : "opacity-60"}
                      thumb={
                        img ? (
                          has(l.key) ? (
                            // eslint-disable-next-line @next/next/no-img-element -- capa privada o recién elegida
                            <img src={files[l.key].url} alt="" className="size-full object-cover" />
                          ) : (
                            <span className="text-ui-text-3">?</span>
                          )
                        ) : (
                          <Sparkles className="size-4 text-ui-k-oro" aria-hidden />
                        )
                      }
                      title={label}
                      subtitle={miss ? <span className="text-ui-warning-text">{t.missingFile}</span> : img ? t.imageSummary(short(l.mezcla), fixed2(l.profundidad ?? 1), Boolean(l.brillo)) : t.particlesSummary(short(l.mezcla), fixed2(l.profundidad ?? 1))}
                      actions={
                        <>
                          <IconButton label={`${shown ? t.hide : t.show} · ${label}`} size="sm" aria-pressed={!shown} onClick={() => setLayer(i, { visible: shown ? false : undefined })} data-testid="pack-layer-visibility">
                            {shown ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
                          </IconButton>
                          <IconButton label={`${t.moveUp} · ${label}`} size="sm" disabled={i === design.capas.length - 1} onClick={() => move(i, i + 1)}>
                            <ArrowUp className="size-4" aria-hidden />
                          </IconButton>
                          <IconButton label={`${t.moveDown} · ${label}`} size="sm" disabled={i === 0} onClick={() => move(i, i - 1)}>
                            <ArrowDown className="size-4" aria-hidden />
                          </IconButton>
                          <IconButton label={`${t.remove} · ${label}`} size="sm" onClick={() => (update((d) => ({ ...d, capas: d.capas.filter((_, j) => j !== i) })), setOpenRow(null))} data-testid="pack-layer-remove">
                            <X className="size-4" aria-hidden />
                          </IconButton>
                        </>
                      }
                    >
                      <div className="@container space-y-4">{layerBody(l, i)}</div>
                    </LayerRow>
                  );
                })}
            </LayerList>
          </Card>

          {/* RF-9: la revisión automática; avisa sin impedir guardar. */}
          <Card title={t.review} aside={issues.length ? <Badge tone="warning">{t.reviewCount(issues.length)}</Badge> : undefined} className="space-y-2" data-testid="pack-review">
            {issues.length === 0 ? (
              <Alert tone="success">{t.reviewOk}</Alert>
            ) : (
              <ul className="space-y-1.5" aria-live="polite">
                {issues.map((i, n) => (
                  <li key={n} data-level={i.level} data-kind={i.kind} className={cx("rounded-s border-l-4 px-3 py-1.5 text-sm", i.level === "bad" ? "border-ui-danger bg-ui-danger/10 text-ui-danger-text" : "border-ui-warning bg-ui-warning/10 text-ui-warning-text")}>
                    {issueText(i)}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-ui-text-3">{t.reviewNote}</p>
          </Card>

          {/* RF-7 y RF-8: datos del sobre (nombre, código y cartas vienen de la colección). */}
          <Card title={t.pack} className="space-y-4" data-testid="pack-data">
            <TextField label={t.setName} value={set.name} readOnly disabled hint={t.fromSet} />
            <div className="grid gap-3 @md:grid-cols-2">
              <TextField label={t.setCode} value={set.code} readOnly disabled />
              <TextField label={t.setCards} value={String(set.packSize)} readOnly disabled />
            </div>
            <Segmented
              label={t.logo}
              value={design.logo === true ? "texto" : design.logo === false ? "ninguno" : "imagen"}
              options={(["texto", "imagen", "ninguno"] as const).map((v) => ({ value: v, label: t.logos[v] }))}
              onValueChange={(v) => {
                setLogoWanted(v as LogoChoice);
                if (v === "texto") update((d) => ({ ...d, logo: true }));
                if (v === "ninguno") update((d) => ({ ...d, logo: false }));
              }}
            />
            {(logoWanted === "imagen" || typeof design.logo === "object") &&
              filePick(t.logoUpload, typeof design.logo === "object" ? design.logo.key : null, (f) => void addOne(f).then((ref) => ref && update((d) => ({ ...d, logo: { key: ref, nombre: f!.name } }))), "pack-logo-file")}
            <Checkbox label={t.badgeOn} checked={Boolean(design.insignia)} onCheckedChange={(c) => update((d) => ({ ...d, insignia: c ? { texto: t.badgeDefault, color: DEFAULT_BADGE_COLOR } : null }))} data-testid="pack-badge" />
            {design.insignia && (
              <div className="flex flex-wrap items-end gap-3">
                <TextField
                  label={t.badgeText}
                  value={design.insignia.texto}
                  maxLength={MAX_BADGE_TEXT}
                  className="min-w-[160px] flex-1"
                  onChange={(e) => update((d) => (d.insignia ? { ...d, insignia: { ...d.insignia, texto: e.target.value } } : d))}
                  data-testid="pack-badge-text"
                />
                <ColorField label={t.badgeColor} value={design.insignia.color.toLowerCase()} onValueChange={(c) => update((d) => (d.insignia ? { ...d, insignia: { ...d.insignia, color: c } } : d))} />
              </div>
            )}
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <Checkbox label={t.holo} checked={Boolean(design.holo)} onCheckedChange={(c) => update((d) => ({ ...d, holo: c }))} data-testid="pack-holo" />
              <Checkbox label={t.foil} checked={design.foil !== false} onCheckedChange={(c) => update((d) => ({ ...d, foil: c }))} />
            </div>
            <div className="grid gap-4 @md:grid-cols-2">
              {design.holo && <Slider label={t.holoIntensity} value={design.holoIntensidad ?? 0.4} min={0} max={1} step={0.05} format={pct} onValueChange={(v) => update((d) => ({ ...d, holoIntensidad: r3(v) }))} />}
              {design.foil !== false && <Slider label={t.foilIntensity} value={design.foilIntensidad ?? 0.6} min={0} max={1} step={0.05} format={pct} onValueChange={(v) => update((d) => ({ ...d, foilIntensidad: r3(v) }))} />}
            </div>
          </Card>

          {/* RF-7: colores y patrón holo de los sellos. */}
          <Card title={t.seals} className="space-y-4" data-testid="pack-seals">
            <div className="flex flex-wrap items-center gap-4">
              <ColorField label={t.sealTop} value={design.sellos.arriba.toLowerCase()} onValueChange={(c) => update((d) => ({ ...d, sellos: { ...d.sellos, arriba: c } }))} data-testid="pack-seal-top" />
              <ColorField label={t.sealBottom} value={design.sellos.abajo.toLowerCase()} onValueChange={(c) => update((d) => ({ ...d, sellos: { ...d.sellos, abajo: c } }))} data-testid="pack-seal-bottom" />
              <Button size="sm" variant="secondary" onClick={() => update((d) => ({ ...d, sellos: { ...d.sellos, ...BRAND_SEALS } }))} data-testid="pack-brand-colors">
                {t.brandColors}
              </Button>
            </div>
            <ChipGroup
              label={t.sealPattern}
              value={sealChoice}
              options={[
                { value: "ninguno", label: t.patternNone, swatch: "transparent" },
                ...PACK_PATTERNS.map((p) => ({ value: p, label: t.patternNames[p], swatch: `url(${patternPath(p)}) center/180% var(--ui-rail)` })),
                ...(ownSeal ? [{ value: "archivo", label: t.patternOwn, swatch: `url(${files[ownSeal]?.url ?? ""}) center/180% var(--ui-rail)` }] : []),
              ]}
              onValueChange={(v) =>
                update((d) => ({ ...d, sellos: { ...d.sellos, patron: v === "ninguno" ? null : v === "archivo" && ownSeal ? { key: ownSeal, nombre: files[ownSeal]?.name } : v === "archivo" ? null : { incluido: v as PackPattern } } }))
              }
              data-testid="pack-seal-pattern"
            />
            {filePick(
              t.patternUpload,
              ownSeal,
              (f) =>
                void addOne(f).then((ref) => {
                  if (!ref) return;
                  setOwnSeal(ref);
                  update((d) => ({ ...d, sellos: { ...d.sellos, patron: { key: ref, nombre: f!.name } } }));
                }),
              "pack-seal-file",
            )}
            {design.sellos.patron && <Slider label={t.patternSize} value={design.sellos.patronTamano ?? 40} min={10} max={150} unit="%" onValueChange={(v) => update((d) => ({ ...d, sellos: { ...d.sellos, patronTamano: v } }))} />}
            <p className="text-xs text-ui-text-3">{t.sealsHint}</p>
          </Card>

          {/* Registro para el juego: el JSON, guardar, miniatura, ejemplo y empezar de cero. */}
          <Card title={t.record} className="space-y-3" data-testid="pack-record">
            <p className="text-xs text-ui-text-3">{t.recordHint}</p>
            <pre className="max-h-72 overflow-auto rounded-m bg-ui-rail p-3 font-mono text-[11px] leading-relaxed text-ui-text-2" data-testid="pack-json">
              {json}
            </pre>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void save()} loading={saving} disabled={!dirty && Boolean(savedAt)}>
                {t.save}
              </Button>
              <Button variant="success" onClick={() => void downloadThumb()} data-testid="pack-thumb-download">
                {t.thumb}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void loadExample()} data-testid="pack-example">
                {t.example}
              </Button>
              <Button variant="danger" onClick={() => void reset()} data-testid="pack-reset">
                {t.reset}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
