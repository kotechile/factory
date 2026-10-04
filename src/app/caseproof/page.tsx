import type { Metadata } from "next";
import Link from "next/link";
import CaseProofCalculator from "@/components/caseproof-calculator";
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
import { caseproofPresets } from "@/lib/seo/caseproof/presets";

export const metadata: Metadata = {
  title: "CaseProof — Buyer-Side Audit of a Warehouse Automation Business Case",
  description:
    "Re-runs a vendor's own quoted warehouse-automation numbers against the buyer's case: labour at the fully loaded rate, the lines a quote omits, §179 and bonus depreciation by tax year, 2–3 competing bids on one cash model, and the break-even of every assumption to confirm before signature. An unstated line blocks a pass — never defaulted.",
};

/**
 * Every advertised number reads the pricing catalog (src/products/pricing.ts) — the same catalog the
 * checkout and the agent API charge from. A literal here would advertise a rate nobody is charged.
 */
const AGENT_FROM_USD = lowestAgentRate("caseproof");

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      {/* Top Horizon Stripe (industrial domain) */}
      <HorizonStripe domain="industrial" />

      <ProductHeader
        initials="CP"
        name="CaseProof"
        badge="Buyer-Side Audit"
        tagline="Warehouse Automation Business Case"
        billingLabel="Billing &amp; Pricing"
        priceChip={`($${SUITE_PRO_MONTHLY_USD}/mo · from $${AGENT_FROM_USD.toFixed(2)}/call)`}
        assurance="Unstated ≠ defaulted"
      />

      <div className="relative flex-1">
        <AmbientGrid />

        <main className="mx-auto w-full max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
          <EditorialHero
            pill={<DeterminismPill primary="BROWSER-LOCAL DETERMINISTIC" secondary="$179 → BONUS → STRAIGHT-LINE BY TAX YEAR" />}
            title="Re-run the vendor's own numbers before you sign"
            description={
              <>
                A business case rests on a blended wage, ideal utilisation and the lines the quote does
                not carry. Paste the quote&apos;s own line items and your numbers, and CaseProof re-runs
                the proposal through the same engine as your case — then says which assumptions have to
                be confirmed <strong className="text-foreground">in writing before signature</strong>.
              </>
            }
            artwork={
              <PrismSchematic
                kicker="After-tax case audit"
                inputLabel="Quote + your case"
                inputDetail="vendor lines, buyer basis"
                transformLabel="Loaded-rate engine"
                nodes={[
                  { label: "Loaded labour rate", value: "by component", color: "#0F766E" },
                  { label: "Omitted lines", value: "unstated", color: "#0891B2" },
                  { label: "§179 → bonus", value: "by tax year", color: "#4F46E5" },
                  { label: "Payback · IRR · NPV", value: "per bid", color: "#7C3AED" },
                ]}
                netLabel="Unstated cost line"
                netValue="blocks a pass"
                footnote="Labour is priced at the fully loaded rate — wage, employer payroll burden, benefits, the FLSA overtime premium and staff attrition cost. §179 with its phase-out, then bonus depreciation, are applied by tax year from a cited rule table. A cost line the case does not state is reported unstated and blocks the verdict — never defaulted, never estimated."
              />
            }
          />

          <CaseProofCalculator initialScenario="vendor_case" />

          <div className="mx-auto w-full max-w-4xl space-y-10">
            <AgentSurfaceGuide
              productSlug="caseproof"
              blurb="How agents, LLMs and procurement bots run the buyer-side audit on one cash model."
              tabs={[
                {
                  key: "browser",
                  label: "In-Browser WebMCP",
                  icon: null,
                  fileTitle: "agent-case-call.ts",
                  meta: "W3C navigator.modelContext",
                  code: `// 1. In any browser with WebMCP support (auto-registered on page load):
// All three tools are mounted on navigator.modelContext
const audit = await navigator.modelContext.executeTool("audit_automation_case", {
  case: JSON.stringify(myCase)   // { baseline, finance, options: [ ...bids ] }
});

console.log("Payback (months):", audit.paybackMonths);
console.log("NPV at hurdle:", audit.npvUsd, "IRR:", audit.irrPct);
console.log("Confirm in writing:", audit.confirmInWriting); // ranked, riskiest first`,
                },
                {
                  key: "curl",
                  label: "HTTP / cURL API",
                  icon: null,
                  fileTitle: "agent-case-request.sh",
                  meta: "POST /api/agent/calculate",
                  code: `# 2. Direct HTTP / Metered Agent API call
curl -X POST https://apps.giniloh.com/api/agent/calculate \\
  -H "Content-Type: application/json" \\
  -H "x-webmcp-tool: audit_automation_case" \\
  -H "x-customer-id: cus_OptionalStripeCustomerId" \\
  -d '{
    "case": "{\\"baseline\\":{\\"ordersPerDay\\":9000,\\"operatingDaysPerYear\\":250,\\"shifts\\":2,\\"hourlyWage\\":21.5},\\"finance\\":{\\"horizonYears\\":5,\\"hurdleRatePct\\":12,\\"inServiceTaxYear\\":2026},\\"options\\":[{\\"id\\":\\"vendor-a\\",\\"model\\":\\"capex\\"}]}"
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
                  name: "case",
                  requirement: "Required",
                  description: (
                    <>
                      The case as a JSON string:{" "}
                      <span className="font-mono text-subtle">
                        {"{ baseline, finance, options: [{ id, vendor, model: capex|lease|raas, … }] }"}
                      </span>
                      . Money is integer cents; percentages are percentage points.
                    </>
                  ),
                },
                {
                  name: "options[].quoteCsv",
                  requirement: "Optional",
                  description: (
                    <>
                      The vendor&apos;s quote line items as CSV (
                      <span className="font-mono text-subtle">item,amount_usd,category,note</span>) so the
                      audit prices the lines the quote actually names instead of assuming them.
                    </>
                  ),
                },
                {
                  name: "baseline.overtimeHoursPerWeek",
                  requirement: "Optional",
                  description: (
                    <>
                      Drives the FLSA overtime premium inside the loaded labour rate
                      (hours × wage × 0.5 ÷ paid hours per year).
                    </>
                  ),
                },
                {
                  name: "finance.hurdleRatePct",
                  requirement: "Optional",
                  description: <>The discount rate NPV and the bid ranking are computed at.</>,
                },
                {
                  name: "finance.section179ElectionCents",
                  requirement: "Optional",
                  description: (
                    <>
                      §179 election, applied with its phase-out before bonus depreciation and the
                      straight-line tail — by tax year.
                    </>
                  ),
                },
              ]}
            />

            <ProductPricing slug="caseproof" />

            <div className="space-y-4">
              <h2 className="text-base font-semibold text-foreground">
                Rule and clause deep dives
              </h2>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {caseproofPresets.map((preset) => (
                  <li key={preset.slug}>
                    <Link
                      className="block rounded border border-border bg-card p-3 text-sm text-muted transition-colors hover:text-foreground"
                      href={`/caseproof/calc/${preset.slug}`}
                    >
                      <span className="block font-medium text-foreground">{preset.heading}</span>
                      <span className="mt-1 block text-xs text-subtle">{preset.description}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-subtle">
                Agent surface: <code className="font-mono">audit_automation_case</code>,{" "}
                <code className="font-mono">compare_automation_bids</code> and{" "}
                <code className="font-mono">after_tax_payback</code> are registered as WebMCP tools and
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
