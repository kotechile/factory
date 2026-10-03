"use client";

import * as React from "react";
import {
  reconcileStripePayout,
  journalToCsv,
  normalizeStripeExport,
  type StripeReconOutput,
  type StripeReconInput,
} from "@/lib/calc/stripeRecon";
import { workedExampleFixture, smallSampleFixture } from "@/lib/calc/stripeRecon.fixtures";
import { trackEvent } from "@/lib/telemetry-client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  Download,
  Loader2,
  ShieldCheck,
  Receipt,
  ArrowRightLeft,
  Sparkles,
  Upload,
  Calendar,
  Bot,
  Copy,
  Check,
  ExternalLink,
  Code2,
  Terminal,
  CreditCard,
} from "lucide-react";

function formatMoney(minor: number, currency: string): string {
  const code = (currency || "gbp").toUpperCase();
  const fractionDigits = code === "JPY" || code === "HUF" ? 0 : 2;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: code,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(minor / 100);
}

function sumLineNet(result: StripeReconOutput): number {
  return result.journalLines.reduce((s, l) => s + (l.credit - l.debit), 0);
}

function buildExportJson(input: StripeReconInput): string {
  return JSON.stringify(
    {
      payout: input.payout,
      balance_transactions: input.balanceTransactions,
    },
    null,
    2,
  );
}

