import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, ExternalLink } from "lucide-react";
import DirectoryList from "@/components/directory-list";

export const metadata: Metadata = {
  title: "Factory Showcase — Micro-Tool Directory",
  description:
    "Live micro-tools built by the Autonomous Product & Software Factory. Deterministic calculators, each exposing a WebMCP endpoint for agents.",
};

export default function ShowcasePage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Top Horizon Stripe */}
      <div
        className="h-[3.5px] w-full bg-gradient-to-r from-[#635BFF] via-[#0284C7] to-[#10B981]"
        aria-hidden="true"
      />

      {/* Main Content with Ambient Grid Canvas */}
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-80 -z-10 [background-image:radial-gradient(#CBD5E1_0.75px,transparent_0.75px)] [background-size:16px_16px] opacity-60 [mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)]"
          aria-hidden="true"
        />

        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between border-b border-border/70 pb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  PRO APPLICATION PORTAL • WEBMCP CATALOG
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Factory Showcase
                </h1>
                <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-0.5 font-mono text-xs font-bold text-card tracking-wider shadow-xs uppercase">
                  PRO
                </span>
              </div>
              <p className="text-sm text-muted sm:text-base max-w-2xl leading-relaxed">
                Deterministic micro-applications and calculators built by the Autonomous Product &amp; Software Factory.
                Every utility runs client-side and exposes an automated WebMCP endpoint.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 font-mono text-xs font-bold text-primary shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>FACTORY PRO</span>
              </span>
              <Link
                href="/billing"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-black/[0.03] transition-colors shadow-2xs"
              >
                <CreditCard className="h-3.5 w-3.5 text-primary" />
                <span>Billing &amp; API Keys</span>
              </Link>
              <Link
                href="/.well-known/mcp.json"
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card px-3.5 py-2 font-mono text-xs text-muted hover:text-foreground hover:bg-black/[0.03] transition-colors shadow-2xs"
              >
                <span>mcp.json</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </header>

          <DirectoryList />
        </main>
      </div>
    </div>
  );
}
