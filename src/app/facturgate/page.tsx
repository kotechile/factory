import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ExternalLink } from "lucide-react";
import FacturGateCalculator from "@/components/facturgate-calculator";
import FacturGateMcpGuide from "@/components/facturgate-mcp-guide";
import FacturGateSchematic from "@/components/facturgate-schematic";
import ProductPricing from "@/components/product-pricing";
import {
  AmbientGrid,
  DeterminismPill,
  EditorialHero,
  HorizonStripe,
  ProductHeader,
} from "@/components/editorial/signature";
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
      {/* Top Horizon Stripe (legal/compliance domain) */}
      <HorizonStripe domain="compliance" />

      <ProductHeader
        initials="FG"
        name="FacturGate"
        badge="EN 16931 + CIUS-FR"
        tagline="EU E-Invoice Pre-Send Gate &amp; Factur-X Converter"
        billingLabel="Billing &amp; Pricing"
        priceChip={`($${SUITE_PRO_USD}/mo · from $${AGENT_FROM_USD.toFixed(2)}/call)`}
        assurance="Zero Egress • Client-Side"
      />

      <div className="relative flex-1">
        <AmbientGrid />

        <main className="mx-auto w-full max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
          <EditorialHero
            pill={<DeterminismPill primary="BROWSER-LOCAL DETERMINISTIC" secondary="EN 16931 + CIUS-FR RULE SET" />}
            title="Know an invoice will be rejected before it leaves"
            description={
              <>
                Validate an EN 16931 invoice before it leaves, see the exact blocking rules with the fix
                for each, and convert it to Factur-X (CII) or UBL 2.1. Deterministic rules, no LLM, no
                invented defaults: a field that is missing{" "}
                <strong className="text-foreground">fails loudly with its rule id</strong>.
                <span className="block pt-2">
                  <a
                    href="https://giniloh.com/facturgate-the-deterministic-pre-send-gate-converter-for-european-e/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.04] px-3.5 py-1 text-xs font-medium text-foreground hover:bg-primary/[0.08] hover:border-primary/40 transition-colors shadow-2xs"
                  >
                    <BookOpen className="h-3 w-3 text-primary" />
                    <span>Read Architectural Guide: FacturGate &amp; the 2026 European E-Invoicing Mandate</span>
                    <ExternalLink className="h-2.5 w-2.5 text-subtle" />
                  </a>
                </span>
              </>
            }
            artwork={<FacturGateSchematic />}
          />

          <FacturGateCalculator initialFormat="facturx" initialCountry="FR" />

          <div className="mx-auto w-full max-w-4xl space-y-10">
            <FacturGateMcpGuide />

            <ProductPricing slug="facturgate" />

            <div className="space-y-4">
              <h2 className="text-base font-semibold text-foreground">
                Rule and country deep dives
              </h2>

              {/* Featured Comprehensive Pillar Article */}
              <div className="rounded-xl border border-primary/25 bg-primary/[0.03] p-4.5 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
                      AUTHORITATIVE ESSAY &amp; STATUTORY ANALYSIS
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    FacturGate: The Deterministic Pre-Send Gate &amp; Converter for European E-Invoicing
                  </h3>
                  <p className="text-xs text-muted max-w-xl">
                    Deep architectural breakdown of EN 16931, CIUS-FR mandate mechanics, arithmetic variance traps, and why deterministic validation eliminates AP rejection cascades.
                  </p>
                </div>
                <a
                  href="https://giniloh.com/facturgate-the-deterministic-pre-send-gate-converter-for-european-e/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 shrink-0 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-card hover:opacity-90 transition-opacity shadow-xs"
                >
                  <span>Read Full Article</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

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
        </main>
      </div>
    </div>
  );
}
