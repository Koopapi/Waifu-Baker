"use client";

import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { useT } from "@/i18n/client";
import { LocaleToggle } from "@/i18n/LocaleToggle";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <LocaleToggle className="fixed right-4 top-4 z-50" />
      <div className="max-w-md space-y-5">
        <h1 className="text-3xl font-bold">{t.site.error.heading}</h1>
        <p className="text-ui-text-2">{t.site.error.body}</p>
        {error.digest && <p className="font-mono text-xs text-ui-text-3">{t.site.error.code(error.digest)}</p>}
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn rounded-md bg-ui-accent hover:bg-ui-accent-hover px-6 py-3 font-semibold text-ui-on-accent">
            {t.common.retry}
          </button>
          <Link href="/" className="btn rounded-md border border-ui-line px-6 py-3 hover:bg-ui-hover">
            {t.site.error.home}
          </Link>
        </div>
      </div>
    </main>
  );
}
