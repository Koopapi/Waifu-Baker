import type { Metadata } from "next";
import { OpeningStage } from "@/features/opening/OpeningStage";
import { LocaleToggle } from "@/i18n/LocaleToggle";
import { getDict } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDict();
  return { title: t.site.lab.metaTitle, description: t.site.lab.metaDescription };
}

export default function LabPage() {
  return (
    <>
      <OpeningStage debug />
      <LocaleToggle className="fixed right-3 top-3 z-50" />
    </>
  );
}
