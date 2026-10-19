import type { Metadata } from "next";
import Link from "next/link";
import { canonicalMetadata } from "@/lib/seo/canonical";
import { siteOrigin } from "@/lib/site-origin";
import RatchetProofAudit from "@/components/ratchetproof-audit";
import { AgentSurfaceGuide } from "@/components/editorial/agent-surface-guide";
import { PrismSchematic } from "@/components/editorial/prism-schematic";
import ProductPricing from "@/components/product-pricing";
import {
  AmbientGrid,
  DeterminismPill,
  EditorialHero,
  HeroActions,
  HorizonStripe,
  ProductHeader,
} from "@/components/editorial/signature";
import { SUITE_PRO_MONTHLY_USD, lowestAgentRate } from "@/products/pricing";
import { DEMAND_TOLERANCE_MILLI_KW } from "@/lib/calc/ratchetproof";

export const metadata: Metadata = {
  ...canonicalMetadata("/ratchetproof"),
  title: "RatchetProof — Billed-Demand & Ratchet Audit for Commercial Electric Accounts",
  description:
    "Reconstruct the billed demand a commercial electric bill charges from your own interval data and the filed tariff: the coincident site peak across meters, the days and hours the tariff bills, the ratchet percentage over its lookback window, and the contract minimum. Price the carry-over of the interval that set the floor, and see where the bill disagrees with the tariff. Every figure is computed locally; an unreadable clause blocks the month instead of being defaulted.",
};

/**
 * Every advertised number reads the pricing catalog (src/products/pricing.ts) — the same catalog the
 * checkout and the agent API charge from. A literal here would advertise a rate nobody is charged.
 */
const AGENT_FROM_USD = lowestAgentRate("ratchetproof");
const TOLERANCE_KW = (DEMAND_TOLERANCE_MILLI_KW / 1000).toFixed(0);

