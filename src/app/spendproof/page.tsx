import type { Metadata } from "next";
import Link from "next/link";
import SpendProofCalculator from "@/components/spendproof-calculator";
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
import { DEFAULT_TOLERANCE_BPS } from "@/lib/calc/spendproof";

export const metadata: Metadata = {
  title: "SpendProof — AI Provider Invoice ↔ Tagged-Usage Reconciliation",
  description:
    "Reconcile an AI provider invoice against your own tagged-usage ledger: every line recomputed at the rate the invoice itself declares, each variance classified as rounding, a period-boundary overlap, missing or late usage, untagged spend or a mid-period rate change, and a clean close withheld whenever a bucket does not reconcile or usage carries no tag. Unreadable regions block the verdict — nothing is estimated.",
};

/**
 * Every advertised number reads the pricing catalog (src/products/pricing.ts) — the same catalog the
 * checkout and the agent API charge from. A literal here would advertise a rate nobody is charged.
 */
const AGENT_FROM_USD = lowestAgentRate("spendproof");
const TOLERANCE_PERCENT = (DEFAULT_TOLERANCE_BPS / 100).toFixed(1);

/** The five variance classes (PRD §2), stated on the page because they are the product's whole claim. */
const VARIANCE_CLASSES = [
  {
    name: "Rounding",
    ruleId: "sp-rounding-drift",
    detail:
      "A difference inside half a cent per contributing ledger row. Reported, and never a reason to withhold a close.",
  },
  {
    name: "Period-boundary overlap",
    ruleId: "sp-period-overlap",
    detail:
      "Usage timestamped just outside the billing window (clock skew, timezone edges). The rows exist — they are reported instead of being folded in or blamed on a rate.",
  },
  {
    name: "Missing or late usage",
    ruleId: "sp-missing-usage",
    detail:
      "The tagged ledger undershoots the invoice and nothing else explains the gap: a dropped export, a batch that never logged. The affected bucket is reported unmatched.",
  },
  {
    name: "Untagged spend",
    ruleId: "sp-untagged-spend",
    detail:
      "Calls made before a tag was attached. The invoice charged for usage no bucket can claim, so the close is withheld outright.",
  },
  {
    name: "Price drift",
    ruleId: "sp-price-drift",
    detail:
      "The provider changed the rate mid-period. Two declared rates mean the ledger cannot be recomputed at one rate — so no variance is published at all, because picking a rate would invent a number.",
  },
];

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      {/* Top Horizon Stripe (financial domain) */}
      <HorizonStripe domain="finance" />

      <ProductHeader
        initials="SP"
        name="SpendProof"
        badge="AI FINOPS"
        tagline="AI Provider Invoice &harr; Tagged-Usage Reconciliation"
        billingLabel="Billing &amp; Pricing"
        priceChip={`($${SUITE_PRO_MONTHLY_USD}/mo · from $${AGENT_FROM_USD.toFixed(2)}/call)`}
        assurance="No rate looked up"
      />

      <div className="relative flex-1">
        <AmbientGrid />

        <main className="mx-auto w-full max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
          <EditorialHero
            pill={
              <DeterminismPill
                primary="BROWSER-LOCAL DETERMINISTIC"
                secondary={`DECLARED RATE CARD · ${TOLERANCE_PERCENT}% TOLERANCE`}
              />
            }
            title="Close the AI bill against the usage you can actually attribute"
            description={
              <>
                The provider bills one undifferentiated line per model; the tags live in your own
                instrumentation. Paste the invoice&apos;s declared line items and your tagged-usage
                ledger: every line is recomputed at{" "}
                <strong className="text-foreground">the rate the invoice itself declares</strong>, each
                variance is classified, and a clean close is withheld whenever a bucket does not
                reconcile or usage carries no tag —{" "}
                <strong className="text-foreground">never estimated, never attributed by guess</strong>.
              </>
            }
            artwork={
              <PrismSchematic
                kicker="Invoice ↔ usage reconciliation"
                inputLabel="Provider invoice"
                inputDetail="declared lines + rate"
                transformLabel="Declared rate card"
                nodes={[
                  { label: "Rounding", value: "≤ 1¢ per row", color: "#635BFF" },
                  { label: "Period boundary", value: "rows outside window", color: "#4338CA" },
                  { label: "Missing usage", value: "ledger undershoots", color: "#0284C7" },
                  { label: "Untagged spend", value: "unattributed → hold", color: "#06B6D4" },
                  { label: "Price drift", value: "≥ 2 declared rates", color: "#047857" },
                ]}
                netLabel="Clean close"
                netValue="0 blockers · 0 unattributed"
                footnote="Expected charge = ledger quantity × the invoice's own declared unit price. The engine holds no price list: a rate the invoice does not state cannot be invented, and a period with two declared rates publishes price drift instead of a phantom variance."
              />
            }
          />

          <SpendProofCalculator initialScenario="untagged-batch" />

          <div className="mx-auto w-full max-w-4xl space-y-10">
            <AgentSurfaceGuide
              productSlug="spendproof"
              blurb="How a FinOps agent invokes the reconciliation, with the extraction layer in front of the deterministic engine."
              tabs={[
                {
                  key: "browser",
                  label: "In-Browser WebMCP",
                  icon: null,
                  fileTitle: "agent-close-call.ts",
                  meta: "W3C navigator.modelContext",
                  code: `// 1. In any browser with WebMCP support (auto-registered on page load):
const close = await navigator.modelContext.executeTool("reconcile_ai_invoice", {
  invoice: invoiceText,   // the invoice document text (PDF text layer, HTML or CSV export)
  ledger: ledgerCsv,      // bucket,service,model,sku,quantity,timestamp
  tolerance_bps: 50       // declared reconciliation tolerance (0.50% of the invoice total)
});

console.log("Close ready:", close.report.closeReady);
console.log("Blockers:", close.report.blockers);       // e.g. ["sp-untagged-spend"]
console.log("Extracted fields:", close.extraction.labels); // every field labelled`,
                },
                {
                  key: "curl",
                  label: "HTTP / cURL API",
                  icon: null,
                  fileTitle: "agent-close-request.sh",
                  meta: "POST /api/agent/calculate",
                  code: `# 2. Direct HTTP / Metered Agent API call
curl -X POST https://apps.giniloh.com/api/agent/calculate \\
  -H "Content-Type: application/json" \\
  -H "x-webmcp-tool: reconcile_ai_invoice" \\
  -H "x-customer-id: cus_OptionalStripeCustomerId" \\
  -d '{
    "invoice": "OPENAI\\nBilling period 2026-09-01 - 2026-09-30\\ngpt-4o input 1,000,000 tokens $3.00\\nTOTAL $3.00",
    "ledger": "bucket,service,model,sku,quantity,timestamp\\npayments,chat.completions,gpt-4o,gpt-4o-input,900000,2026-09-10T12:00:00Z\\n,chat.completions,gpt-4o,gpt-4o-input,100000,2026-09-15T09:00:00Z",
    "tolerance_bps": 50
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
                  name: "invoice",
                  requirement: "Required",
                  description: (
                    <>
                      The provider invoice as document text. Read into the declared field set{" "}
                      <span className="font-mono text-subtle">
                        provider, period, service, model, quantity, unit_price, amount, sku
                      </span>
                      ; every field is labelled and anything not{" "}
                      <span className="font-mono text-subtle">extracted</span> withholds the verdict.
                    </>
                  ),
                },
                {
                  name: "ledger",
                  requirement: "Required",
                  description: (
                    <>
                      Your tagged-usage ledger as CSV (
                      <span className="font-mono text-subtle">
                        bucket,service,model,sku,quantity,timestamp
                      </span>
                      ). A blank bucket is the <span className="font-mono text-subtle">unattributed</span>{" "}
                      case and blocks a clean close.
                    </>
                  ),
                },
                {
                  name: "tolerance_bps",
                  requirement: "Optional",
                  description: (
                    <>
                      Reconciliation tolerance in basis points of the invoice total. Defaults to{" "}
                      <span className="font-mono text-subtle">{DEFAULT_TOLERANCE_BPS}</span> (
                      {TOLERANCE_PERCENT}%).
                    </>
                  ),
                },
              ]}
            />

            <ProductPricing slug="spendproof" />

            <div className="space-y-4">
              <h2 className="text-base font-semibold text-foreground">
                The five variance classes — what each one means
              </h2>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {VARIANCE_CLASSES.map((entry) => (
                  <li
                    key={entry.ruleId}
                    className="rounded border border-border bg-card p-3 text-sm text-muted"
                  >
                    <span className="block font-semibold text-foreground">{entry.name}</span>
                    <code className="mt-1 block break-all font-mono text-[11px] text-subtle">
                      {entry.ruleId}
                    </code>
                    <span className="mt-1 block text-xs text-muted">{entry.detail}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-subtle">
                Agent surface: <code className="font-mono">reconcile_ai_invoice</code> is registered as
                a WebMCP tool and advertised in{" "}
                <Link className="underline" href="/.well-known/mcp.json">
                  /.well-known/mcp.json
                </Link>{" "}
                at ${AGENT_FROM_USD.toFixed(2)} per successful call. The extraction layer it needs has
                to be configured in the deploy environment first — until then the tool answers with an
                explicit unconfigured error rather than an estimated invoice.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
