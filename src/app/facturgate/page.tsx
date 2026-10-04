import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, ShieldCheck } from "lucide-react";
import FacturGateCalculator from "@/components/facturgate-calculator";
import FacturGateMcpGuide from "@/components/facturgate-mcp-guide";
import FacturGateSchematic from "@/components/facturgate-schematic";
import ProductPricing from "@/components/product-pricing";
import { Badge } from "@/components/ui/badge";
import { SUITE_PRO_MONTHLY_USD, lowestAgentRate } from "@/products/pricing";
import { einvoicePresets } from "@/lib/seo/einvoice/presets";

export const metadata: Metadata = {
  title: "FacturGate — EU E-Invoice Pre-Send Gate & Factur-X Converter",
  description:
    "Deterministic EN 16931 + CIUS-FR pre-send validation for EU e-invoices: exact rule findings with field paths and fixes, totals reconciled to the cent, a 0-100 readiness score, and conversion to Factur-X (CII) or UBL 2.1.",
};

/**
 * The prices FacturGate advertises come from the pricing catalog (src/products/pricing.ts) — the
 * same numbers the checkout and the agent API charge. A price written a second time here would
 * silently advertise a rate nobody is charged.
 */
const SUITE_PRO_USD = SUITE_PRO_MONTHLY_USD;
const AGENT_FROM_USD = lowestAgentRate("facturgate");

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      {/* Top Horizon Stripe (legal/compliance domain: #4F46E5 -> #0284C7 -> #10B981) */}
      <div
        className="h-[3.5px] w-full bg-gradient-to-r from-[#4F46E5] via-[#0284C7] to-[#10B981]"
        aria-hidden="true"
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-base font-bold tracking-tight text-card shadow-xs">
              FG
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-foreground">FacturGate</span>
                <Badge variant="accent">EN 16931 + CIUS-FR</Badge>
              </div>
              <p className="text-xs text-subtle">EU E-Invoice Pre-Send Gate &amp; Factur-X Converter</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/billing"
              className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-black/[0.03] transition-colors shadow-2xs"
            >
              <CreditCard className="h-3.5 w-3.5 text-primary" />
              <span>Billing &amp; Pricing</span>
              <span className="hidden sm:inline font-mono text-[11px] font-semibold text-primary">
                (${SUITE_PRO_USD}/mo · from ${AGENT_FROM_USD.toFixed(2)}/call)
              </span>
            </Link>
            <Badge variant="success" className="hidden lg:inline-flex gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Zero Egress • Client-Side</span>
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content with Ambient Grid Canvas */}
      <div className="relative flex-1">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-72 -z-10 [background-image:radial-gradient(#CBD5E1_0.75px,transparent_0.75px)] [background-size:16px_16px] opacity-60 [mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)]"
          aria-hidden="true"
        />

        <div className="mx-auto w-full max-w-4xl space-y-4 px-4 pt-8 text-center sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-mono text-xs font-semibold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              BROWSER-LOCAL DETERMINISTIC • ZERO EGRESS
            </span>
            <Link
              href="/billing"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/90 px-3 py-1 text-xs font-medium text-muted hover:text-foreground transition-colors shadow-2xs"
            >
              <CreditCard className="h-3 w-3 text-primary" />
              <span>
                Free in browser · Agents from{" "}
                <strong className="font-mono text-foreground font-semibold">
                  ${AGENT_FROM_USD.toFixed(2)}
                </strong>
                /call ·{" "}
                <strong className="font-mono text-foreground font-semibold">${SUITE_PRO_USD}</strong>
                /mo Pro
              </span>
              <span className="text-subtle font-mono">→</span>
            </Link>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
            FacturGate — EU e-invoice pre-send gate
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-muted sm:text-base">
            Validate an EN 16931 invoice before it leaves, see the exact blocking rules with the fix
            for each, and convert it to Factur-X (CII) or UBL 2.1. Deterministic rules, no LLM, no
            invented defaults: a field that is missing fails loudly with its rule id.
          </p>

          <FacturGateSchematic />
        </div>

        <FacturGateCalculator initialFormat="facturx" initialCountry="FR" />

        <div className="mx-auto w-full max-w-4xl space-y-10 px-4 pb-14 sm:px-6">
          <FacturGateMcpGuide />

          <ProductPricing slug="facturgate" />

          <div className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">
              Rule and country deep dives
            </h2>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {einvoicePresets.map((preset) => (
                <li key={preset.slug}>
                  <Link
                    className="block rounded border border-border bg-card p-3 text-sm text-muted transition-colors hover:text-foreground"
                    href={`/facturgate/calc/${preset.slug}`}
                  >
                    <span className="block font-medium text-foreground">{preset.heading}</span>
                    <span className="mt-1 block text-xs text-subtle">{preset.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-xs text-subtle">
              Agent surface: <code className="font-mono">validate_einvoice</code>,{" "}
              <code className="font-mono">convert_invoice_to_facturx</code> and{" "}
              <code className="font-mono">check_eu_vat_id</code> are registered as WebMCP tools and
              advertised in{" "}
              <Link className="underline" href="/.well-known/mcp.json">
                /.well-known/mcp.json
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
