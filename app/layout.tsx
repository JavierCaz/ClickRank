import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
    default: "ClickRank — Who's the most clickable person on Instagram?",
    template: "%s — ClickRank",
  },
  description:
    "Submit your Instagram profile and climb the leaderboard. Every click counts — more clicks, higher rank.",
  openGraph: {
    type: "website",
    title: "ClickRank",
    description:
      "Who's the most clickable person on Instagram? Click a profile. Help them climb the leaderboard.",
    siteName: "ClickRank",
  },
  twitter: {
    card: "summary",
    title: "ClickRank",
    description:
      "Who's the most clickable person on Instagram? Click a profile. Help them climb the leaderboard.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
