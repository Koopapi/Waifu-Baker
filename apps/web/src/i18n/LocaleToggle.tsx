"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocaleAction } from "./actions";
import { useLocale, useT } from "./client";
import { LOCALES } from "./locales";

/** RF-2 y RF-3: selector EN/ES; cambia el idioma de la página actual sin perder nada. */
export function LocaleToggle({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div role="group" aria-label={t.common.language} className={`inline-flex overflow-hidden rounded-full border border-ui-line text-xs ${className}`} data-testid="locale-toggle">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          disabled={pending}
          aria-pressed={locale === l}
          title={t.common.switchTo(t.common.localeNames[l])}
          onClick={() => {
            if (l === locale) return;
            start(async () => {
              await setLocaleAction(l);
              router.refresh();
            });
          }}
          className={`px-2.5 py-1 font-semibold uppercase ${locale === l ? "bg-ui-hover text-white" : "text-ui-text-2 hover:text-white"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
