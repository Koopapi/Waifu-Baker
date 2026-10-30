import type { PackKind } from "@/domain/catalog/default-odds";
import { cx } from "@/ui/variants";

// Colores de la maqueta aprobada (lámina «Rarezas y sobres plata y gold», grupo de «Mis sobres»).
const TONE: Record<PackKind, string> = {
  silver: "bg-k-plata text-k-plata-oscuro",
  gold: "bg-k-oro text-k-oro-oscuro",
};

/** Spec 022, RF-19: la etiqueta PLATA o GOLD de un sobre, en «Mis sobres», la apertura y «Abrir todos». */
export function PackKindTag({ kind, label, className }: { kind: PackKind; label: string; className?: string }) {
  return (
    <span
      data-testid="pack-kind"
      data-kind={kind}
      className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 font-display text-[12px] font-bold tracking-[0.12em] uppercase", TONE[kind], className)}
    >
      {label}
    </span>
  );
}
