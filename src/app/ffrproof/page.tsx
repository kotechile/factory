import type { Metadata } from "next";
import Link from "next/link";
import { canonicalMetadata } from "@/lib/seo/canonical";
import { siteOrigin } from "@/lib/site-origin";
import FFRProofAudit from "@/components/ffrproof-audit";
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
  ...canonicalMetadata("/ffrproof"),
  title: "FFRProof — SF-425 Federal Financial Report Pre-Flight Audit",
  description:
    "Cross-foot the SF-425's four published line identities, reconcile line 10a to the federal payment system's drawdown statement to the cent, test the recipient match and the final-report zero rules, check the budget variance against the award's own prior-approval threshold, and catch period-vs-cumulative and double-counted dollars — every finding with its form line and source page. No number in the report comes from a model.",
};

const AGENT_FROM_USD = lowestAgentRate("ffrproof");

const STAGES = [
  {
    name: "Four line identities",
    detail:
      "10c = 10a − 10b, 10g = 10e + 10f, 10h = 10d − 10g, 10k = 10i − 10j — each cross-footed with zero tolerance. A break returns both sides of the equation and the difference, never a bare \"invalid\".",
  },
  {
    name: "Cash reconciliation",
    detail:
      "Line 10a/10b against the payment system's per-subaccount receipts and disbursements, drift reported by subaccount and to the cent — the named FFR error of not reconciling the drawdowns to the report.",
  },
  {
    name: "Match & final rules",
    detail:
      "Required recipient share (10i) vs provided (10j) vs remaining (10k). A final report with 10k > 0 is a hard finding, and 10f/10h must be zero on a final.",
  },
  {
    name: "Budget & period",
    detail:
      "Actual vs approved per cost category against the prior-approval threshold the award's own terms state (unstated when they do not), plus the period-vs-cumulative double-count check.",
  },
];

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <HorizonStripe domain="compliance" />

      <ProductHeader
        slug="ffrproof"
        initials="FF"
        name="FFRProof"
        badge="GRANTS"
        tagline="Federal financial report pre-flight"
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
                secondary="DECLARED FIELDS ONLY · FOUR IDENTITIES"
              />
            }
            title="Catch the SF-425 error before it blocks your drawdowns"
            description={
              <>
                Every number on the Federal Financial Report is derived from three sources maintained
                by different people — the general ledger, the payment system&apos;s drawdown history
                and the award terms — and the form has to cross-foot. FFRProof re-derives the four
                line identities, reconciles 10a to the drawdown record, tests the match, checks the
                budget variance against the award&apos;s own prior-approval threshold, and catches the
                period-vs-cumulative and double-counted dollars — each finding with its{" "}
                <strong className="text-foreground">form line and source page</strong>. A field the
                award terms do not state blocks the check that depends on it — never a guess.
              </>
            }
            actions={
              <HeroActions
                primaryHref="#audit"
                primaryLabel="Run the free pre-flight"
                secondaryHref="/billing"
                secondaryLabel="See pricing"
              />
            }
            artwork={
              <PrismSchematic
                kicker="Pre-flight re-derivation"
                inputLabel="SF-425 worksheet"
                inputDetail="lines 10a–10k · GL export · budget"
                transformLabel="Award terms · drawdown record"
                nodes={[
                  { label: "10c = 10a − 10b", value: "cross-foot", color: "#E11D48" },
                  { label: "10a ↔ drawdown", value: "$0.04 drift", color: "#0891B2" },
                  { label: "Match 10i − 10j", value: "10k short $5,000", color: "#0F766E" },
                  { label: "Prior approval", value: "award's own %", color: "#4F46E5" },
                  { label: "Period vs total", value: "double count", color: "#9F1239" },
                ]}
                netLabel="Pre-flight verdict"
                netValue="finding set, form line + source page"
                footnote="The schematic's figures are the worked sample; the report computes yours from the worksheet, drawdown statement, award terms and GL export you supply. Nothing is filed or certified on the recipient's behalf."
              />
            }
          />

          <div id="audit" className="scroll-mt-20">
            <FFRProofAudit />
          </div>

          <div className="mx-auto w-full max-w-4xl space-y-10">
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">
                Five checks, one deterministic chain
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
                The award terms are parsed per filing, never stored as a shared rule table: the form&apos;s
                arithmetic is fixed and published, but every agency-specific field, threshold and match
                percentage is read from your award&apos;s own terms. An award term the reader cannot
                resolve returns <span className="font-mono">unstated</span> and blocks that finding
                rather than defaulting — a stale Uniform Guidance can never produce a wrong number, at
                worst &quot;the award terms do not state this&quot;.
              </p>
            </section>

            <AgentSurfaceGuide
              productSlug="ffrproof"
              blurb="How an agent invokes the federal financial report pre-flight. The extraction layer reads declared fields; the audit itself is this deterministic engine."
              tabs={[
                {
                  key: "browser",
                  label: "In-Browser WebMCP",
                  icon: null,
                  fileTitle: "agent-ffr-audit.ts",
                  meta: "W3C navigator.modelContext",
                  code: `// 1. In any browser with WebMCP support (auto-registered on page load):
const audit = await navigator.modelContext.executeTool("audit_federal_financial_report", {
  declared: compositeDeclaredJsonOrText
});

console.log("Verdict:", audit.report.verdict);
console.log("Findings:", audit.report.findings.length);
console.log("Cross-foot:", audit.report.crossFoot.lines);`,
                },
                {
                  key: "curl",
                  label: "HTTP / cURL API",
                  icon: null,
                  fileTitle: "agent-ffr-audit.sh",
                  meta: "POST /api/agent/calculate",
                  code: `# 2. Direct HTTP / Metered Agent API call
curl -X POST ${siteOrigin()}/api/agent/calculate \\\\
  -H "Content-Type: application/json" \\\\
  -H "x-webmcp-tool: audit_federal_financial_report" \\\\
  -H "x-customer-id: cus_OptionalStripeCustomerId" \\\\
  -d '{"declared":"{...composite...}"}'`,
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
                  name: "declared",
                  requirement: "Required",
                  description: (
                    <>
                      The full composite as declared fields:{" "}
                      <span className="font-mono text-subtle">
                        report + awardTerms + drawdown + glCsv + budgetCsv
                      </span>{" "}
                      (money in integer cents, percentages in basis points). The GL export is parsed
                      deterministically from CSV, never by a model.
                    </>
                  ),
                },
              ]}
            />

            <ProductPricing slug="ffrproof" />

            <p className="text-xs text-subtle">
              Agent surface: <code className="font-mono">audit_federal_financial_report</code> is
              registered as a WebMCP tool and advertised in{" "}
              <Link className="underline" href="/.well-known/mcp.json">
                /.well-known/mcp.json
              </Link>{" "}
              at ${AGENT_FROM_USD.toFixed(2)} per successful call. The extraction layer it needs must be
              configured in the deploy environment first — until then the tool answers with an explicit
              unconfigured error naming the missing variable, never an estimated worksheet.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
