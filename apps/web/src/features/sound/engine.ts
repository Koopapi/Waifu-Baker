// Spec 013: motor de sonido y vibración de la apertura; desde la spec 015 también de los premios. Es ligero:
// `howler` se descarga con `import()` al entrar en una pantalla de apertura (RF-6, RF-13) o la primera vez que algo
// suena. El silencio se guarda en el dispositivo (RF-7, RF-8) y, mientras dura, no suena ni vibra nada (RF-10).
// Cada sonido o vibración emite un evento del DOM (`wb:sound`, `wb:vibrate`) que usan las pruebas E2E.
import { useSyncExternalStore } from "react";
import { SOUNDS, type SoundName } from "@/domain/feedback/sounds";

export const MUTED_KEY = "wb:sound-muted";

interface HowlLike {
  play(): unknown;
}
/** Lo que se usa de `howler` (permite probar el motor con uno falso). */
export interface HowlerModule {
  Howl: new (o: { src: string[]; preload?: boolean; onloaderror?: () => void }) => HowlLike;
  Howler: { ctx?: { state: string; resume(): Promise<unknown> } | null; stop(): unknown };
}
interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}
interface Deps {
  loadHowler: () => Promise<HowlerModule>;
  storage: StorageLike | null;
  vibrate: (pattern: number[]) => void;
  emit: (type: "wb:sound" | "wb:vibrate", detail: string) => void;
}

export function createSoundEngine(deps: Deps) {
  let muted: boolean | null = null;
  let howler: HowlerModule | null = null;
  let loading: Promise<void> | null = null;
  const howls = new Map<SoundName, HowlLike>();
  const listeners = new Set<() => void>();

  const isMuted = () => {
    if (muted === null) {
      try {
        muted = deps.storage?.getItem(MUTED_KEY) === "1";
      } catch {
        muted = false; // navegación privada o almacenamiento bloqueado: sonido activado y sin recordar
      }
    }
    return muted;
  };

  return {
    isMuted,
    setMuted(value: boolean) {
      muted = value;
      try {
        deps.storage?.setItem(MUTED_KEY, value ? "1" : "0");
      } catch {
        /* no se recuerda, pero se aplica */
      }
      if (value) howler?.Howler.stop();
      listeners.forEach((l) => l());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    /** RF-6: descarga `howler` y los sonidos; si algo falla, la apertura sigue sin ese sonido. */
    preload() {
      loading ??= deps
        .loadHowler()
        .then((mod) => {
          howler = mod;
          for (const name of SOUNDS) howls.set(name, new mod.Howl({ src: [`/sounds/${name}.mp3`], preload: true, onloaderror: () => howls.delete(name) }));
        })
        .catch(() => undefined);
      return loading;
    },
    /** RF-2: el primer gesto (rasgar o «Abrir») habilita el audio, también en iPhone. */
    unlock() {
      const ctx = howler?.Howler.ctx;
      if (ctx && ctx.state !== "running") ctx.resume().catch(() => undefined);
    },
    play(name: SoundName) {
      if (isMuted()) return;
      deps.emit("wb:sound", name);
      const fire = () => {
        if (isMuted()) return;
        try {
          howls.get(name)?.play();
        } catch {
          /* sonido roto: se sigue sin él */
        }
      };
      // Spec 015, RF-12: fuera de la apertura nadie precarga; el primer sonido descarga el motor y suena al llegar.
      if (howler) fire();
      else void this.preload().then(fire);
    },
    /** RF-9 y RF-10 */
    vibrate(pattern: number[] | null) {
      if (!pattern || isMuted()) return;
      deps.emit("wb:vibrate", pattern.join(","));
      try {
        deps.vibrate(pattern);
      } catch {
        /* sin vibración */
      }
    },
  };
}

function browserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export const sound = createSoundEngine({
  loadHowler: () => import("howler") as unknown as Promise<HowlerModule>,
  get storage() {
    return browserStorage();
  },
  vibrate: (pattern) => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(pattern);
  },
  emit: (type, detail) => {
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(type, { detail }));
  },
});

/** Estado de silencio para la interfaz (en el servidor, siempre con sonido). */
export function useSoundMuted() {
  return useSyncExternalStore(sound.subscribe, sound.isMuted, () => false);
}
