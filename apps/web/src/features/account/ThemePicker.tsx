"use client";

import { useState, useTransition } from "react";
import { setThemeAction } from "@/app/(app)/account/actions";
import { THEME_META } from "@/app/theme-meta";
import { THEMES, type Theme } from "@/domain/ui/theme";
import { useT } from "@/i18n/client";
import { useToast } from "@/ui/feedback/Toast";
import { OptionCards } from "@/ui/form/OptionCards";

/** Pinta el tema en la página abierta: `<html data-theme>` y el color de la barra del sistema. */
function paint(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_META[theme].themeColor);
}

/**
 * Miniatura de un tema: la pinta con sus propias variables (`data-theme`), sin depender del tema de la página. Usa la
 * fuente del sistema: así quien está en kawaii no descarga las fuentes de Street pop solo por ver el selector (RNF).
 */
function Preview({ theme, title, button }: { theme: Theme; title: string; button: string }) {
  const street = theme === "street";
  return (
    <span data-theme={theme} aria-hidden style={{ fontFamily: "system-ui, sans-serif" }} className={`grid h-24 grid-cols-[34%_1fr] overflow-hidden rounded-m bg-ui-bg sm:h-28 ${street ? "border-2 border-ui-text" : "border border-ui-line"}`}>
      <span className={`flex flex-col gap-1.5 p-2 ${street ? "bg-ui-text" : "bg-ui-nav"}`}>
        <span className={`h-2 bg-ui-accent ${street ? "-skew-x-12" : "rounded-full"}`} />
        <span className={`h-2 ${street ? "bg-ui-text-2" : "rounded-full bg-ui-hover"}`} />
        <span className={`h-2 ${street ? "bg-ui-text-2" : "rounded-full bg-ui-hover"}`} />
      </span>
      <span className="flex min-w-0 flex-col gap-1.5 p-2">
        <span className={`truncate text-xs font-black text-ui-text ${street ? "uppercase italic" : ""}`}>{title}</span>
        <span className={`flex flex-1 items-end p-1.5 ${street ? "border-2 border-ui-text bg-ui-raised shadow-[2px_2px_0_var(--ui-text)]" : "rounded-m border border-ui-line bg-ui-raised"}`}>
          <span
            className={`max-w-full truncate bg-ui-accent px-2 py-0.5 text-[9px] text-ui-on-accent ${street ? "-skew-x-12 border-2 border-ui-text font-black uppercase italic" : "rounded-full font-bold shadow-[0_2px_0_var(--ui-accent-deep)]"}`}
          >
            {button}
          </span>
        </span>
      </span>
    </span>
  );
}

/** Spec 026, RF-4 a RF-6 y RF-9: elegir el tema; se aplica al instante y, si no se puede guardar, vuelve el anterior. */
export function ThemePicker({ initial }: { initial: Theme }) {
  const t = useT().account.theme;
  const toast = useToast();
  const [theme, setTheme] = useState<Theme>(initial);
  const [, start] = useTransition();

  const choose = (value: string) => {
    const next = value as Theme;
    if (next === theme) return;
    const previous = theme;
    setTheme(next);
    paint(next);
    start(async () => {
      const res = await setThemeAction(next).catch(() => ({ ok: false as const, error: t.saveFailed }));
      if (!res.ok) {
        setTheme(previous);
        paint(previous);
        toast({ kind: "error", title: t.saveFailed });
      }
    });
  };

  return (
    <div className="space-y-3" data-testid="theme-picker">
      <p className="text-sm text-ui-text-2">{t.body}</p>
      <OptionCards
        label={t.title}
        hideLabel
        value={theme}
        onValueChange={choose}
        checkedLabel={t.active}
        options={THEMES.map((v) => ({
          value: v,
          label: t.names[v],
          description: t.descriptions[v],
          preview: <Preview theme={v} title={t.previewTitle} button={t.previewButton} />,
        }))}
      />
      <p className="text-xs text-ui-text-3">{t.cardsNote}</p>
    </div>
  );
}
