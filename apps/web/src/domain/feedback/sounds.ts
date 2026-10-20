// Spec 013, RF-1 y spec 015, RF-12: los sonidos de toda la web, un fichero `public/sounds/<nombre>.mp3` por cada uno.
// Puro: el motor (`features/sound/engine.ts`) los descarga y los hace sonar.

/** Los seis de la apertura (013) y los tres de los premios (015): galletas al contador, sobre que aterriza y fanfarria. */
export const SOUNDS = ["tear", "flip", "rare", "epic", "legendary", "secret", "cookies", "pack", "fanfare"] as const;
export type SoundName = (typeof SOUNDS)[number];

/** Spec 015, RF-13: la celebración vibra una sola vez, suave. */
export const CELEBRATION_VIBRATION = [30];
