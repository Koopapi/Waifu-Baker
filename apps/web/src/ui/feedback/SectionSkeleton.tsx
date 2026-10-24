import { Skeleton } from "./Skeleton";

/** RF-9: esqueleto genérico de una sección (título, línea y rejilla de tarjetas o cartas). */
export function SectionSkeleton({ variant = "cards" }: { variant?: "cards" | "list" }) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8" data-testid="skeleton" aria-busy="true">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
      {variant === "cards" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="aspect-[700/991] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}
    </div>
  );
}
