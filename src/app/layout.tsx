import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { WebMCPProvider } from "@/components/webmcp-provider";
import { SITE_ORIGIN } from "@/lib/seo/crawlMap";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Absolute base for every metadata URL (canonicals, share images). Without it Next emits
  // RELATIVE canonicals — which Google ignores, the state Search Console read as
  // "User-declared canonical: None" on all 24 rule pages.
  metadataBase: new URL(SITE_ORIGIN),
  title: "Factory — Micro-Tool Showcase",
  description:
    "Live micro-tools built by the Autonomous Product & Software Factory.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <WebMCPProvider>{children}</WebMCPProvider>
      </body>
    </html>
  );
}
