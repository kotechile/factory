import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { products } from "@/products/registry";
import { AmbientGrid, GhostCard, HorizonStripe } from "@/components/editorial/signature";

/**
 * The retirement notice for QuarterLine (registry `status: "killed"`).
 *
 * This route used to render `QuarterLineCalculator`. Retirement (owner call, 2026-10-05) withdrew the
 * public surfaces of a product that is no longer in inventory, so the page now carries the notice the
 * showcase directory already prints for a retired entry — and nothing that looks like a working, dead-end
 * tool (the old page's "$9 export" CTA returned an explicit 400 once checkout stopped selling it).
 *
 * Copy is DERIVED from the registry entry, never hand-written a second time, and the page fails loud if
 * the entry is no longer retired (AGENTS.md rule 5): reactivating the product must break the build here
 * instead of silently shipping a notice that claims a live product is gone.
 */
const SLUG = "quarterline";
const entry = products.find((product) => product.slug === SLUG);

if (!entry || entry.status !== "killed") {
  throw new Error(
    `src/app/${SLUG}/page.tsx is a retirement notice, but the registry entry for "${SLUG}" is ` +
      `${entry ? `"${entry.status}"` : "missing"}. Rebuild this route as the product UI, or flip the ` +
      `registry entry back to "killed" — refusing to serve a retirement notice that is no longer true.`,
  );
}

/** Narrowed once at module scope so the component below reads a non-optional entry. */
const retired = entry;

export const metadata: Metadata = {
  title: "QuarterLine — Retired",
  description:
    "QuarterLine, the 2026 self-employment tax and Section 199A QBI calculator, has been retired from the factory's inventory. The live micro-tools are in the Factory Showcase.",
  // The retired product's pages leave the index (they were pSEO landing pages while it was in
  // inventory); the notice itself stays crawlable and linkable so the record is reachable.
  robots: { index: false, follow: true },
};

const WITHDRAWN = [
  "The calculator no longer renders here, and the tool cannot be purchased: a checkout request for it is rejected as retired rather than silently attributed to another product.",
  "Its programmatic-SEO pages are withdrawn — every old /quarterline/calc/<slug> URL now permanently redirects to the directory.",
  "Its agent tools (WebMCP) are no longer served or advertised; the published manifest lists only tools belonging to products in inventory.",
];

export default function Page() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <HorizonStripe domain="finance" />

      <div className="relative">
        <AmbientGrid height="h-64" />

        <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-[#F1F5F9]/90 px-3 py-1 font-mono text-[11px] font-semibold text-[#334155] shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[#94A3B8]" aria-hidden="true" />
              RETIRED PRODUCT • MICRO-TOOL DIRECTORY
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {retired.name} is retired
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted sm:text-base">
              {retired.description}
            </p>
          </div>

          <GhostCard className="mt-8 p-6 sm:p-7">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              What that means
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
              {WITHDRAWN.map((line) => (
                <li key={line} className="flex gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </GhostCard>

          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link
              href="/showcase"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-card shadow-[0_2px_8px_rgba(79,70,229,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(79,70,229,0.4),inset_0_1px_0_rgba(255,255,255,0.25)] active:translate-y-0"
            >
              <span>Browse the live micro-tools</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <span className="font-mono text-xs text-subtle">
              {retired.name} left the inventory; the directory lists what is live now.
            </span>
          </div>
        </main>
      </div>
    </div>
  );
}
