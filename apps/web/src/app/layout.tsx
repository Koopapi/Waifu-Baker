import type { Metadata, Viewport } from "next";
import { Fredoka, Geist_Mono, Nunito } from "next/font/google";
import { I18nProvider } from "@/i18n/client";
import { getDict, getLocale } from "@/i18n/server";
import { SiteFooter } from "@/features/legal/SiteFooter";
import { TimeZoneCookie } from "@/features/rewards/TimeZoneCookie";
import { ToastProvider } from "@/ui/feedback/Toast";
import { ConfirmProvider } from "@/ui/overlay/Confirm";
import "./globals.css";

// Spec 014: tipografías redondeadas (licencia OFL). Nunito para el texto y Fredoka para títulos y logotipo.
const body = Nunito({ variable: "--font-body", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Fredoka({ variable: "--font-display", subsets: ["latin"] });

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

export const viewport: Viewport = { themeColor: "#241b29", colorScheme: "dark" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    // Los navegadores y sus extensiones añaden atributos a <html> y <body> antes de hidratar (p. ej. Chrome en iPhone).
    <html lang={locale} suppressHydrationWarning>
      <body suppressHydrationWarning className={`${body.variable} ${geistMono.variable} ${display.variable} antialiased`}>
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
