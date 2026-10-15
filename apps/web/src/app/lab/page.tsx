import type { Metadata } from "next";
import { OpeningStage } from "@/features/opening/OpeningStage";

export const metadata: Metadata = {
  title: "Laboratorio de apertura",
  description: "Prototipo local de la apertura de sobres con datos falsos.",
};

export default function LabPage() {
  return <OpeningStage debug />;
}