/** The four stages every figure passes through, stated because they are the product's whole claim. */
const STAGES = [
  {
    name: "Coincident peak",
    detail:
      "Every meter aligned onto one grid and summed per interval. Two meters peaking at different times never add up to a site peak that did not happen — and Σ intervals read must equal Σ intervals declared, or the file is refused.",
  },
  {
    name: "Billed window",
    detail:
      "Only the days and hours the tariff bills are searched. A Saturday spike that would set a record sets nothing on Monday–Friday 08:00–20:00.",
  },
  {
    name: "The ratchet",
    detail:
      "billed = max(month peak, ratchet % × the highest peak in the lookback, contract minimum). The lookback is an explicit ordered history, so a missing month blocks the verdict instead of shortening the window.",
  },
  {
    name: "Carry-over",
    detail:
      "(billed − metered) × the month's demand rate, summed across the months the floor bound — plus what shaving the single interval that set the floor would have saved.",
  },
];

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      {/* Top Horizon Stripe (energy domain) */}
      <HorizonStripe domain="energy" />

      <ProductHeader
        slug="ratchetproof"
        initials="RP"
        name="RatchetProof"
        badge="ENERGY"
        tagline="Billed-demand &amp; ratchet audit"
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
                secondary="TARIFF CLAUSES · DECLARED FIELDS ONLY"
              />
            }
            title="Find the floor your electric bill charges you for"
            description={
              <>
                A commercial demand charge is not your meter&apos;s peak. It is the greater of this
                month&apos;s peak, a percentage of the highest peak in the trailing months, and a
                contract minimum — and one hot afternoon sets that floor for a year. RatchetProof
                rebuilds the number from your interval data and the filed tariff, then prices the
                carry-over. A clause it cannot read blocks the month;{" "}
                <strong className="text-foreground">nothing is defaulted to 0%</strong>.
              </>
            }
            actions={
              <HeroActions
                primaryHref="#audit"
                primaryLabel="Run the free audit"
                secondaryHref="/billing"
                secondaryLabel="See pricing"
              />
            }
            artwork={
              <PrismSchematic
                kicker="Billed demand reconstruction"
                inputLabel="Interval export"
                inputDetail="2 meters · 30-minute"
                transformLabel="Tariff demand clause"
                nodes={[
                  { label: "Coincident peak", value: "1,000.0 kW", color: "#65A30D" },
                  { label: "Billed window", value: "Mon–Fri 08–20", color: "#0D9488" },
                  { label: "75% ratchet", value: "750.0 kW", color: "#0284C7" },
                  { label: "Contract minimum", value: "400.0 kW", color: "#4338CA" },
                  { label: "Carry-over", value: "$4,500.00", color: "#0F766E" },
                ]}
                netLabel="Billed demand floor"
                netValue="750 kW × 3 months"
                footnote="Billed = max(month peak, ratchet % × the highest peak in the lookback, contract minimum). The schematic's figures are the worked example; the report computes yours from the files you supply."
              />
            }
          />

          <div id="audit" className="scroll-mt-20">
            <RatchetProofAudit initialScenario="ratchet-75" />
          </div>

          <div className="mx-auto w-full max-w-4xl space-y-10">
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">
                Four stages, one deterministic chain
              </h2>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {STAGES.map((stage) => (
                  <li
                    key={stage.name}
                    className="rounded-xl border border-border/80 bg-card p-3 shadow-2xs"
                  >
                    <span className="block text-sm font-semibold text-foreground">{stage.name}</span>
                    <span className="mt-1 block text-xs text-muted">{stage.detail}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-subtle">
                Printed demand is rounded on the bill: a difference of {TOLERANCE_KW} kW or less is
                reported as printing noise, and anything larger is an unmatched variance against the
                tariff. The audit never re-prices the rate — it reads the rate the bill prints (or the
                one the tariff declares for the month&apos;s voltage class).
              </p>
            </section>

            <AgentSurfaceGuide
              productSlug="ratchetproof"
              blurb="How an energy agent invokes the billed-demand audit. The extraction layer reads declared fields; the audit itself is this deterministic engine."
              tabs={[
                {
                  key: "browser",
                  label: "In-Browser WebMCP",
                  icon: null,
                  fileTitle: "agent-demand-audit.ts",
                  meta: "W3C navigator.modelContext",
                  code: `// 1. In any browser with WebMCP support (auto-registered on page load):
const audit = await navigator.modelContext.executeTool("audit_demand_billing", {
  interval: intervalExportText,   // meter_id,interval_start_utc,kw (CSV or Green Button XML)
  tariff: tariffDeclaration,      // the declared clause set (JSON) or the tariff's document text
  bills: billsCsv,                // month,period_start,period_end,printed_billed_demand_kw,...
  seed_history: [                 // prior months' peaks, most recent first (the standing ratchet history)
    { month: "2025-12", peak_kw: 950 },
    { month: "2025-11", peak_kw: 850 },
    { month: "2025-10", peak_kw: 900 }
  ]
});

console.log("Verdict:", audit.report.verdict);          // "complete" | "blocked"
console.log("Carry-over:", audit.report.carryOverMicroUsd / 1e6);
console.log("Blocked months:", audit.report.months.filter(m => m.blocked).map(m => m.month));`,
                },
                {
                  key: "curl",
                  label: "HTTP / cURL API",
                  icon: null,
                  fileTitle: "agent-demand-audit.sh",
                  meta: "POST /api/agent/calculate",
                  code: `# 2. Direct HTTP / Metered Agent API call
curl -X POST ${siteOrigin()}/api/agent/calculate \\
  -H "Content-Type: application/json" \\
  -H "x-webmcp-tool: audit_demand_billing" \\
  -H "x-customer-id: cus_OptionalStripeCustomerId" \\
  -d '{
    "interval": "meter_id,interval_start_utc,kw\\nMain-100A,2026-01-01T00:00:00Z,260",
    "tariff": "{\\"ratchetPercent\\":{\\"value\\":75,\\"provenance\\":\\"extracted\\"}}",
    "bills": "month,period_start,period_end,printed_billed_demand_kw\\n2026-01,2026-01-01,2026-01-31,1000"
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
        "${siteOrigin()}/.well-known/mcp.json"
      ]
    }
  }
}`,
                },
              ]}
              params={[
                {
                  name: "interval",
                  requirement: "Required",
                  description: (
                    <>
                      The meter export as CSV (
                      <span className="font-mono text-subtle">meter_id,interval_start_utc,kw</span>
                      ), a wide export, or Green Button XML. Mixed 15/30-minute granularity and any
                      gap are refused, never interpolated.
                    </>
                  ),
                },
                {
                  name: "tariff",
                  requirement: "Required",
                  description: (
                    <>
                      The declared tariff clause set as JSON, or the tariff&apos;s document text for the
                      extraction path. Every field carries{" "}
                      <span className="font-mono text-subtle">value + provenance</span>; a clause that
                      is not <span className="font-mono text-subtle">extracted</span> blocks the month.
                    </>
                  ),
                },
                {
                  name: "bills",
                  requirement: "Required",
                  description: (
                    <>
                      The bills as CSV (
                      <span className="font-mono text-subtle">
                        month,period_start,period_end,printed_billed_demand_kw,printed_demand_rate_usd_per_kw
                      </span>
                      ) or the bill document text. The printed figure is the evidence — it is never
                      derived from the tariff.
                    </>
                  ),
                },
                {
                  name: "seed_history",
                  requirement: "Optional",
                  description: (
                    <>
                      Prior months&apos; peaks as{" "}
                      <span className="font-mono text-subtle">[{"{"} month, peak_kw {"}"}]</span>,
                      most recent first, ending at the month before the interval data begins. A short
                      or gapped history blocks the month it cannot price.
                    </>
                  ),
                },
              ]}
            />

            <ProductPricing slug="ratchetproof" />

            <p className="text-xs text-subtle">
              Agent surface: <code className="font-mono">audit_demand_billing</code> is registered as a
              WebMCP tool and advertised in{" "}
              <Link className="underline" href="/.well-known/mcp.json">
                /.well-known/mcp.json
              </Link>{" "}
              at ${AGENT_FROM_USD.toFixed(2)} per successful call. The extraction layer it needs must be
              configured in the deploy environment first — until then the tool answers with an explicit
              unconfigured error naming the missing variable, never an estimated tariff.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
