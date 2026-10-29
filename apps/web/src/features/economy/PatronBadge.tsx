import { Badge } from "@/ui/content/Badge";

/** Spec 021, RF-11: la insignia de patron (cuenta y álbum público). */
export function PatronBadge({ label }: { label: string }) {
  return (
    <span data-testid="patron-badge">
      <Badge tone="patron">
        <span aria-hidden>♥</span> {label}
      </Badge>
    </span>
  );
}
