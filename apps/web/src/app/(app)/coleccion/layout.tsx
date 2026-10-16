import { getDict } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getDict();
  return { title: t.collection.title };
}

/** Solo el título: la sesión y la estructura las pone el grupo `(app)` (spec 010). */
export default function ColeccionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
