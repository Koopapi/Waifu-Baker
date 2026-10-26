import { Sparkles } from "@/ui/icons/glyphs";
import { cx } from "@/ui/variants";

/**
 * Spec 021, RF-9 y RF-15: «esta colección (o este espacio) llega con la suscripción», con el enlace a Patreon. Sin
 * hooks: lo pintan páginas de servidor con los textos ya traducidos.
 */
export function PatreonNotice({ text, linkLabel, url, compact = false, className }: { text: string; linkLabel: string; url: string; compact?: boolean; className?: string }) {
  return (
    <div
      className={cx("flex items-center gap-3 rounded-m border border-ui-accent/50 bg-ui-accent/10", compact ? "px-3 py-2 text-xs" : "p-3 text-sm", className)}
      data-testid="patreon-notice"
    >
      <Sparkles aria-hidden className="size-[18px] shrink-0 text-ui-accent-text" />
      <p className="min-w-0 flex-1 font-semibold">
        {text}{" "}
        <a href={url} target="_blank" rel="noreferrer" className="whitespace-nowrap text-ui-accent-text underline underline-offset-4" data-testid="patreon-link">
          {linkLabel} →
        </a>
      </p>
    </div>
  );
}
