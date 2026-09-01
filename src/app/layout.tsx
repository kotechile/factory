import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { WebMCPProvider } from "@/components/webmcp-provider";
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
  title: "QuarterLine — 2026 Self-Employment Tax Calculator",
  description:
    "Deterministic 2026 self-employment tax, QBI deduction, and estimated-payment calculator.",
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
