import { cx } from "../variants";

export interface CardLineItem {
  key: string;
  /** Nombre visible (número, nombre y rareza). */
  label: string;
  /** Miniatura si la tiene; sin ella, el hueco de la que falta. */
  image?: string | null;
  owned: boolean;
  /** Texto del hueco («Te falta»). */
  missingLabel: string;
  detail?: React.ReactNode;
  actions?: React.ReactNode;
}

/** Spec 029, RF-15: la línea de un personaje: sus cartas en fila, las que tiene y las que faltan, con sus acciones. */
export function CardLine({ items, label, className }: { items: CardLineItem[]; label: string; className?: string }) {
  return (
    <ul aria-label={label} className={cx("grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4", className)} data-testid="card-line">
      {items.map((it) => (
        <li key={it.key} className="flex flex-col gap-2 rounded-l border border-ui-line bg-ui-raised p-3" data-testid="card-line-item" data-owned={it.owned ? "true" : "false"}>
          {it.owned && it.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- enlace firmado y privado
            <img src={it.image} alt="" className="aspect-[700/991] w-full rounded-m object-cover" />
          ) : (
            <span className="grid aspect-[700/991] w-full place-items-center rounded-m border-2 border-dashed border-ui-line text-xs font-semibold text-ui-text-3">{it.missingLabel}</span>
          )}
          <p className="text-sm font-semibold">{it.label}</p>
          {it.detail && <div className="text-xs text-ui-text-2">{it.detail}</div>}
          {it.actions && <div className="mt-auto flex flex-col gap-2">{it.actions}</div>}
        </li>
      ))}
    </ul>
  );
}
