import { SectionSkeleton } from "@/ui/feedback/SectionSkeleton";

/**
 * Pantalla de carga al entrar a una colección desde la lista. La del panel (`admin/loading.tsx`) no cubre esta
 * navegación: queda por encima de «Sets», que no cambia. Sin un límite propio, el clic no daba señal y, en el build de
 * producción, el router de Next a veces no llegaba a mostrar la página (medido: 3 de 5 clics trabados; con este
 * archivo, 8 de 8 entran y las cartas salen en menos de 1 s).
 */
export default function Loading() {
  return <SectionSkeleton variant="cards" />;
}
