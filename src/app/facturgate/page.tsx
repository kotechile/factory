import type { Metadata } from "next";
import Link from "next/link";
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
