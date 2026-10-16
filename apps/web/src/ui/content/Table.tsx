import { cx } from "../variants";

export interface Column<R> {
  key: keyof R & string;
  header: React.ReactNode;
  align?: "start" | "end";
  /** Ancho fijo (p. ej. "8rem"); si falta, la columna se reparte el espacio. */
  width?: string;
  render?: (row: R) => React.ReactNode;
}

export interface TableProps<R extends { id: string }> {
  caption: string;
  columns: Column<R>[];
  rows: R[];
  empty?: React.ReactNode;
  className?: string;
}

/** Spec 011, RF-7: tabla con cabeceras reales y desplazamiento horizontal en pantallas estrechas. */
export function Table<R extends { id: string }>({ caption, columns, rows, empty, className }: TableProps<R>) {
  return (
    <div className={cx("overflow-x-auto rounded-l bg-ui-nav", className)}>
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-ui-rail">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                style={c.width ? { width: c.width } : undefined}
                className={cx("px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-ui-text-3", c.align === "end" ? "text-right" : "text-left")}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-ui-text-3">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="border-t border-ui-line/60 transition-colors duration-[var(--duration-fast)] hover:bg-ui-raised">
                {columns.map((c) => (
                  <td key={c.key} className={cx("px-4 py-2.5 text-ui-text", c.align === "end" && "text-right tabular-nums")}>
                    {c.render ? c.render(r) : (r[c.key] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
