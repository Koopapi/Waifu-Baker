import type { Metadata } from "next";
import { OpeningStage } from "@/features/opening/OpeningStage";

export const metadata: Metadata = {
  title: "Lab · apertura de sobres",
  description: "Prototipo local de la apertura de sobres con datos falsos.",
};

export default function LabPage() {
  return <OpeningStage />;
}
