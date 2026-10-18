import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CreditCard, ExternalLink } from "lucide-react";
import DirectoryList from "@/components/directory-list";
import { AmbientGrid, HorizonStripe } from "@/components/editorial/signature";
import { canonicalMetadata } from "@/lib/seo/canonical";
import { activeProducts } from "@/products/registry";

export const metadata: Metadata = {
  ...canonicalMetadata("/showcase"),
  title: "Factory Showcase — Six Deterministic Tools That Prove the Number",
  description:
    "Six deterministic tools that re-run the arithmetic behind an invoice, payout, quote or business case before you act on it. Every check runs in your browser — nothing estimated, nothing sent anywhere.",
};

/**
 * The proof strip is DERIVED, never written by hand. A directory that advertises "6 tools" while the
 * registry holds 5 is the class of defect `src/products/registry.ts` exists to prevent, so both
 * counts are read from it and the strip simply cannot drift.
 */
const liveTools = activeProducts.length;
const agentEndpoints = activeProducts.reduce(
  (total, product) => total + product.webmcpTools.length,
  0,
);

const PROOF = [
  { value: String(liveTools), label: "tools live" },
  { value: String(agentEndpoints), label: "agent-callable endpoints" },
  { value: "0", label: "network calls per run" },
  { value: "$0", label: "to run in the browser" },
];

/** The shared shape of every tool, stated once instead of six times. No invented numbers. */
const STEPS = [
  {
    title: "Paste the source document",
    detail: "The invoice, payout export, quote or business case, exactly as it arrived.",
  },
  {
    title: "Every line is recomputed",
    detail: "At the rate and rule the document itself declares — the tool holds no price list.",
  },
  {
    title: "You get a verdict with reasons",
    detail: "A pass, or the exact rule id that withheld it. Nothing is estimated or guessed.",
  },
];

export default function ShowcasePage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Top Horizon Stripe */}
      <HorizonStripe domain="finance" />

      {/* Main Content with Ambient Grid Canvas */}
      <div className="relative">
        <AmbientGrid height="h-96" />

        <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
          {/* Utility row — what this place is, and the two things a returning visitor came for. */}
          <header className="mb-10 flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-2 self-start rounded-full border border-[#E2E8F0] bg-[#F1F5F9]/90 px-3 py-1 font-mono text-[11px] font-semibold text-[#334155]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#10B981]" />
              </span>
              {liveTools} LIVE TOOLS · WEBMCP CATALOG
            </span>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/billing"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border/80 bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-black/[0.03]"
              >
                <CreditCard className="h-3.5 w-3.5 text-primary" />
                <span>Billing &amp; API keys</span>
              </Link>
              <Link
                href="/.well-known/mcp.json"
                target="_blank"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border/80 bg-card px-3.5 py-2 font-mono text-xs text-muted shadow-2xs transition-colors hover:bg-black/[0.03] hover:text-foreground"
              >
                <span>mcp.json</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </header>

          {/* The message, then the mechanism beside it. A message alone on a 1440px canvas reads as a
              press release; the three-step panel is the explanation that earns the claim, using no
              invented numbers (the review found the page's numbers must come from the registry). */}
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              {/* One verb-first line. The old h1 named the artifact ("Factory Showcase"); a comma
                  list of document types ("Every invoice, payout and quote") broke 3 lines at 1280 and
                  split the accent phrase mid-sentence. This holds two lines at every width. */}
              <h1 className="max-w-3xl text-4xl font-bold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl lg:text-[56px]">
                Prove the number{" "}
                <span className="text-primary">before you act on it.</span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
                Six deterministic tools that re-run the arithmetic behind an invoice, payout, quote or
                business case — and show the rule that decided every line. Paste the document, read
                the verdict, keep the evidence.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="#directory"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-card shadow-[0_2px_8px_rgba(79,70,229,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(79,70,229,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] active:translate-y-0"
                >
                  Browse the six tools
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/billing"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 text-sm font-semibold text-foreground shadow-2xs transition-colors hover:bg-black/[0.03]"
                >
                  See pricing
                </Link>
              </div>
            </div>

            {/* How it works — three steps, hairline-separated, monospaced indices. */}
            <div className="w-full rounded-2xl bg-card px-5 py-4 shadow-[0_0_0_1px_rgba(15,23,42,0.06),0_8px_24px_-4px_rgba(15,23,42,0.04)] sm:px-6 sm:py-5 lg:col-span-5">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                How every tool decides
              </p>
              <ol className="mt-1 divide-y divide-border/70">
                {STEPS.map((step, index) => (
                  <li key={step.title} className="flex gap-4 py-3.5">
                    <span
                      className="mt-0.5 font-mono text-[11px] font-semibold tabular-nums text-primary"
                      aria-hidden="true"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground">{step.title}</p>
                      <p className="text-xs leading-relaxed text-muted">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Proof strip — the message made numeric. Four facts, no adjectives.
              Structure is a real <dl>: one <div> per group holding exactly <dt> + <dd> (axe
              `definition-list` rejects anything else inside it — a `<p>` label failed the gate). */}
          <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-5 border-y border-border/70 py-6 sm:grid-cols-4">
            {PROOF.map((item) => (
              <div key={item.label} className="flex flex-col-reverse">
                <dt className="mt-0.5 text-xs leading-snug text-muted">{item.label}</dt>
                <dd className="font-mono text-3xl font-bold tabular-nums tracking-tight text-foreground">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-12">
            <DirectoryList />
          </div>
        </main>
      </div>
    </div>
  );
}
