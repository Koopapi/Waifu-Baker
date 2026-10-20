"use client";

import { sound, useSoundMuted } from "@/features/sound/engine";
import { SoundToggle } from "@/ui/game/SoundToggle";

/** Spec 015, RF-14: el mismo silencio que en la apertura, desde la cabecera de todas las páginas del coleccionista. */
export function HeaderSoundToggle() {
  const muted = useSoundMuted();
  return <SoundToggle muted={muted} onToggle={(m) => sound.setMuted(m)} variant="ghost" size="sm" data-testid="sound-toggle-header" />;
}
