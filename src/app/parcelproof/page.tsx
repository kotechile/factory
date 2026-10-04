import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ExternalLink } from "lucide-react";
import ParcelProofCalculator from "@/components/parcelproof-calculator";
import ProductPricing from "@/components/product-pricing";
import { AgentSurfaceGuide } from "@/components/editorial/agent-surface-guide";
import { PrismSchematic } from "@/components/editorial/prism-schematic";
import {
  AmbientGrid,
  DeterminismPill,
  EditorialHero,
  HorizonStripe,
  ProductHeader,
} from "@/components/editorial/signature";
import { SUITE_PRO_MONTHLY_USD, lowestAgentRate } from "@/products/pricing";
import { parcelauditPresets } from "@/lib/seo/parcelaudit/presets";

export const metadata: Metadata = {
  title: "ParcelProof — Carrier Invoice DIM-Weight & Surcharge Audit",
  description:
    "Audit UPS, FedEx and USPS parcel invoices against your own shipment records: billable weight recomputed with the carrier × service × ship-date divisor and the round-up rule, accessorial eligibility re-checked with the trigger that failed, late-delivery refunds, the per-line dispute window and a dispute CSV. Unpriced lines are reported unverifiable, never guessed.",
};

/**
 * Every advertised number reads the pricing catalog (src/products/pricing.ts) — the same catalog the
 * checkout and the agent API charge from. A literal here would advertise a rate nobody is charged.
 */
