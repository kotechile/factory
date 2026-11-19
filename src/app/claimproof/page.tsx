import type { Metadata } from "next";
import Link from "next/link";
import { canonicalMetadata } from "@/lib/seo/canonical";
import { siteOrigin } from "@/lib/site-origin";
import ClaimProofAudit from "@/components/claimproof-audit";
import { ProductLaunchVideo } from "@/components/product-launch-video";
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

export const metadata: Metadata = {
  ...canonicalMetadata("/claimproof"),
  title: "ClaimProof — Warranty-Claim Short-Payment Audit for HVAC and Refrigeration Shops",
  description:
    "Re-derive the manufacturer's published labour-payment schedule — allowed hours per repair code, the multiple-repair increment, the travel rule and the per-claim fee caps — against what the remittance actually paid, per line, with the schedule version and the page cited. A repair code outside the version-stamped schedule is reported unstated and blocks the line; no number in the report comes from a model.",
};

const AGENT_FROM_USD = lowestAgentRate("claimproof");

const STAGES = [
  {
    name: "Vendored schedule",
    detail:
      "The allowed hours per repair code, the multiple-repair increment, the 30-mile travel rule and the per-claim fee caps come from the manufacturer's own published form — version-stamped, with the page each rule came from. A rule that cannot be cited is not vendored.",
  },
  {
    name: "Multiple-repair rule",
    detail:
      "More than one repair in a call is paid at the highest-allowance line in full, plus the schedule's increment for each additional component — not the sum of each part's own full rate.",
  },
  {
    name: "Fee caps",
    detail:
      "Nitrogen, materials and reclaim fees are each capped by the schedule's own maximum. A fee over its cap is reported at the cap with the excess named, never silently dropped.",
  },
  {
    name: "Per-line variance",
    detail:
      "Every line (labour, parts, fees, travel) is compared against the remittance, classified underpaid / correctly-paid / overpaid / unverifiable, and the sum of the line variances equals the batch variance — enforced in the engine.",
  },
];

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <HorizonStripe domain="industrial" />

      <ProductHeader
        slug="claimproof"
        initials="CP"
        name="ClaimProof"
        badge="TRADES"
        tagline="Warranty-claim short-payment audit"
        billingLabel="Billing & Pricing"
        priceChip={`($${SUITE_PRO_MONTHLY_USD}/mo · from $${AGENT_FROM_USD.toFixed(2)}/call)`}
        assurance="No number from a model"
      />

      <div className="relative flex-1">
        <AmbientGrid />

        <main className="mx-auto w-full max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
          <EditorialHero
            pill={
              <DeterminismPill
                primary="BROWSER-LOCAL DETERMINISTIC"
                secondary="VENDORED SCHEDULE · DECLARED FIELDS ONLY"
              />
            }
            title="Find the warranty labour you were short-paid"
            description={
              <>
                A manufacturer pays warranty labour against its own published schedule — allowed
                hours per repair code, a multiple-repair increment, a travel rule, per-claim fee
                caps — and the remittance arrives as an amount, not a reconciliation. ClaimProof
                re-derives that schedule against what was actually paid, per line, with the rule and
                page cited. A repair code outside the version-stamped table is reported{" "}
                <strong className="text-foreground">unstated and blocks the line — never zero</strong>.
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
                kicker="Schedule re-derivation"
                inputLabel="Filed claim"
                inputDetail="repair codes · hours · fees"
                transformLabel="Vendored schedule"
                nodes={[
                  { label: "Allowed hours", value: "4.5 h + 1 h", color: "#E11D48" },
                  { label: "Multiple-repair", value: "highest + 1 h", color: "#0891B2" },
                  { label: "Travel rule", value: "30 mi one-way", color: "#0F766E" },
                  { label: "Fee caps", value: "$12 · $40 · $30", color: "#4F46E5" },
                  { label: "Labour variance", value: "-$120.00", color: "#9F1239" },
                ]}
                netLabel="Batch verdict"
                netValue="Σ line variances == batch variance"
                footnote="The schematic's figures are the worked sample; the report computes yours from the claim and remittance you supply — the schedule's real allowances come from the vendored True Manufacturing form."
              />
            }
          />

          <div id="audit" className="scroll-mt-20">
            <ClaimProofAudit />
          </div>

          <ProductLaunchVideo slug="claimproof" />

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
                The schedule publishes no fixed hourly labour rate — True reserves the right to pay no
                more than the average commercial rate in the territory — so labour is priced at the
                claim&apos;s own declared rate, and the parts line is compared as-filed (reimbursed at
                the OEM&apos;s distributor-cost basis, which the shop cannot re-derive).
              </p>
            </section>

            <AgentSurfaceGuide
              productSlug="claimproof"
              blurb="How an agent invokes the warranty-remittance audit. The extraction layer reads declared fields; the audit itself is this deterministic engine."
              tabs={[
                {
                  key: "browser",
                  label: "In-Browser WebMCP",
                  icon: null,
                  fileTitle: "agent-warranty-audit.ts",
                  meta: "W3C navigator.modelContext",
                  code: `// 1. In any browser with WebMCP support (auto-registered on page load):
const audit = await navigator.modelContext.executeTool("audit_warranty_remittance", {
  schedule: "truemfg@2022-06",
  claim: claimDeclaredJsonOrText,
  remittance: remittanceDeclaredJsonOrText
});

console.log("Verdict:", audit.report.verdict);
console.log("Blocked lines:", audit.report.blockedLineCount);
console.log("Stale schedule:", audit.report.staleSchedule);`,
                },
                {
                  key: "curl",
                  label: "HTTP / cURL API",
                  icon: null,
                  fileTitle: "agent-warranty-audit.sh",
                  meta: "POST /api/agent/calculate",
                  code: `# 2. Direct HTTP / Metered Agent API call
curl -X POST ${siteOrigin()}/api/agent/calculate \\
  -H "Content-Type: application/json" \\
  -H "x-webmcp-tool: audit_warranty_remittance" \\
  -H "x-customer-id: cus_OptionalStripeCustomerId" \\
  -d '{"schedule":"truemfg@2022-06","claim":"{...}","remittance":"{...}"}'`,
                },
                {
                  key: "config",
                  label: "MCP Client Config",
                  icon: null,
                  fileTitle: "claude_desktop_config.json",
                  meta: "Standard MCP Server JSON",
                  code: `// 3. Desktop Agent Configuration (Cursor, Claude Desktop, Windsurf, Cline)
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
                  name: "schedule",
                  requirement: "Required",
                  description: (
                    <>
                      The vendored schedule slug (e.g.{" "}
                      <span className="font-mono text-subtle">truemfg@2022-06</span>). An unknown slug
                      is an explicit 400, never a default.
                    </>
                  ),
                },
                {
                  name: "claim",
                  requirement: "Required",
                  description: (
                    <>
                      The filed claim as declared-fields JSON (money in integer cents, time in tenths
                      of an hour) or the claim document text for the extraction path. Every field
                      carries <span className="font-mono text-subtle">value + provenance</span>.
                    </>
                  ),
                },
                {
                  name: "remittance",
                  requirement: "Required",
                  description: (
                    <>
                      The payment as declared-fields JSON or the remittance document text. The paid
                      amounts are the evidence under audit — they are never derived from hours × rate.
                    </>
                  ),
                },
              ]}
            />

            <ProductPricing slug="claimproof" />

            <p className="text-xs text-subtle">
              Agent surface: <code className="font-mono">audit_warranty_remittance</code> is registered
              as a WebMCP tool and advertised in{" "}
              <Link className="underline" href="/.well-known/mcp.json">
                /.well-known/mcp.json
              </Link>{" "}
              at ${AGENT_FROM_USD.toFixed(2)} per successful call. The extraction layer it needs must be
              configured in the deploy environment first — until then the tool answers with an explicit
              unconfigured error naming the missing variable, never an estimated claim.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
