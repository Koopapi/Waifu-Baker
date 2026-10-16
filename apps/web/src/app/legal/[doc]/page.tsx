import Link from "next/link";
import { notFound } from "next/navigation";
import { LEGAL_DOCS, LEGAL_DOC_IDS, type LegalDoc } from "@/domain/legal/documents";
import { formatDate } from "@/i18n/format";
import { LocaleToggle } from "@/i18n/LocaleToggle";
import { getDict, getLocale } from "@/i18n/server";
import { legalContact } from "@/server/legal-contact";
import { db } from "@/db/client";
import { getMinAge } from "@/server/services/settings";

const isDoc = (d: string): d is LegalDoc => (LEGAL_DOC_IDS as string[]).includes(d);

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  if (!isDoc(doc)) return {};
  return { title: (await getDict()).legal.docs[doc].title };
}

/** Spec 007, RF-4 a RF-8: términos, privacidad y contenido, sin sesión y en el idioma elegido. */
export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  if (!isDoc(doc)) notFound();
  const t = (await getDict()).legal;
  const locale = await getLocale();
  const d = t.docs[doc];
  const meta = LEGAL_DOCS[doc];
  const contact = legalContact();
  // Spec 010, RF-19: la edad mínima vigente.
  const minAge = String(await getMinAge(db));
  const contactText = contact.kind === "email" ? contact.value : t.contactPatreon;
  return (
    <main className="min-h-dvh bg-ui-bg px-4 py-10 text-ui-text">
      <LocaleToggle className="fixed right-4 top-4" />
      <article className="mx-auto max-w-3xl space-y-6" data-testid={`legal-${doc}`}>
        <Link href="/" className="text-sm text-ui-text-3 hover:text-ui-text">
          ← {t.footer.rights.replace("© ", "")}
        </Link>
        <header className="space-y-1">
          <h1 className="text-3xl font-bold">{d.title}</h1>
          <p className="text-sm text-ui-text-3" data-testid="legal-meta">
            {t.meta(meta.version, formatDate(locale, `${meta.updated}T12:00:00Z`))}
          </p>
        </header>
        {d.sections.map((s) => (
          <section key={s.h} className="space-y-2">
            <h2 className="text-lg font-semibold">{s.h}</h2>
            {s.p.map((para, i) => (
              <p key={i} className="leading-relaxed text-ui-text-2">
                {para.replaceAll("{minAge}", minAge).split("{contact}").map((chunk, j, arr) => (
                  <span key={j}>
                    {chunk}
                    {j < arr.length - 1 && (
                      <a href={contact.href} className="underline" data-testid="legal-contact">
                        {contactText}
                      </a>
                    )}
                  </span>
                ))}
              </p>
            ))}
          </section>
        ))}
        <p className="border-t border-ui-line pt-4 text-sm text-ui-text-2">
          {t.contactLabel}:{" "}
          <a href={contact.href} className="underline" data-testid="legal-contact-footer">
            {contactText}
          </a>
        </p>
      </article>
    </main>
  );
}