const AGENT_FROM_USD = lowestAgentRate("parcelproof");

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      {/* Top Horizon Stripe (logistics domain) */}
      <HorizonStripe domain="logistics" />

      <ProductHeader
        initials="PP"
        name="ParcelProof"
        badge="UPS · FedEx · USPS"
        tagline="Carrier Invoice DIM-Weight &amp; Surcharge Audit"
        billingLabel="Billing &amp; Pricing"
        priceChip={`($${SUITE_PRO_MONTHLY_USD}/mo · from $${AGENT_FROM_USD.toFixed(2)}/call)`}
        assurance="Unpriceable ≠ $0"
      />

      <div className="relative flex-1">
        <AmbientGrid />

        <main className="mx-auto w-full max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
          <EditorialHero
            pill={<DeterminismPill primary="BROWSER-LOCAL DETERMINISTIC" secondary="CARRIER TARIFFS IN FORCE ON THE SHIP DATE" />}
            title="Prove the weight before you dispute the charge"
            description={
              <>
                Paste the shipment records you handed over and the carrier&apos;s invoice lines. Every
                line is recomputed against the tariff in force on its own ship date, the accessorial
                eligibility is re-checked with the trigger that failed, and the recovery is priced from
                your own contract rate card — a line that cannot be priced is reported{" "}
                <strong className="text-foreground">unverifiable, never guessed</strong>.
                <span className="block pt-2">
                  <a
                    href="https://giniloh.com/parcelproof-stop-bleeding-28-on-carrier-invoices/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.04] px-3.5 py-1 text-xs font-medium text-foreground hover:bg-primary/[0.08] hover:border-primary/40 transition-colors shadow-2xs"
                  >
                    <BookOpen className="h-3 w-3 text-primary" />
                    <span>Read Architectural Guide: Stop Bleeding 28% on Carrier Invoices</span>
                    <ExternalLink className="h-2.5 w-2.5 text-subtle" />
                  </a>
                </span>
              </>
            }
            artwork={
              <PrismSchematic
                kicker="DIM-weight audit pipeline"
                inputLabel="Invoice + records"
                inputDetail="lines + shipment CSV"
                transformLabel="Ship-date tariff"
                nodes={[
                  { label: "Billable weight", value: "recomputed", color: "#EA580C" },
                  { label: "Accessorials", value: "trigger named", color: "#D97706" },
                  { label: "Refund window", value: "UPS 30d · FedEx 21d", color: "#0284C7" },
                  { label: "Recovery ledger", value: "per line", color: "#4F46E5" },
                ]}
                netLabel="Unpriceable line"
                netValue="unverifiable-rate"
                footnote="Billable weight = max(actual, ceil(L)×ceil(W)×ceil(H)/divisor), the divisor resolved by carrier × service × ship date (USPS 166 → 139 on 2026-07-12). A line the contract rate card cannot price is reported unverifiable-rate, never $0."
              />
            }
          />

          <ParcelProofCalculator initialScenario="overcharge" />

          <div className="mx-auto w-full max-w-4xl space-y-10">
            <AgentSurfaceGuide
              productSlug="parcelproof"
              blurb="How agents, LLMs and freight-audit bots invoke the deterministic audit engine."
              tabs={[
                {
                  key: "browser",
                  label: "In-Browser WebMCP",
                  icon: null,
                  fileTitle: "agent-audit-call.ts",
                  meta: "W3C navigator.modelContext",
                  code: `// 1. In any browser with WebMCP support (auto-registered on page load):
// Both tools are mounted on navigator.modelContext
const audit = await navigator.modelContext.executeTool("audit_carrier_invoice", {
  shipment_records: shipmentCsv,   // order_id,tracking,carrier,service,ship_date,length,width,height,actual_weight_lb,zone,...
  invoice_lines: invoiceCsv,       // tracking,invoice_date,carrier,service,billed_weight_lb,zone,base_charge_usd,surcharges,total_usd
  rate_card: contractRateCsv,      // carrier,service,zone,min_weight_lb,max_weight_lb,rate_usd
  as_of_date: "2026-10-04"
});

console.log("Claimable:", audit.summary.claimableUsd); // priced from YOUR rate card
console.log("Unverifiable lines:", audit.summary.unverifiableLines); // never guessed`,
                },
                {
                  key: "curl",
                  label: "HTTP / cURL API",
                  icon: null,
                  fileTitle: "agent-audit-request.sh",
                  meta: "POST /api/agent/calculate",
                  code: `# 2. Direct HTTP / Metered Agent API call
curl -X POST https://apps.giniloh.com/api/agent/calculate \\
  -H "Content-Type: application/json" \\
  -H "x-webmcp-tool: audit_carrier_invoice" \\
  -H "x-customer-id: cus_OptionalStripeCustomerId" \\
  -d '{
    "shipment_records": "order_id,tracking,carrier,service,ship_date,length,width,height,actual_weight_lb,zone\\nSO-1,1Z999,ups,ground,2026-08-04,20,16,12,18,4",
    "invoice_lines": "tracking,invoice_date,carrier,service,billed_weight_lb,zone,base_charge_usd,surcharges,total_usd\\n1Z999,2026-08-06,ups,ground,42,4,31.40,ahs-dim:11.20,42.60",
    "as_of_date": "2026-10-04"
  }'`,
                },
                {
                  key: "config",
                  label: "MCP Client Config",
                  icon: null,
                  fileTitle: "claude_desktop_config.json",
                  meta: "Standard MCP Server JSON",
                  code: `// 3. Desktop Agent Configuration (Cursor, Claude Desktop, Windsurf, Cline)
// Add to your mcpServers in claude_desktop_config.json or cursor settings:
{
  "mcpServers": {
    "software-factory-tools": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-fetch",
        "https://apps.giniloh.com/.well-known/mcp.json"
      ]
    }
  }
}`,
                },
              ]}
              params={[
                {
                  name: "shipment_records",
                  requirement: "Required",
                  description: (
                    <>
                      Shipment records as CSV text (
                      <span className="font-mono text-subtle">
                        order_id,tracking,carrier,service,ship_date,length,width,height,actual_weight_lb,zone,…
                      </span>
                      ).
                    </>
                  ),
                },
                {
                  name: "invoice_lines",
                  requirement: "Required",
                  description: (
                    <>
                      Carrier invoice lines as CSV text (
                      <span className="font-mono text-subtle">
                        tracking,invoice_date,carrier,service,billed_weight_lb,zone,base_charge_usd,surcharges,total_usd
                      </span>
                      ).
                    </>
                  ),
                },
                {
                  name: "rate_card",
                  requirement: "Optional",
                  description: (
                    <>
                      Your contract rate card as CSV (
                      <span className="font-mono text-subtle">
                        carrier,service,zone,min_weight_lb,max_weight_lb,rate_usd
                      </span>
                      ). Omit it and every line is reported unverifiable-rate — the weight proof still
                      holds, and no rate is guessed.
                    </>
                  ),
                },
                {
                  name: "as_of_date",
                  requirement: "Optional",
                  description: (
                    <>
                      ISO 8601 date used as &ldquo;today&rdquo; for the dispute clock and the
                      money-back windows. Defaults to the server&apos;s UTC date.
                    </>
                  ),
                },
                {
                  name: "carrier",
                  requirement: "Optional",
                  description: <>Optional carrier filter — one of ups, fedex, usps.</>,
                },
              ]}
            />

            <ProductPricing slug="parcelproof" />

            <div className="space-y-4">
              <h2 className="text-base font-semibold text-foreground">
                Rule and carrier deep dives
              </h2>

              {/* Featured Comprehensive Pillar Article */}
              <div className="rounded-xl border border-primary/25 bg-primary/[0.03] p-4.5 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
                      AUTHORITATIVE ESSAY &amp; FREIGHT AUDIT BLUEPRINT
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    ParcelProof: Stop Bleeding 28% on Carrier Invoices with Deterministic Audit
                  </h3>
                  <p className="text-xs text-muted max-w-xl">
                    How carrier DIM divisors, late-delivery refund windows (UPS ≈30d, FedEx ≈21d), and accessorial surcharge triggers quietly drain margin—and how automated deterministic reconciliation recovers the loss.
                  </p>
                </div>
                <a
                  href="https://giniloh.com/parcelproof-stop-bleeding-28-on-carrier-invoices/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 shrink-0 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-card hover:opacity-90 transition-opacity shadow-xs"
                >
                  <span>Read Full Article</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {parcelauditPresets.map((preset) => (
                  <li key={preset.slug}>
                    <Link
                      className="block rounded border border-border bg-card p-3 text-sm text-muted transition-colors hover:text-foreground"
                      href={`/parcelproof/calc/${preset.slug}`}
                    >
                      <span className="block font-medium text-foreground">{preset.heading}</span>
                      <span className="mt-1 block text-xs text-subtle">{preset.description}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-subtle">
                Agent surface: <code className="font-mono">audit_carrier_invoice</code> and{" "}
                <code className="font-mono">compute_billable_weight</code> are registered as WebMCP tools and
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
