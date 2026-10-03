"use client";

import * as React from "react";
import Link from "next/link";
import {
  CreditCard,
  Bot,
  ShieldCheck,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Receipt,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/lib/telemetry-client";
import BillingUsage from "@/components/billing-usage";
import { activeProducts } from "@/products/registry";
import { PRODUCT_PRICING } from "@/products/pricing";

interface ToolPricingRow {
  name: string;
  slug: string;
  tool: string;
  webPreview: string;
  exportPrice: string;
  agentPrice: string;
}

/**
 * Derived from the pricing catalog (src/products/pricing.ts) and the product registry, never
 * hand-written: this table used to hardcode "$0.25 / query" on every product, which was already
 * wrong for five of the ten tools.
 */
const PRICING_MATRIX: ToolPricingRow[] = activeProducts.map((product) => {
  const pricing = PRODUCT_PRICING[product.slug];
  const rates = pricing ? Object.values(pricing.agentRates) : [];
  const lowest = rates.length > 0 ? Math.min(...rates) : null;
  return {
    name: product.name,
    slug: product.slug,
    tool: product.webmcpTools.join(" / "),
    webPreview: "Free (Deterministic)",
    exportPrice:
      pricing && pricing.exportUsd !== null ? `$${pricing.exportUsd} one-off / Pro` : "Free / Pro",
    agentPrice: lowest !== null ? `from $${lowest.toFixed(2)} / query` : "—",
  };
});

export default function FactoryBillingPortal() {
  const [lookupQuery, setLookupQuery] = React.useState("");
  const [busyPortal, setBusyPortal] = React.useState(false);
  const [portalError, setPortalError] = React.useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = React.useState<"agent" | "pro" | null>(null);

  React.useEffect(() => {
    trackEvent("page_view", undefined, "billing");
  }, []);

  const handlePortalLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupQuery.trim()) return;

    setBusyPortal(true);
    setPortalError(null);

    try {
      // Only a Stripe customer id (a `cus_…` capability from the receipt email) opens a portal.
      // The previous "email" path resolved any address to its Stripe customer and opened that
      // customer's billing portal for whoever typed it (defect D1).
      const value = lookupQuery.trim();
      if (!/^cus_[A-Za-z0-9]+$/.test(value)) {
        throw new Error(
          "Enter the Stripe customer ID from your receipt email (it starts with cus_…).",
        );
      }

      const res = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: value }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "No billing account found for this customer ID.");
      }

      window.location.href = data.url;
    } catch (err) {
      setPortalError(err instanceof Error ? err.message : "Failed to open billing portal.");
      setBusyPortal(false);
    }
  };

  const handleCheckout = async (plan: "agent_metered" | "factory_pro") => {
    setCheckoutBusy(plan === "agent_metered" ? "agent" : "pro");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Price, mode and product name are resolved server-side from the plan catalog — the
        // client no longer sends `amount`/`mode`/`productName` (a caller-supplied price is a
        // live billing defect; see context/pending_approval.md billing v1, defect D2).
        body: JSON.stringify({
          plan,
          app: "billing",
          successUrl: `${window.location.origin}/billing?session_id={CHECKOUT_SESSION_ID}&plan=${plan}&status=success`,
          cancelUrl: `${window.location.origin}/billing?canceled=true`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Unable to initialize Stripe checkout.");
      }

      window.location.href = data.url;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to redirect to checkout.");
      setCheckoutBusy(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      {/* Top Horizon Stripe */}
      <div
        className="h-[3.5px] w-full bg-gradient-to-r from-[#635BFF] via-[#4338CA] to-[#06B6D4]"
        aria-hidden="true"
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/showcase"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-lg font-bold tracking-tight text-card shadow-xs transition-transform hover:scale-105"
            >
              F
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-foreground">
                  Factory Billing
                </span>
                <Badge variant="accent">Stripe Managed</Badge>
              </div>
              <p className="text-xs text-subtle">Autonomous Product &amp; Software Factory</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/showcase"
              className="text-xs font-medium text-muted hover:text-foreground transition-colors"
            >
              Showcase Directory
            </Link>
            <span className="text-border">|</span>
            <Link
              href="/.well-known/mcp.json"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
            >
              <span>mcp.json</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content with Technical Grid Canvas */}
      <div className="relative flex-1">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-80 -z-10 [background-image:radial-gradient(#CBD5E1_0.75px,transparent_0.75px)] [background-size:16px_16px] opacity-60 [mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)]"
          aria-hidden="true"
        />

        <main className="mx-auto w-full max-w-6xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-[#F1F5F9]/90 px-3 py-1 font-mono text-xs text-[#334155] shadow-2xs backdrop-blur-xs">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#10B981]" />
              </span>
              <span className="font-semibold text-foreground">FACTORY BILLING PORTAL</span>
              <span className="text-[#94A3B8]">|</span>
              <span className="font-semibold text-[#334155]">METERED USAGE &amp; CUSTOMER PORTAL</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Deterministic Pricing for Agents &amp; Teams
            </h1>

            <p className="text-sm text-muted sm:text-base leading-relaxed">
              Register a card to receive an <code className="font-mono text-foreground font-semibold">x-customer-id</code> for
              autonomous $0.25/query WebMCP tool execution, subscribe to Factory Pro, or manage existing invoices via Stripe.
            </p>
          </div>

          {/* Pricing & Onboarding Cards Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Card 1: Agent Metered Access */}
            <Card className="flex flex-col rounded-2xl border-0 bg-card ring-1 ring-[#0F172A]/[0.06] shadow-[0_12px_32px_-8px_rgba(15,23,42,0.06)] overflow-hidden">
              <div className="h-1.5 w-full bg-[#10B981]" />
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <Badge variant="success" className="font-mono text-[10px]">
                    AGENT TIER
                  </Badge>
                  <Bot className="h-5 w-5 text-[#10B981]" />
                </div>
                <CardTitle className="text-xl font-bold mt-2">Agent Metered Pass</CardTitle>
                <CardDescription className="text-xs">
                  Pay-as-you-go access for AI agents, LLM pipelines, and automated accounting bots.
                </CardDescription>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold font-mono text-foreground">$0.25</span>
                  <span className="text-xs text-muted font-medium">/ successful query</span>
                </div>
                <p className="text-[11px] text-[#047857] font-medium mt-1">
                  $0 base subscription • Billed monthly on usage
                </p>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col justify-between space-y-6 pt-2">
                <ul className="space-y-2.5 text-xs text-muted">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0 mt-0.5" />
                    <span>
                      Instant Stripe Customer ID (<code className="font-mono text-subtle">cus_...</code>) for your MCP client config.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0 mt-0.5" />
                    <span>
                      Universal access across LedgerLink, FacturGate, ParcelProof &amp; CaseProof.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0 mt-0.5" />
                    <span>
                      Strict deterministic guarantees: zero-egress, ASC 606 &amp; EN 16931 compliance.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0 mt-0.5" />
                    <span>
                      Detailed monthly Stripe statement with per-tool query breakdown.
                    </span>
                  </li>
                </ul>

                <button
                  type="button"
                  onClick={() => handleCheckout("agent_metered")}
                  disabled={Boolean(checkoutBusy)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-[#4338CA] active:bg-[#3730A3] py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {checkoutBusy === "agent" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  <span>Get Agent API Access</span>
                </button>
              </CardContent>
            </Card>

            {/* Card 2: Factory Pro Access */}
            <Card className="flex flex-col rounded-2xl border-0 bg-card ring-1 ring-primary/30 shadow-[0_12px_32px_-8px_rgba(79,70,229,0.12)] overflow-hidden relative">
              <div className="h-1.5 w-full bg-primary" />
              <div className="absolute top-4 right-4">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                  POPULAR
                </span>
              </div>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <Badge variant="accent" className="font-mono text-[10px]">
                    WEB SUITE
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold mt-2">Factory Pro Suite</CardTitle>
                <CardDescription className="text-xs">
                  For accountants, logistics analysts, and procurement officers using browser tools.
                </CardDescription>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold font-mono text-foreground">$29.00</span>
                  <span className="text-xs text-muted font-medium">/ month</span>
                </div>
                <p className="text-[11px] text-primary font-medium mt-1">
                  All micro-SaaS calculators included
                </p>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col justify-between space-y-6 pt-2">
                <ul className="space-y-2.5 text-xs text-muted">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>
                      Unlimited browser calculations &amp; exports across all live products.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>
                      Branded PDF decision packs, Xero/QuickBooks CSVs, and Factur-X XML.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>
                      Automatic updates for changing regulatory rates (tax brackets, carrier divisors).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>
                      Cancel anytime self-serve via the Stripe Billing Portal.
                    </span>
                  </li>
                </ul>

                <button
                  type="button"
                  onClick={() => handleCheckout("factory_pro")}
                  disabled={Boolean(checkoutBusy)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-[#4338CA] active:bg-[#3730A3] py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {checkoutBusy === "pro" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  <span>Subscribe to Factory Pro ($29/mo)</span>
                </button>
              </CardContent>
            </Card>

            {/* Card 3: Existing Customer Portal Gateway */}
            <Card className="flex flex-col rounded-2xl border-0 bg-card ring-1 ring-[#0F172A]/[0.06] shadow-[0_12px_32px_-8px_rgba(15,23,42,0.06)] overflow-hidden">
              <div className="h-1.5 w-full bg-[#06B6D4]" />
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    STRIPE PORTAL
                  </Badge>
                  <CreditCard className="h-5 w-5 text-[#06B6D4]" />
                </div>
                <CardTitle className="text-xl font-bold mt-2">Manage Account</CardTitle>
                <CardDescription className="text-xs">
                  Update payment cards, view past invoices, download tax receipts, or modify plans —
                  open it with the link in your receipt email.
                </CardDescription>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-lg font-bold text-foreground">Self-Service Gateway</span>
                </div>
                <p className="text-[11px] text-muted mt-1">
                  Direct encrypted session to Stripe Billing
                </p>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col justify-between space-y-6 pt-2">
                <form onSubmit={handlePortalLookup} className="space-y-3">
                  <div>
                    <label
                      htmlFor="portal-query"
                      className="block text-xs font-semibold text-foreground mb-1"
                    >
                      Stripe Customer ID
                    </label>
                    <input
                      id="portal-query"
                      type="text"
                      value={lookupQuery}
                      onChange={(e) => setLookupQuery(e.target.value)}
                      placeholder="cus_..."
                      required
                      className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted/60 focus:outline-hidden focus:ring-2 focus:ring-primary"
                    />
                    <p className="mt-1 text-[11px] text-muted">
                      Find it in your receipt email — the link there opens your portal directly.
                    </p>
                  </div>

                  {portalError && (
                    <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 p-2.5 text-xs text-destructive">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{portalError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={busyPortal || !lookupQuery.trim()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-border/80 bg-card hover:bg-black/[0.03] py-2.5 text-xs font-semibold text-foreground shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {busyPortal ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5 text-primary" />
                    )}
                    <span>Open Stripe Portal</span>
                  </button>
                </form>

                <div className="rounded-xl border border-border/60 bg-[#F8FAFC] p-3 text-[11px] text-muted">
                  <div className="flex items-center gap-1.5 font-medium text-foreground mb-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#10B981]" />
                    <span>Hosted by Stripe</span>
                  </div>
                  <span>
                    Your payment details never touch factory servers. All updates and cancellations are handled securely by Stripe.
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pricing Transparency Matrix */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Factory Tool Pricing Matrix</h3>
                <p className="text-xs text-muted">
                  Standardized fee schedules across all active micro-SaaS utilities.
                </p>
              </div>
              <Badge variant="outline" className="hidden sm:inline-flex gap-1 font-mono text-[10px]">
                <Receipt className="h-3 w-3" />
                <span>NO HIDDEN FEES</span>
              </Badge>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_4px_16px_-4px_rgba(15,23,42,0.04)] ring-1 ring-[#0F172A]/[0.05]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/80 bg-[#F8FAFC] font-mono text-muted uppercase tracking-wider text-[11px]">
                      <th className="py-3 pl-6 pr-4 font-semibold">Product</th>
                      <th className="py-3 px-4 font-semibold">MCP Tool</th>
                      <th className="py-3 px-4 font-semibold">Web Preview</th>
                      <th className="py-3 px-4 font-semibold">Full Export / Pack</th>
                      <th className="py-3 pr-6 pl-4 font-semibold">Agent WebMCP Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-sans">
                    {PRICING_MATRIX.map((row) => (
                      <tr key={row.slug} className="hover:bg-black/[0.01] transition-colors">
                        <td className="py-3.5 pl-6 pr-4 font-semibold text-foreground">
                          <Link href={`/${row.slug}`} className="hover:text-primary transition-colors">
                            {row.name} →
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-muted">
                          {row.tool}
                        </td>
                        <td className="py-3.5 px-4 text-[#047857] font-medium">
                          {row.webPreview}
                        </td>
                        <td className="py-3.5 px-4 text-foreground font-medium">
                          {row.exportPrice}
                        </td>
                        <td className="py-3.5 pr-6 pl-4 font-mono font-bold text-primary">
                          {row.agentPrice}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* V1.4 — this customer's own usage, spend cap and per-query audit log */}
          <BillingUsage />
        </main>
      </div>
    </div>
  );
}
