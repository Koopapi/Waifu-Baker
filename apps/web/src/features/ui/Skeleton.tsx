/** RF-9: hueco de carga con el tamaño del contenido que va a llegar. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton rounded-md bg-ui-raised ${className}`} />;
}
