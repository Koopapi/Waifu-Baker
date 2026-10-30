import type { Metadata, Viewport } from "next";
import { Archivo, Dela_Gothic_One, Fredoka, Geist_Mono, Nunito } from "next/font/google";
import { I18nProvider } from "@/i18n/client";
import { getDict, getLocale } from "@/i18n/server";
import { SiteFooter } from "@/features/legal/SiteFooter";
import { TimeZoneCookie } from "@/features/rewards/TimeZoneCookie";
import { ToastProvider } from "@/ui/feedback/Toast";
import { ConfirmProvider } from "@/ui/overlay/Confirm";
import { requestTheme } from "@/server/auth/request-theme";
import { THEME_META } from "./theme-meta";
import "./globals.css";

// Spec 014: tipografías redondeadas (licencia OFL). Nunito para el texto y Fredoka para títulos y logotipo.
const body = Nunito({ variable: "--font-nunito", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Fredoka({ variable: "--font-fredoka", subsets: ["latin"] });
// Spec 026: las de Street pop (OFL). Sin precarga: el navegador solo las descarga si la página las usa (tema elegido).
const streetBody = Archivo({ variable: "--font-archivo", subsets: ["latin"], style: ["normal", "italic"], preload: false });
const streetDisplay = Dela_Gothic_One({ variable: "--font-dela", weight: "400", subsets: ["latin"], preload: false });
const fontVars = [body, geistMono, display, streetBody, streetDisplay].map((f) => f.variable).join(" ");

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDict();
  return {
    metadataBase: new URL(process.env.SITE_URL || "http://localhost:3100"),
    title: { default: t.common.siteTitle, template: "%s · Waifu Baker" },
    description: t.common.siteDescription,
    applicationName: "Waifu Baker",
    // Safari en iPhone convierte fechas, horas y teléfonos en enlaces (con atributos propios) antes de hidratar.
    formatDetection: { telephone: false, date: false, email: false, address: false },
  };
}

// Spec 026: los controles nativos del navegador (barras, calendario, autocompletar) y la barra del sistema siguen al tema.
export async function generateViewport(): Promise<Viewport> {
  return THEME_META[await requestTheme()];
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [locale, theme] = await Promise.all([getLocale(), requestTheme()]);
  return (
    // Los navegadores y sus extensiones añaden atributos a <html> y <body> antes de hidratar (p. ej. Chrome en iPhone).
    <html lang={locale} data-theme={theme} className={fontVars} suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased">
        <I18nProvider locale={locale}>
          <ToastProvider>
            <ConfirmProvider>
              <TimeZoneCookie />
              {children}
              <SiteFooter />
            </ConfirmProvider>
          </ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
