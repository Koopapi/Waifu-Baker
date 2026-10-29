"use client";

import { useState, useTransition } from "react";
import { useT } from "@/i18n/client";
import { Button } from "@/ui/action/Button";
import { Alert } from "@/ui/feedback/Alert";
import { TextField } from "@/ui/form/TextField";
import { changeStep, codeStep, linkStep, passwordStep, resendStep, type StepState } from "./actions";

type Step = "password" | "change" | "link" | "code";

/** Spec 024: los pasos del acceso del equipo en una sola tarjeta. */
export function StaffLogin() {
  const t = useT().site.adminLogin;
  const [step, setStep] = useState<Step>("password");
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "danger" | "success" | "info"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const linkCode = linkUrl ? new URL(linkUrl).searchParams.get("start") : null;

  const message = (s: string): string =>
    ({
      invalid: step === "code" ? t.wrongCode : t.invalid,
      locked: t.locked,
      unavailable: t.unavailable,
      expired: t.expired,
      weak: t.weak,
      waiting: t.linkWaiting,
      limit: t.resendLimit,
    })[s] ?? t.unavailable;

  const apply = (r: StepState) => {
    if (r.status !== "ok") {
      // Si el paso caducó o la cuenta se bloqueó, se vuelve al principio.
      if (r.status === "expired" || r.status === "locked") setStep("password");
      return setNotice({ tone: r.status === "waiting" ? "info" : "danger", text: message(r.status) });
    }
    setNotice(null);
    if (r.linkUrl) setLinkUrl(r.linkUrl);
    if (r.next) setStep(r.next);
  };
  const run = (fn: () => Promise<StepState>) => start(async () => apply(await fn()));

  return (
    <div className="space-y-4">
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}

      {step === "password" && (
        <form className="space-y-3" action={(fd) => run(() => passwordStep(String(fd.get("username") ?? ""), String(fd.get("password") ?? "")))}>
          <TextField name="username" label={t.username} autoComplete="username" required autoCapitalize="none" spellCheck={false} />
          <TextField name="password" label={t.password} type="password" autoComplete="current-password" required />
          <Button type="submit" width="full" loading={pending}>
            {t.submit}
          </Button>
        </form>
      )}

      {step === "change" && (
        <form className="space-y-3" action={(fd) => run(() => changeStep(String(fd.get("newPassword") ?? "")))}>
          <h2 className="font-semibold">{t.changeTitle}</h2>
          <p className="text-sm text-ui-text-2">{t.changeHint}</p>
          <TextField name="newPassword" label={t.newPassword} type="password" autoComplete="new-password" minLength={12} required />
          <Button type="submit" width="full" loading={pending}>
            {t.submit}
          </Button>
        </form>
      )}

      {step === "link" && (
        <div className="space-y-3">
          <h2 className="font-semibold">{t.linkTitle}</h2>
          <p className="text-sm text-ui-text-2">{t.linkHint}</p>
          {linkUrl && (
            <Button asChild width="full" variant="secondary">
              <a href={linkUrl} target="_blank" rel="noreferrer">
                {t.openBot}
              </a>
            </Button>
          )}
          {linkCode && (
            <div className="space-y-2 rounded-lg border border-ui-line p-3" data-testid="link-code">
              <p className="text-sm text-ui-text-2">{t.linkManual}</p>
              <code className="block select-all break-all font-mono text-sm">{linkCode}</code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigator.clipboard?.writeText(linkCode).then(() => setCopied(true), () => {})}
              >
                {copied ? t.copied : t.copyCode}
              </Button>
            </div>
          )}
          <Button width="full" loading={pending} onClick={() => run(linkStep)}>
            {t.linkDone}
          </Button>
        </div>
      )}

      {step === "code" && (
        <form className="space-y-3" action={(fd) => run(() => codeStep(String(fd.get("code") ?? "")))}>
          <h2 className="font-semibold">{t.codeTitle}</h2>
          <p className="text-sm text-ui-text-2">{t.codeHint}</p>
          <TextField name="code" label={t.code} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required />
          <Button type="submit" width="full" loading={pending}>
            {t.verify}
          </Button>
          <Button
            type="button"
            variant="ghost"
            width="full"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await resendStep();
                if (r.status === "ok") setNotice({ tone: "success", text: t.resent });
                else apply(r);
              })
            }
          >
            {t.resend}
          </Button>
        </form>
      )}
    </div>
  );
}
