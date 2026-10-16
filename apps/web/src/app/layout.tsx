import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { I18nProvider } from "@/i18n/client";
import { getDict, getLocale } from "@/i18n/server";
import { SiteFooter } from "@/features/legal/SiteFooter";
import { TimeZoneCookie } from "@/features/rewards/TimeZoneCookie";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Tipografía de la marca (docs/DESIGN.md): títulos y logotipo.
const display = localFont({ src: "../../assets/fonts/SpaceGrotesk.ttf", variable: "--font-display", weight: "300 700" });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDict();
  return {
    metadataBase: new URL(process.env.SITE_URL || "http://localhost:3100"),
    title: { default: t.common.siteTitle, template: "%s · Waifu Baker" },
    description: t.common.siteDescription,
    applicationName: "Waifu Baker",
  };
}

export const viewport: Viewport = { themeColor: "#0b0912", colorScheme: "dark" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable} ${display.variable} antialiased`}>
        <I18nProvider locale={locale}>
          <TimeZoneCookie />
          {children}
          <SiteFooter />
        </I18nProvider>
      </body>
    </html>
  );
}
