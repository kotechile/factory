import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { WebMCPProvider } from "@/components/webmcp-provider";
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <WebMCPProvider>{children}</WebMCPProvider>
      </body>
    </html>
  );
}
