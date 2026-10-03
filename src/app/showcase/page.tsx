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
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
            Factory Showcase
          </h1>
          <p className="text-sm text-muted sm:text-base max-w-2xl">
            Live micro-tools built by the Autonomous Product &amp; Software Factory. Deterministic
            calculators, every one exposing a WebMCP endpoint for agents.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/billing"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-black/[0.03] transition-colors shadow-2xs"
          >
            <CreditCard className="h-3.5 w-3.5 text-primary" />
            <span>Billing &amp; API Keys</span>
          </Link>
          <Link
            href="/.well-known/mcp.json"
            target="_blank"
            className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-card px-3 py-1.5 font-mono text-xs text-muted hover:text-foreground hover:bg-black/[0.03] transition-colors shadow-2xs"
          >
            <span>mcp.json</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </header>
      <DirectoryList />
    </main>
  );
}
