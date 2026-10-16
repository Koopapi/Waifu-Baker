/** Spec 010, RF-10: cada sección entra con un ligero deslizamiento (sin él con movimiento reducido). */
export default function SectionTemplate({ children }: { children: React.ReactNode }) {
  return <div className="section-in">{children}</div>;
}
