"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useT } from "@/i18n/client";
import { IconButton, type IconButtonProps } from "../action/Button";

export interface SoundToggleProps extends Omit<IconButtonProps, "label" | "onClick" | "onToggle" | "children"> {
  muted: boolean;
  onToggle: (muted: boolean) => void;
}

/**
 * Spec 013, RF-7: activar o silenciar el sonido (y la vibración) de un juego. Es un botón de alternar: la
 * etiqueta no cambia y `aria-pressed` dice si está silenciado. No sabe de dónde viene el estado.
 */
export function SoundToggle({ muted, onToggle, ...rest }: SoundToggleProps) {
  const t = useT().common;
  const Icon = muted ? VolumeX : Volume2;
  return (
    <IconButton label={t.muteSound} aria-pressed={muted} data-muted={muted} onClick={() => onToggle(!muted)} {...rest}>
      <Icon aria-hidden className="size-5" />
    </IconButton>
  );
}