function DisaggregationPrism() {
  return (
    <div className="relative">
      {/* Ambient refraction radial glow behind prism for canvas depth */}
      <div
        className="pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-r from-[#635BFF]/15 via-[#06B6D4]/12 to-[#4338CA]/15 blur-xl -z-10"
        aria-hidden="true"
      />

      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/85 p-4 ring-1 ring-[#0F172A]/[0.05] shadow-[0_12px_32px_-8px_rgba(15,23,42,0.06)] backdrop-blur-xs">
        {/* Top subtle technical bar */}
        <div className="mb-2 flex items-center justify-between border-b border-border/60 pb-2 text-[11px] font-mono text-muted">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            DIS-AGGREGATION PRISM
          </span>
          <span className="rounded bg-black/[0.04] px-1.5 py-0.5 text-[10px] text-muted">
            1 PAYOUT → 5 GL THREADS
          </span>
        </div>

        <svg
          viewBox="0 0 600 230"
          className="w-full h-auto select-none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Dis-aggregation Prism: single netted payout fanning into 5 GL journal lines"
        >
          <defs>
            <linearGradient id="prismBeam" x1="140" y1="115" x2="225" y2="115" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#635BFF" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#4338CA" stopOpacity="1" />
            </linearGradient>

            <linearGradient id="prismFacet" x1="220" y1="75" x2="270" y2="155" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#F1F5F9" stopOpacity="0.7" />
            </linearGradient>

            <linearGradient id="prismGlowGrad" x1="220" y1="75" x2="270" y2="155" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#635BFF" />
              <stop offset="50%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#4338CA" />
            </linearGradient>

            <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Incoming solid node ($ currency) */}
          <g transform="translate(10, 85)">
            <rect
              width="130"
              height="60"
              rx="8"
              fill="#FFFFFF"
              stroke="#CBD5E1"
              strokeWidth="1"
              filter="drop-shadow(0 2px 4px rgba(15,23,42,0.05))"
            />
            <rect x="0" y="0" width="130" height="3.5" rx="1.5" fill="#635BFF" />
            <text x="12" y="20" fill="#64748B" fontSize="9" fontFamily="monospace" fontWeight="600" letterSpacing="0.05em">
              NETTED PAYOUT
            </text>
            <text x="12" y="38" fill="#0F172A" fontSize="13" fontFamily="monospace" fontWeight="700">
              $4,378.21
            </text>
            <text x="12" y="50" fill="#64748B" fontSize="9" fontFamily="monospace">
              po_1NqK2t...net
            </text>
          </g>

          {/* Thick solid incoming beam */}
          <path
            d="M 140 115 L 225 115"
            stroke="url(#prismBeam)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <circle cx="180" cy="115" r="3" fill="#635BFF" />

          {/* 2. Glassmorphic Prism in center */}
          <g transform="translate(225, 75)">
            <polygon
              points="24,3 48,38 38,76 10,76 0,38"
              fill="url(#prismFacet)"
              stroke="url(#prismGlowGrad)"
              strokeWidth="1.5"
              filter="url(#softGlow)"
            />
            {/* Inner crystal refraction lines */}
            <line x1="24" y1="3" x2="24" y2="76" stroke="#635BFF" strokeWidth="0.75" strokeDasharray="2 2" opacity="0.6" />
            <line x1="0" y1="38" x2="48" y2="38" stroke="#06B6D4" strokeWidth="0.75" strokeDasharray="2 2" opacity="0.6" />
            <circle cx="24" cy="38" r="3" fill="#635BFF" />
          </g>

          {/* 3. Five Fanning Out Thread Lines */}
          {/* Charges (#10B981) */}
          <path
            d="M 273 110 C 315 105, 335 26, 380 26"
            stroke="#10B981"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          {/* Refunds (#EF4444) */}
          <path
            d="M 273 113 C 315 110, 335 70, 380 70"
            stroke="#EF4444"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          {/* Stripe Fees (#635BFF) */}
          <path
            d="M 273 115 C 315 115, 335 115, 380 115"
            stroke="#635BFF"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          {/* FX Adjustments (#F59E0B) */}
          <path
            d="M 273 117 C 315 120, 335 160, 380 160"
            stroke="#F59E0B"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          {/* GL Net (#0F172A) */}
          <path
            d="M 273 120 C 315 125, 335 204, 380 204"
            stroke="#0F172A"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />

          {/* 4. Output Node Pills with Micro-Badge Tags */}
          {/* 1. Charges (+) */}
          <g transform="translate(380, 10)">
            <rect width="210" height="32" rx="6" fill="#FFFFFF" stroke="#10B981" strokeWidth="1" strokeOpacity="0.4" />
            <rect x="7" y="8" width="16" height="16" rx="4" fill="#DCFCE7" />
            <text x="15" y="20" textAnchor="middle" fill="#047857" fontSize="11" fontWeight="700">+</text>
            <text x="28" y="20" fill="#047857" fontSize="10" fontWeight="600">Charges</text>
            <text x="198" y="20" textAnchor="end" fill="#047857" fontSize="10" fontFamily="monospace" fontWeight="700">
              +$5,120.00
            </text>
          </g>

          {/* 2. Refunds (-) */}
          <g transform="translate(380, 54)">
            <rect width="210" height="32" rx="6" fill="#FFFFFF" stroke="#EF4444" strokeWidth="1" strokeOpacity="0.4" />
            <rect x="7" y="8" width="16" height="16" rx="4" fill="#FEE2E2" />
            <text x="15" y="20" textAnchor="middle" fill="#991B1B" fontSize="11" fontWeight="700">−</text>
            <text x="28" y="20" fill="#991B1B" fontSize="10" fontWeight="600">Refunds</text>
            <text x="198" y="20" textAnchor="end" fill="#991B1B" fontSize="10" fontFamily="monospace" fontWeight="700">
              -$420.00
            </text>
          </g>

          {/* 3. Stripe Fees (-) */}
          <g transform="translate(380, 99)">
            <rect width="210" height="32" rx="6" fill="#FFFFFF" stroke="#635BFF" strokeWidth="1" strokeOpacity="0.4" />
            <rect x="7" y="8" width="16" height="16" rx="4" fill="#EEF2FF" />
            <text x="15" y="20" textAnchor="middle" fill="#4F46E5" fontSize="11" fontWeight="700">−</text>
            <text x="28" y="20" fill="#4F46E5" fontSize="10" fontWeight="600">Stripe Fees</text>
            <text x="198" y="20" textAnchor="end" fill="#4F46E5" fontSize="10" fontFamily="monospace" fontWeight="700">
              -$142.79
            </text>
          </g>

          {/* 4. FX Adjustments (-) */}
          <g transform="translate(380, 144)">
            <rect width="210" height="32" rx="6" fill="#FFFFFF" stroke="#F59E0B" strokeWidth="1" strokeOpacity="0.4" />
            <rect x="7" y="8" width="16" height="16" rx="4" fill="#FEF3C7" />
            <text x="15" y="20" textAnchor="middle" fill="#92400E" fontSize="11" fontWeight="700">−</text>
            <text x="28" y="20" fill="#92400E" fontSize="10" fontWeight="600">FX Adjustments</text>
            <text x="198" y="20" textAnchor="end" fill="#92400E" fontSize="10" fontFamily="monospace" fontWeight="700">
              -$179.00
            </text>
          </g>

          {/* 5. GL Net (=) */}
          <g transform="translate(380, 188)">
            <rect width="210" height="32" rx="6" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.2" strokeOpacity="0.4" />
            <rect x="7" y="8" width="16" height="16" rx="4" fill="#F1F5F9" />
            <text x="15" y="20" textAnchor="middle" fill="#0F172A" fontSize="11" fontWeight="700">=</text>
            <text x="28" y="20" fill="#0F172A" fontSize="10" fontWeight="600">GL Net (Balanced)</text>
            <text x="198" y="20" textAnchor="end" fill="#0F172A" fontSize="10" fontFamily="monospace" fontWeight="700">
              =$4,378.21
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}

function McpGuideSection() {
  const [activeTab, setActiveTab] = React.useState<"browser" | "curl" | "config">("browser");
  const [copied, setCopied] = React.useState(false);

  const snippets = {
    browser: `// 1. In any browser with WebMCP support (auto-registered on page load):
// The 'reconcile_stripe_payout' tool is mounted on navigator.modelContext
const response = await navigator.modelContext.executeTool("reconcile_stripe_payout", {
  account_id: "acct_1AaBbCc",
  period: "2026-08",
  export_json: JSON.stringify(stripePayoutExport)
});

console.log("Reconciliation Invariant Passed:", response.reconciled); // true
console.log("Generated GL Journal Lines:", response.journalLines);`,

    curl: `# 2. Direct HTTP / Metered Agent API call
curl -X POST https://apps.giniloh.com/api/agent/calculate \\
  -H "Content-Type: application/json" \\
  -H "x-webmcp-tool: reconcile_stripe_payout" \\
  -H "x-customer-id: cus_OptionalStripeCustomerId" \\
  -d '{
    "account_id": "acct_1AaBbCc",
    "period": "2026-08",
    "export_json": "{\\"payout\\": {\\"id\\": \\"po_1NqK2t...\\", \\"amount\\": 437821, \\"currency\\": \\"usd\\"}, \\"balance_transactions\\": [...]}"
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
    browser: "agent-browser-call.ts",
    curl: "agent-recon-request.sh",
    config: "claude_desktop_config.json",
  };

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
                How autonomous agents, LLMs, and accounting bots invoke this deterministic reconciler.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              reconcile_stripe_payout
            </span>
            <span className="rounded-full bg-[#10B981]/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-[#047857]">
              METERED $0.25
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
                  : "text-[#64748B] hover:text-[#0F172A] font-medium"
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
                  : "text-[#64748B] hover:text-[#0F172A] font-medium"
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
                  : "text-[#64748B] hover:text-[#0F172A] font-medium"
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
                <code className="font-mono text-xs font-bold text-foreground">account_id</code>
                <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-[10px] text-destructive font-semibold">
                  Required
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                Stripe account id whose payout is being reconciled (e.g. <span className="font-mono text-subtle">acct_...</span>).
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <code className="font-mono text-xs font-bold text-foreground">period</code>
                <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-[10px] text-destructive font-semibold">
                  Required
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                Reconciliation period (<span className="font-mono text-subtle">YYYY-MM</span>) or created range <span className="font-mono text-subtle">start:end</span>.
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <code className="font-mono text-xs font-bold text-foreground">export_json</code>
                <span className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-muted font-semibold">
                  Optional*
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                Pasted/uploaded Stripe export with payout and balance_transactions (*or provide key).
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <code className="font-mono text-xs font-bold text-foreground">stripe_restricted_key</code>
                <span className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-muted font-semibold">
                  Optional*
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                Customer read-only restricted key (<span className="font-mono text-subtle">rk_...</span>) scoped to payouts.
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <code className="font-mono text-xs font-bold text-foreground">payout_id</code>
                <span className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-muted font-semibold">
                  Optional
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                Specific payout id (<span className="font-mono text-subtle">po_...</span>) to reconcile within the period.
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-[#10B981]/5 p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#047857]">Deterministic Output</span>
                <span className="rounded bg-[#10B981]/20 px-1.5 py-0.5 font-mono text-[10px] text-[#047857] font-semibold">
                  Invariant
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                Returns <code className="font-mono text-subtle">journalLines</code> where <code className="font-mono text-subtle">reconciled == true</code> and net matches payout.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Manifest Links */}
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

          <div className="flex items-center gap-1.5">
            <span>Fleet catalog:</span>
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

export default function LedgerLinkCalculator() {
  const [mode, setMode] = React.useState<"json" | "key">("json");
  const [jsonText, setJsonText] = React.useState<string>("");
  const [key, setKey] = React.useState<string>("");
  const [accountId, setAccountId] = React.useState<string>("acct_1AaBbCc");
  const [period, setPeriod] = React.useState<string>("2026-08");
  const [payoutId, setPayoutId] = React.useState<string>("");
  const [busy, setBusy] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<StripeReconOutput | null>(null);

  React.useEffect(() => {
    trackEvent("page_view", undefined, "ledgerlink");
  }, []);

  const runJson = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      const input = normalizeStripeExport(parsed);
      const r = reconcileStripePayout(input.payout, input.balanceTransactions);
      setResult(r);
      setError(null);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Failed to parse export.");
    }
  };

  const handleJson = () => {
    trackEvent("reconcile_click", { source: "json" }, "ledgerlink");
    if (!jsonText.trim()) {
      setError("Paste a Stripe JSON export first (payout + balance_transactions).");
      return;
    }
    setBusy(true);
    try {
      runJson(jsonText);
    } finally {
      setBusy(false);
    }
  };

  const handleKey = async () => {
    trackEvent("reconcile_click", { source: "stripe_key" }, "ledgerlink");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webmcp-tool": "reconcile_stripe_payout",
        },
        body: JSON.stringify({
          account_id: accountId,
          period,
          payout_id: payoutId || undefined,
          stripe_restricted_key: key,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: StripeReconOutput;
        error?: string;
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json?.error || `Reconciliation failed (${res.status}).`);
      }
      setResult(json.data);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Reconciliation failed.");
    } finally {
      setBusy(false);
    }
  };

  const loadSample = (which: "worked" | "small") => {
    const fixture = which === "worked" ? workedExampleFixture() : smallSampleFixture();
    setMode("json");
    const text = buildExportJson(fixture);
    setJsonText(text);
    runJson(text);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      setJsonText(text);
      runJson(text);
    };
    reader.readAsText(file);
  };

  const handleExportCsv = () => {
    if (!result) return;
    trackEvent("export_csv_click", { lines: result.journalLines.length }, "ledgerlink");
    const csv = journalToCsv(result.journalLines);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `LedgerLink-journal-${result.payout.id}-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currency = result?.currency || "gbp";

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      {/* Top Horizon Stripe */}
      <div
        className="h-[3.5px] w-full bg-gradient-to-r from-[#635BFF] via-[#4338CA] to-[#06B6D4]"
        aria-hidden="true"
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-lg font-bold tracking-tight text-card shadow-xs">
              L
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-foreground">LedgerLink</span>
                <Badge variant="accent">Stripe → GL</Badge>
              </div>
              <p className="text-xs text-subtle">Stripe Payout → GL Reconciliation Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/billing"
              className="hidden sm:inline-flex items-center gap-1 rounded-md border border-border/70 bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-black/[0.03] transition-colors shadow-2xs"
            >
              <CreditCard className="h-3.5 w-3.5 text-primary" />
              <span>Billing</span>
            </Link>
            <Badge variant="success" className="hidden gap-1 md:inline-flex">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Σ net == payout net</span>
            </Badge>
            <Button size="sm" variant="outline" onClick={() => loadSample("worked")} className="shadow-2xs">
              <Sparkles className="h-4 w-4" />
              <span>Load Worked Example</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content with Ambient Grid Canvas */}
      <div className="relative flex-1">
        {/* Subtle Technical Grid Canvas Feathered Downward */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-72 -z-10 [background-image:radial-gradient(#CBD5E1_0.75px,transparent_0.75px)] [background-size:16px_16px] opacity-60 [mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)]"
          aria-hidden="true"
        />

        <main className="mx-auto w-full max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
          {/* Hero with Dis-aggregation Prism Artwork (Vertically Balanced) */}
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
              <div className="flex flex-col justify-center space-y-4 text-center lg:col-span-6 lg:text-left">
                {/* Crisp Dual-Segment Pill Badge */}
                <div className="inline-flex items-center gap-2 self-center lg:self-start rounded-full border border-[#E2E8F0] bg-[#F1F5F9]/90 px-3 py-1 font-mono text-xs text-[#334155] shadow-2xs backdrop-blur-xs">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                  </span>
                  <span className="font-semibold text-foreground">LOCAL-FIRST RECONCILER</span>
                  <span className="text-[#CBD5E1]">|</span>
                  <span className="text-[#64748B]">ASC 606 / IFRS 15 COMPLIANT</span>
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[38px] lg:leading-[1.18]">
                  Turn one netted Stripe payout into clean GL journal lines
                </h1>

                <p className="text-sm text-muted sm:text-base leading-relaxed max-w-xl">
                  A single payout is a bundle of charges, refunds, chargebacks, Stripe fees, Connect
                  transfers and FX adjustments. LedgerLink decomposes it into categorized journal lines
                  that <strong className="text-foreground">sum to the payout net exactly</strong> — ready
                  for Xero or QuickBooks.
                </p>
              </div>

              <div className="lg:col-span-6">
                <DisaggregationPrism />
              </div>
            </div>
          </div>

          {/* Source picker & Elevated Work Surface */}
          <div className="mx-auto max-w-4xl">
            {/* Apple-style Segmented Pill Control (with subtle unselected tab styling) */}
            <div className="mb-4 flex items-center justify-start">
              <div className="inline-flex rounded-xl bg-[#F1F5F9] p-1 shadow-inner border border-black/[0.04]">
                <button
                  type="button"
                  onClick={() => {
                    setMode("json");
                    setError(null);
                  }}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm cursor-pointer transition-all ${
                    mode === "json"
                      ? "bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] font-semibold"
                      : "text-[#64748B] hover:text-[#0F172A] font-medium"
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Paste / Upload JSON export</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("key");
                    setError(null);
                  }}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm cursor-pointer transition-all ${
                    mode === "key"
                      ? "bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] font-semibold"
                      : "text-[#64748B] hover:text-[#0F172A] font-medium"
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Connect a Stripe restricted key</span>
                </button>
              </div>
            </div>

            {/* Elevated Ghost Border Card with inner ring & deeper shadow */}
            <Card className="rounded-2xl border-0 bg-card ring-1 ring-[#0F172A]/[0.06] shadow-[0_12px_32px_-8px_rgba(15,23,42,0.06)] overflow-hidden">
              <CardHeader className="border-b border-border/70 pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  {mode === "json" ? (
                    <Upload className="h-4 w-4 text-primary" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  )}
                  <span>
                    {mode === "json"
                      ? "Stripe JSON export (payout + balance_transactions)"
                      : "Customer read-only Stripe restricted key"}
                  </span>
                </CardTitle>
                <CardDescription>
                  {mode === "json"
                    ? "Paste the payout + balance_transactions export, or upload a JSON file. The engine is deterministic and runs entirely in your browser."
                    : "LedgerLink never uses the factory Stripe account — provide your own read-only restricted key (rk_…) scoped to payouts & balance_transactions."}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                {mode === "json" ? (
                  <>
                    {/* Unified IDE / Terminal Box with Absorbed Controls & Sticky Gutter */}
                    <div className="overflow-hidden rounded-xl border border-border/80 bg-[#F8FAFC] shadow-inner ring-1 ring-[#0F172A]/[0.05]">
                      {/* Integrated Terminal Header Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-card/90 px-3.5 py-2.5 text-xs backdrop-blur-xs">
                        {/* Left: macOS dots, filename, zero egress badge */}
                        <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
                          <span className="flex items-center gap-1.5" aria-hidden="true">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
                            <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
                            <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                          </span>
                          <span className="text-border">|</span>
                          <span className="font-semibold text-foreground">stripe_payout_export.json</span>
                          <span className="hidden sm:inline-flex items-center gap-1 rounded bg-[#10B981]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#047857]">
                            <ShieldCheck className="h-3 w-3" />
                            ZERO EGRESS
                          </span>
                        </div>

                        {/* Right: Absorb Sample & Upload into header */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => loadSample("small")}
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-muted hover:bg-black/[0.04] hover:text-foreground transition-colors cursor-pointer"
                          >
                            <Sparkles className="h-3 w-3 text-primary" />
                            <span>Load sample</span>
                          </button>

                          <label className="inline-flex items-center gap-1 rounded border border-border/80 bg-card px-2 py-1 text-xs font-medium text-foreground hover:bg-black/[0.02] cursor-pointer transition-colors shadow-2xs">
                            <input
                              type="file"
                              accept="application/json,.json"
                              className="sr-only"
                              onChange={handleFileUpload}
                            />
                            <Upload className="h-3 w-3 text-muted" />
                            <span>Upload file</span>
                          </label>

                          <span className="text-[11px] font-mono text-subtle pl-1 hidden md:inline">
                            {jsonText ? `${jsonText.split("\n").length} lines` : "Awaiting JSON"}
                          </span>
                        </div>
                      </div>

                      {/* Editor Body with Gutter (Bounded max-height) */}
                      <div className="flex font-mono text-xs max-h-[300px] overflow-y-auto">
                        <div
                          className="select-none border-r border-border/60 bg-black/[0.02] px-2.5 py-3 text-right font-mono text-[11px] leading-[1.4rem] text-muted/40 sticky top-0"
                          aria-hidden="true"
                        >
                          <div>01</div>
                          <div>02</div>
                          <div>03</div>
                          <div>04</div>
                          <div>05</div>
                          <div>06</div>
                          <div>07</div>
                          <div>08</div>
                          <div>09</div>
                          <div>10</div>
                        </div>
                        <textarea
                          value={jsonText}
                          onChange={(e) => setJsonText(e.target.value)}
                          placeholder='{"payout": {"id": "po_1...", "amount": 437821, "currency": "usd"}, "balance_transactions": [...]}'
                          aria-label="Stripe JSON export"
                          className="w-full resize-none bg-transparent p-3 font-mono text-xs leading-[1.4rem] text-foreground placeholder:text-muted/50 focus:outline-hidden min-h-[160px]"
                          rows={7}
                        />
                      </div>

                      {/* Integrated Full-Width Bottom Action Bar */}
                      <button
                        type="button"
                        onClick={handleJson}
                        disabled={busy}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-[#4338CA] active:bg-[#3730A3] font-semibold text-sm text-white border-t border-primary/20 shadow-xs cursor-pointer transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowRightLeft className="h-4 w-4" />
                        )}
                        <span>Reconcile Payout Lines (Deterministic)</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Input
                      label="Stripe restricted key (rk_…)"
                      id="ledgerlink-key"
                      type="password"
                      value={key}
                      onChange={(e) => setKey(e.target.value)}
                      helperText="Read-only restricted key on the customer's own account."
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        label="Account id"
                        id="ledgerlink-account"
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        helperText="Stripe account id being reconciled."
                      />
                      <Input
                        label="Period"
                        id="ledgerlink-period"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        helperText="e.g. 2026-08 or a created range start:end."
                      />
                    </div>
                    <Input
                      label="Payout id (optional)"
                      id="ledgerlink-payout"
                      value={payoutId}
                      onChange={(e) => setPayoutId(e.target.value)}
                      helperText="Leave blank to reconcile the newest payout in the period."
                    />
                    <div>
                      <Button
                        onClick={handleKey}
                        disabled={busy}
                        className="w-full justify-center gap-2 py-3 shadow-[0_2px_8px_rgba(79,70,229,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_4px_12px_rgba(79,70,229,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 cursor-pointer font-semibold"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-4 w-4" />
                        )}
                        <span>Reconcile via Stripe Key (Metered)</span>
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {error && (
            <div className="mx-auto flex max-w-4xl items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm shadow-xs">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <strong className="font-semibold text-foreground">Could not reconcile.</strong>
                <p className="mt-0.5 text-xs text-muted">{error}</p>
              </div>
            </div>
          )}

        {result && (
          <>
            {/* Branded reconciliation report */}
            <Card className="rounded-2xl border-0 bg-card shadow-[0_0_0_1px_rgba(15,23,42,0.06),0_8px_24px_-4px_rgba(15,23,42,0.04)] overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-border/80 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-card shadow-xs">
                    L
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-foreground">Reconciliation Report</h2>
                      {result.reconciled ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Reconciled</span>
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Δ {formatMoney(result.delta, currency)}</span>
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-subtle">
                      Payout {result.payout.id} • {result.currency.toUpperCase()} •{" "}
                      <span className="font-mono tabular-nums">
                        {result.counts.charges} charges · {result.counts.refunds} refunds ·{" "}
                        {result.counts.chargebacks} chargebacks · {result.counts.fees} fees
                      </span>
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={handleExportCsv} className="gap-1.5 shadow-2xs">
                  <Download className="h-4 w-4" />
                  <span>Export CSV ({result.journalLines.length})</span>
                </Button>
              </div>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    { label: "Payout Net", value: formatMoney(result.payout.amount, currency), tone: "text-foreground", key: "net" },
                    { label: "Revenue", value: formatMoney(result.summary.revenue, currency), tone: "text-success", key: "revenue" },
                    { label: "Stripe Fees", value: formatMoney(result.summary.fees, currency), tone: "text-foreground", key: "fees" },
                    { label: "Refunds", value: formatMoney(result.summary.refunds, currency), tone: "text-destructive", key: "refunds" },
                    { label: "Chargebacks", value: formatMoney(result.summary.chargebacks, currency), tone: "text-destructive", key: "chargebacks" },
                    { label: "Clearing/Other", value: formatMoney(result.summary.clearings, currency), tone: "text-muted", key: "clearings" },
                  ].map(({ label, value, tone, key }) => (
                    <div key={key} className="rounded-xl border border-border/80 bg-background/80 p-3.5 shadow-2xs backdrop-blur-xs">
                      <p className="text-[11px] uppercase tracking-wide text-muted font-medium">{label}</p>
                      <p className={`mt-1 font-mono text-base font-bold tabular-nums ${tone}`}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div
                  className={`mt-4 flex items-start gap-2 rounded-xl border p-3.5 text-xs shadow-2xs ${
                    result.reconciled
                      ? "border-success/30 bg-success/10 text-foreground"
                      : "border-destructive/30 bg-destructive/10 text-foreground"
                  }`}
                >
                  {result.reconciled ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <div>
                    <strong className="font-semibold">Invariant check: Σ(net) == payout.amount</strong>
                    <p className="mt-0.5 text-muted">
                      Σ(net) ={" "}
                      <span className="font-mono tabular-nums font-semibold">{formatMoney(result.sumNet, currency)}</span>{" "}
                      vs payout net{" "}
                      <span className="font-mono tabular-nums font-semibold">
                        {formatMoney(result.payout.amount, currency)}
                      </span>{" "}
                      →{" "}
                      {result.reconciled ? (
                        <span className="font-semibold text-success">delta 0.00 — exact.</span>
                      ) : (
                        <span className="font-semibold text-destructive">
                          delta {formatMoney(result.delta, currency)} — does NOT reconcile.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Journal lines table */}
            <Card className="rounded-2xl border-0 bg-card shadow-[0_0_0_1px_rgba(15,23,42,0.06),0_8px_24px_-4px_rgba(15,23,42,0.04)] overflow-hidden">
              <CardHeader className="border-b border-border/70 bg-black/[0.01]">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Receipt className="h-4 w-4 text-primary" />
                  <span>Decomposed GL Journal Lines</span>
                </CardTitle>
                <CardDescription>
                  {result.journalLines.length} lines • net {formatMoney(sumLineNet(result), currency)}{" "}
                  (Xero / QuickBooks-ready).
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-[420px] overflow-auto p-0">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border/80 bg-black/[0.02] text-left text-xs uppercase tracking-wide text-muted">
                      <th className="py-2.5 pl-6 pr-3 font-semibold">Date</th>
                      <th className="py-2.5 pr-3 font-semibold">Account</th>
                      <th className="py-2.5 pr-3 text-right font-semibold">Debit</th>
                      <th className="py-2.5 pr-3 text-right font-semibold">Credit</th>
                      <th className="py-2.5 pr-6 font-semibold">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.journalLines.map((l, i) => (
                      <tr key={`${l.reference}-${i}`} className="border-b border-border/50 hover:bg-black/[0.01] transition-colors">
                        <td className="py-2.5 pl-6 pr-3 font-mono tabular-nums text-xs text-muted">{l.date}</td>
                        <td className="py-2.5 pr-3 font-medium text-foreground">{l.account}</td>
                        <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-destructive font-medium">
                          {l.debit ? formatMoney(l.debit, currency) : "—"}
                        </td>
                        <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-success font-medium">
                          {l.credit ? formatMoney(l.credit, currency) : "—"}
                        </td>
                        <td className="py-2.5 pr-6 font-mono text-xs text-muted">{l.reference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </>
        )}

        {/* Viral hook: reconciliation scorecard embedding hint */}
        {!result && (
          <Card className="rounded-2xl border-0 bg-card/80 backdrop-blur-xs shadow-[0_0_0_1px_rgba(15,23,42,0.05),0_6px_20px_-4px_rgba(15,23,42,0.03)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-primary" />
                <span>How bookkeepers use it</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted leading-relaxed">
              Paste the payout&apos;s balance_transactions export (or connect a read-only key) and
              get a month-end-ready journal in seconds — no Synder/PayTraQer setup, no spreadsheet
              panic. The engine is fully deterministic and verifiable right here.
            </CardContent>
          </Card>
        )}

        {/* MCP & Agent Surface Integration Guide */}
        <McpGuideSection />
        </main>
      </div>
    </div>
  );
}
