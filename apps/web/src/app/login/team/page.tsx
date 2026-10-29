import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LocaleToggle } from "@/i18n/LocaleToggle";
import { getDict } from "@/i18n/server";
import { Card } from "@/ui/content/Card";
import { StaffLogin } from "./StaffLogin";

export async function generateMetadata() {
  const t = await getDict();
  return { title: t.site.adminLogin.title, robots: { index: false } };
}

/** Spec 024, RF-14: acceso del equipo (tú y Bruno) con usuario, contraseña y código por Telegram. */
export default async function StaffLoginPage() {
  const session = await auth();
  if (session?.user?.role === "admin") redirect("/admin");
  const t = await getDict();
  return (
    <main className="grid min-h-dvh place-items-center bg-ui-bg px-4 text-ui-text">
      <LocaleToggle className="fixed right-4 top-4 z-50" />
      <Card as="div" className="w-full max-w-sm space-y-5 p-6">
        <h1 className="text-xl font-bold">{t.site.adminLogin.title}</h1>
        <StaffLogin />
        <Link href="/login" className="block text-sm text-ui-text-3 underline-offset-4 hover:underline">
          {t.site.adminLogin.back}
        </Link>
      </Card>
    </main>
  );
}
