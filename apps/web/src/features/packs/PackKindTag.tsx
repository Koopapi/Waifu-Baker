import type { PackKind } from "@/domain/catalog/default-odds";
import { cx } from "@/ui/variants";

const TONE: Record<PackKind, string> = {
  silver: "bg-linear-to-b from-k-plata to-k-plata-oscuro",
  gold: "bg-linear-to-b from-k-oro to-k-oro-oscuro",
};

/** Spec 022, RF-19: la etiqueta PLATA o GOLD de un sobre, en «Mis sobres», la apertura y «Abrir todos». */
export function PackKindTag({ kind, label, className }: { kind: PackKind; label: string; className?: string }) {
  return (
    <span
      data-testid="pack-kind"
      data-kind={kind}
      className={cx("inline-flex items-center rounded-full border-2 border-k-blanco px-2.5 py-0.5 font-display text-[12px] font-bold tracking-wider text-k-tinta uppercase shadow-[var(--shadow-sticker)]", TONE[kind], className)}
    >
      {label}
    </span>
  );
}
