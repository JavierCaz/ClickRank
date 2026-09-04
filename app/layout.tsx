import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { SiteFooter } from "@/components/site-footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ClickRank — ¿Quién es la persona más clickeable de Instagram?",
    template: "%s — ClickRank",
  },
  description:
    "Agrega tu perfil de Instagram y sube en la clasificación. Cada click cuenta: más clicks, más arriba.",
  openGraph: {
    type: "website",
    title: "ClickRank",
    description:
      "¿Quién es la persona más clickeable de Instagram? Haz click en un perfil y ayúdale a subir en la clasificación.",
    siteName: "ClickRank",
  },
  twitter: {
    card: "summary",
    title: "ClickRank",
    description:
      "¿Quién es la persona más clickeable de Instagram? Haz click en un perfil y ayúdale a subir en la clasificación.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
