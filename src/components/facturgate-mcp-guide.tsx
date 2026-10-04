"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { agentRateForTool, agentRatesForProduct } from "@/products/pricing";
import {
  Bot,
  Check,
  Code2,
  Copy,
  CreditCard,
  ExternalLink,
  ShieldCheck,
  Terminal,
} from "lucide-react";

export default function FacturGateMcpGuide() {
  const [activeTab, setActiveTab] = React.useState<"browser" | "curl" | "config">("browser");
  const [copied, setCopied] = React.useState(false);

  const snippets = {
    browser: `// 1. In any browser with WebMCP support (auto-registered on page load):
// The FacturGate tools are mounted on navigator.modelContext:
//   • validate_einvoice ($${agentRateForTool("validate_einvoice").toFixed(2)}/call)
//   • convert_invoice_to_facturx ($${agentRateForTool("convert_invoice_to_facturx").toFixed(2)}/call)
//   • check_eu_vat_id ($${agentRateForTool("check_eu_vat_id").toFixed(2)}/call)

const report = await navigator.modelContext.executeTool("validate_einvoice", {
  invoice: JSON.stringify({
    invoice: { number: "INV-2026-001", issueDate: "2026-10-01", currency: "EUR" },
    seller: {
      name: "Acme SAS",
      vatId: "FR83404833048",
      country: "FR",
      postalCode: "75001",
      city: "Paris",
      street: "10 Rue de la Paix"
    },
    buyer: {
      name: "Client GmbH",
      vatId: "DE123456789",
      country: "DE",
      postalCode: "10115",
      city: "Berlin",
      street: "Musterstr. 1"
    },
    lines: [
      { description: "Consulting", quantity: 1, unitPrice: 1000, vatRate: 20, vatCategory: "S" }
    ]
  }),
  target_country: "FR",
  target_format: "facturx"
});

console.log("Readiness Score:", report.score); // 100 (score)
console.log("Verdict:", report.verdict); // "ready"
console.log("Reconciliation Delta:", report.reconciliation?.delta); // 0.00
console.log("Emitted XML Length:", report.emitted?.xml.length);`,

    curl: `# 2. Direct HTTP / Metered Agent API call
# Validate an invoice against EN 16931 + CIUS-FR ($${agentRateForTool("validate_einvoice").toFixed(2)} / call):
curl -X POST https://apps.giniloh.com/api/agent/calculate \\
  -H "Content-Type: application/json" \\
  -H "x-webmcp-tool: validate_einvoice" \\
  -H "x-customer-id: cus_OptionalStripeCustomerId" \\
  -d '{
    "target_country": "FR",
    "target_format": "facturx",
    "invoice": "{\\"invoice\\":{\\"number\\":\\"INV-2026-001\\",\\"issueDate\\":\\"2026-10-01\\",\\"currency\\":\\"EUR\\"},\\"seller\\":{\\"name\\":\\"Acme SAS\\",\\"vatId\\":\\"FR83404833048\\",\\"country\\":\\"FR\\",\\"postalCode\\":\\"75001\\",\\"city\\":\\"Paris\\",\\"street\\":\\"10 Rue de la Paix\\"},\\"buyer\\":{\\"name\\":\\"Client GmbH\\",\\"vatId\\":\\"DE123456789\\",\\"country\\":\\"DE\\",\\"postalCode\\":\\"10115\\",\\"city\\":\\"Berlin\\",\\"street\\":\\"Musterstr. 1\\"},\\"lines\\":[{\\"description\\":\\"Consulting\\",\\"quantity\\":1,\\"unitPrice\\":1000,\\"vatRate\\":20,\\"vatCategory\\":\\"S\\"}]}"
  }'

# Or check an EU VAT identifier format and checksum ($${agentRateForTool("check_eu_vat_id").toFixed(2)} / call):
curl -X POST https://apps.giniloh.com/api/agent/calculate \\
  -H "Content-Type: application/json" \\
  -H "x-webmcp-tool: check_eu_vat_id" \\
  -H "x-customer-id: cus_OptionalStripeCustomerId" \\
  -d '{
    "vat_id": "FR83404833048",
    "country": "FR"
  }'`,

    config: `// 3. Desktop Agent Configuration (Cursor, Claude Desktop, Windsurf, Cline)
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
  };

  const fileTitles = {
    browser: "agent-validate-call.ts",
    curl: "agent-validate-request.sh",
    config: "claude_desktop_config.json",
  };

  // The advertised rate band and the per-tool footer line are read from the pricing catalog — the
  // same catalog the agent API charges from — so a displayed rate cannot drift from a charged one.
  const rateEntries = Object.entries(agentRatesForProduct("facturgate")).sort((a, b) => a[1] - b[1]);
  const lowestRate = rateEntries[0][1];
  const highestRate = rateEntries[rateEntries.length - 1][1];

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="rounded-2xl border-0 bg-card ring-1 ring-[#0F172A]/[0.06] shadow-[0_12px_32px_-8px_rgba(15,23,42,0.06)] overflow-hidden">
      <CardHeader className="border-b border-border/70 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                Agent Surface &amp; WebMCP Integration
              </CardTitle>
              <CardDescription className="text-xs">
                How autonomous agents, LLMs, and accounting ERP bots invoke FacturGate&apos;s deterministic pre-send gate.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              validate_einvoice
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#10B981]/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-[#047857]">
              METERED ${lowestRate.toFixed(2)} – ${highestRate.toFixed(2)} / CALL
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-5">
        {/* Apple-style Segmented Tab Control */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl bg-[#F1F5F9] p-1 shadow-inner border border-black/[0.04]">
            <button
              type="button"
              onClick={() => setActiveTab("browser")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm cursor-pointer transition-all ${
                activeTab === "browser"
                  ? "bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] font-semibold"
                  : "text-[#334155] hover:text-[#0F172A] font-medium"
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>In-Browser WebMCP</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("curl")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm cursor-pointer transition-all ${
                activeTab === "curl"
                  ? "bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] font-semibold"
                  : "text-[#334155] hover:text-[#0F172A] font-medium"
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>HTTP / cURL API</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("config")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm cursor-pointer transition-all ${
                activeTab === "config"
                  ? "bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] font-semibold"
                  : "text-[#334155] hover:text-[#0F172A] font-medium"
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              <span>MCP Client Config</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-black/[0.03] transition-colors cursor-pointer shadow-2xs"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#10B981]" />
                <span className="text-[#047857] font-semibold">Copied snippet!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-muted" />
                <span>Copy snippet</span>
              </>
            )}
          </button>
        </div>

        {/* IDE Terminal Box with Gutter & Snippet */}
        <div className="overflow-hidden rounded-xl border border-border/80 bg-[#F8FAFC] shadow-inner ring-1 ring-[#0F172A]/[0.05]">
          <div className="flex items-center justify-between border-b border-border/70 bg-card/90 px-3.5 py-2 text-xs backdrop-blur-xs font-mono">
            <div className="flex items-center gap-2 text-muted text-[11px]">
              <span className="flex items-center gap-1.5" aria-hidden="true">
                <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
                <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                <span className="h-2 w-2 rounded-full bg-[#10B981]" />
              </span>
              <span className="text-border">|</span>
              <span className="font-semibold text-foreground">{fileTitles[activeTab]}</span>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 rounded bg-black/[0.04] px-1.5 py-0.5 text-[10px] text-muted">
              {activeTab === "browser"
                ? "W3C navigator.modelContext"
                : activeTab === "curl"
                ? "POST /api/agent/calculate"
                : "Standard MCP Server JSON"}
            </span>
          </div>

          <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-foreground bg-[#F8FAFC]">
            <code>{snippets[activeTab]}</code>
          </pre>
        </div>

        {/* Parameters Grid */}
        <div className="space-y-2 pt-1">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted font-mono">
            JSON Schema Parameters Contract
          </h4>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <code className="font-mono text-xs font-bold text-foreground">invoice</code>
                <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-[10px] text-destructive font-semibold">
                  Required*
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                Canonical invoice model as a JSON string (<span className="font-mono text-subtle">{`{ seller, buyer, invoice, lines }`}</span>). *Supply this or <span className="font-mono text-subtle">xml</span>.
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <code className="font-mono text-xs font-bold text-foreground">xml</code>
                <span className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-muted font-semibold">
                  Optional*
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                Existing raw CII (<span className="font-mono text-subtle">CrossIndustryInvoice</span>) or UBL 2.1 XML document to validate as-is.
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <code className="font-mono text-xs font-bold text-foreground">target_country</code>
                <span className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-muted font-semibold">
                  Optional
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                National rule overlay &amp; rounding regime: <span className="font-mono text-subtle">FR</span> (CIUS-FR), <span className="font-mono text-subtle">DE</span> (XRechnung), <span className="font-mono text-subtle">BE</span> (Peppol), <span className="font-mono text-subtle">PL</span> (KSeF). Defaults to <span className="font-mono text-subtle">FR</span>.
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <code className="font-mono text-xs font-bold text-foreground">target_format</code>
                <span className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-muted font-semibold">
                  Optional
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                Destination format: <span className="font-mono text-subtle">facturx</span> (CII EN 16931), <span className="font-mono text-subtle">cii</span> (standalone CII), or <span className="font-mono text-subtle">ubl</span> (UBL 2.1). Defaults to <span className="font-mono text-subtle">facturx</span>.
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <code className="font-mono text-xs font-bold text-foreground">vat_id, country</code>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary font-semibold shrink-0">
                  VAT Check
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                For <code className="font-mono text-subtle">check_eu_vat_id</code>: VAT number and ISO country code verified against national algorithms (FR, DE, BE, PL, NL, IT).
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-[#10B981]/5 p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 font-mono text-xs font-bold text-[#047857]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Deterministic Output</span>
                </span>
                <span className="rounded bg-[#047857] px-1.5 py-0.5 font-mono text-[10px] text-[#FFFFFF] font-semibold">
                  Invariant
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                Returns readiness score (0-100), blocking &amp; advisory findings with exact rule IDs and fixes, cent-reconciled totals (<span className="font-mono text-subtle">delta == 0.00</span>), and emitted XML artifact.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Manifest & Billing Links */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4 text-xs text-muted">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/billing"
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Get Agent Key / Manage Billing (/billing)</span>
            </Link>
            <span className="text-border">|</span>
            <Link
              href="/.well-known/mcp.json"
              target="_blank"
              className="inline-flex items-center gap-1 font-mono text-muted hover:text-foreground hover:underline"
            >
              <span>/.well-known/mcp.json</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <span>Fleet tools:</span>
              <span className="font-mono text-xs text-foreground font-semibold">
                {rateEntries.map(([tool, rate]) => `${tool} ($${rate.toFixed(2)})`).join(" · ")}
              </span>
            </span>
            <span className="text-border">|</span>
            <Link
              href="/showcase"
              className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary transition-colors"
            >
              <span>Factory Showcase Directory</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
