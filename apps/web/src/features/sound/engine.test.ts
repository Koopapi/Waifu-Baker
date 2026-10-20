import { describe, expect, it, vi } from "vitest";
import { MUTED_KEY, createSoundEngine, type HowlerModule } from "@/features/sound/engine";

function fakeHowler(fail: string[] = []) {
  const played: string[] = [];
  let resumed = 0;
  let stopped = 0;
  const mod: HowlerModule = {
    Howl: class {
      private src: string;
      constructor(o: { src: string[]; onloaderror?: () => void }) {
        this.src = o.src[0];
        if (fail.some((f) => this.src.includes(f))) queueMicrotask(() => o.onloaderror?.());
      }
      play() {
        if (fail.some((f) => this.src.includes(f))) throw new Error("no cargó");
        played.push(this.src.replace("/sounds/", "").replace(".mp3", ""));
        return 1;
      }
    },
    Howler: {
      ctx: { state: "suspended", resume: () => ((resumed += 1), Promise.resolve()) },
      stop: () => void (stopped += 1),
    },
  };
  return { mod, played, resumed: () => resumed, stopped: () => stopped };
}

function memoryStorage(init: Record<string, string> = {}) {
  const data = { ...init };
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v), data };
}

function setup(opts: { storage?: ReturnType<typeof memoryStorage>; fail?: string[] } = {}) {
  const h = fakeHowler(opts.fail);
  const storage = opts.storage ?? memoryStorage();
  const vibrations: number[][] = [];
  const events: string[] = [];
  const engine = createSoundEngine({
    loadHowler: async () => h.mod,
    storage,
    vibrate: (p) => void vibrations.push(p),
    emit: (type, detail) => events.push(`${type}:${detail}`),
  });
  return { engine, h, storage, vibrations, events };
}

describe("spec 013 — motor de sonido", () => {
  it("test_s013_rf7_el_sonido_empieza_activado", () => {
    expect(setup().engine.isMuted()).toBe(false);
  });

  it("test_s013_rf2_el_primer_gesto_desbloquea_el_audio_y_suena_el_rasgado", async () => {
    const { engine, h, events } = setup();
    await engine.preload();
    engine.unlock();
    engine.play("tear");
    expect(h.resumed()).toBe(1);
    expect(h.played).toEqual(["tear"]);
    expect(events).toEqual(["wb:sound:tear"]);
  });

  it("test_s013_rf8_el_silencio_se_recuerda_en_el_dispositivo", () => {
    const storage = memoryStorage();
    setup({ storage }).engine.setMuted(true);
    expect(storage.data[MUTED_KEY]).toBe("1");
    expect(setup({ storage }).engine.isMuted()).toBe(true);
  });

  it("test_s013_rf10_silenciado_no_suena_ni_vibra_y_corta_lo_que_sonaba", async () => {
    const { engine, h, vibrations, events } = setup();
    await engine.preload();
    engine.setMuted(true);
    expect(h.stopped()).toBe(1);
    engine.play("rare");
    engine.vibrate([30]);
    expect(h.played).toEqual([]);
    expect(vibrations).toEqual([]);
    expect(events).toEqual([]);
    engine.setMuted(false);
    engine.vibrate([30]);
    expect(vibrations).toEqual([[30]]);
  });

  it("test_s013_rf6_si_un_sonido_no_carga_la_apertura_sigue_sin_error", async () => {
    const { engine, h } = setup({ fail: ["epic"] });
    await engine.preload();
    expect(() => engine.play("epic")).not.toThrow();
    engine.play("flip");
    expect(h.played).toEqual(["flip"]);
  });

  it("test_s013_rf6_si_howler_no_carga_no_suena_nada_y_no_falla", async () => {
    const engine = createSoundEngine({ loadHowler: () => Promise.reject(new Error("sin red")), storage: memoryStorage(), vibrate: vi.fn(), emit: vi.fn() });
    await expect(engine.preload()).resolves.toBeUndefined();
    expect(() => engine.play("tear")).not.toThrow();
  });

  it("test_s015_rf12_sin_precarga_el_primer_sonido_descarga_el_motor_y_suena_al_llegar", async () => {
    const { engine, h, events } = setup();
    engine.play("cookies");
    expect(events).toEqual(["wb:sound:cookies"]);
    expect(h.played).toEqual([]);
    await engine.preload();
    await Promise.resolve();
    expect(h.played).toEqual(["cookies"]);
  });

  it("test_s015_rf12_si_se_silencia_mientras_descarga_no_suena", async () => {
    const { engine, h } = setup();
    engine.play("fanfare");
    engine.setMuted(true);
    await engine.preload();
    await Promise.resolve();
    expect(h.played).toEqual([]);
  });

  it("test_s013_rf8_sin_almacenamiento_el_sonido_sigue_activado", () => {
    const broken = { getItem: () => { throw new Error("privado"); }, setItem: () => { throw new Error("privado"); } };
    const engine = createSoundEngine({ loadHowler: async () => fakeHowler().mod, storage: broken, vibrate: vi.fn(), emit: vi.fn() });
    expect(engine.isMuted()).toBe(false);
    expect(() => engine.setMuted(true)).not.toThrow();
    expect(engine.isMuted()).toBe(true);
  });
});
