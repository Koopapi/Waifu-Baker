import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Tipografía de la marca (docs/DESIGN.md): títulos y logotipo.
const display = localFont({ src: "../../assets/fonts/SpaceGrotesk.ttf", variable: "--font-display", weight: "300 700" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "http://localhost:3100"),
  title: { default: "Waifu Baker · Cartas coleccionables", template: "%s · Waifu Baker" },
  description: "Cartas coleccionables digitales de ilustración anime. Abre sobres, colecciona tus favoritas y completa cada colección.",
  applicationName: "Waifu Baker",
};

export const viewport: Viewport = { themeColor: "#0b0912", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} ${display.variable} antialiased`}>{children}</body>
    </html>
  );
}
