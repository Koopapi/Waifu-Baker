// Spec 030: los sonidos sintetizados de la revelación de Bruno (apertura-sobre.html), sin archivos: el zumbido de las
// cartas al subir o apartarse y la campanita de la carta especial (RF-22). Callan si el sonido está silenciado (spec 013).
import { sound } from "@/features/sound/engine";

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function audio(): AudioContext | null {
  if (sound.isMuted() || typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
    return ctx;
  } catch {
    return null;
  }
}

/** Ruido de 500 a 3 200 Hz en 0,24 s. */
export function whoosh() {
  const a = audio();
  if (!a || !noise) return;
  const t = a.currentTime;
  const s = a.createBufferSource();
  const f = a.createBiquadFilter();
  const g = a.createGain();
  s.buffer = noise;
  f.type = "highpass";
  f.frequency.setValueAtTime(500, t);
  f.frequency.exponentialRampToValueAtTime(3200, t + 0.24);
  g.gain.setValueAtTime(0.14, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
  s.connect(f);
  f.connect(g);
  g.connect(a.destination);
  s.start(t, Math.random() * 0.5);
  s.stop(t + 0.26);
}

/** RF-22: cuatro notas triangulares (880, 1 320, 1 760 y 2 640 Hz) separadas 70 ms, que se apagan en 1 s. */
export function bell() {
  const a = audio();
  if (!a) return;
  [880, 1320, 1760, 2640].forEach((fr, i) => {
    const t = a.currentTime + i * 0.07;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = "triangle";
    o.frequency.value = fr;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1);
    o.connect(g);
    g.connect(a.destination);
    o.start(t);
    o.stop(t + 1.05);
  });
}
