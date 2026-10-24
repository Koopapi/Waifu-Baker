"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";
import { IconButton } from "@/ui/action/Button";
import { X } from "@/ui/icons/glyphs";

/**
 * Cierra una página suelta (sin la estructura del coleccionista, como Probabilidades): vuelve a la página anterior de
 * la web o, si se entró directo, a la portada.
 */
export function CloseButton({ className }: { className?: string }) {
  const t = useT();
  const router = useRouter();
  const close = () => {
    const fromSite = document.referrer.startsWith(window.location.origin) && window.history.length > 1;
    if (fromSite) router.back();
    else router.push("/");
  };
  return (
    <IconButton label={t.common.close} onClick={close} className={className} data-testid="page-close">
      <X className="size-5" aria-hidden />
    </IconButton>
  );
}
