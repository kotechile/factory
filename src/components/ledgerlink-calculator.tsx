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
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/80 p-4 shadow-[0_0_0_1px_rgba(15,23,42,0.06),0_8px_24px_-4px_rgba(15,23,42,0.04)] backdrop-blur-xs">
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

        {/* 1. Incoming solid node */}
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
            £4,378.21
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

        {/* 4. Output Node Pills */}
        {/* 1. Charges */}
        <g transform="translate(380, 10)">
          <rect width="210" height="32" rx="6" fill="#FFFFFF" stroke="#10B981" strokeWidth="1" strokeOpacity="0.4" />
          <circle cx="12" cy="16" r="3.5" fill="#10B981" />
          <text x="24" y="20" fill="#047857" fontSize="10" fontWeight="600">Charges</text>
          <text x="198" y="20" textAnchor="end" fill="#047857" fontSize="10" fontFamily="monospace" fontWeight="700">
            +£5,120.00
          </text>
        </g>

        {/* 2. Refunds */}
        <g transform="translate(380, 54)">
          <rect width="210" height="32" rx="6" fill="#FFFFFF" stroke="#EF4444" strokeWidth="1" strokeOpacity="0.4" />
          <circle cx="12" cy="16" r="3.5" fill="#EF4444" />
          <text x="24" y="20" fill="#991B1B" fontSize="10" fontWeight="600">Refunds</text>
          <text x="198" y="20" textAnchor="end" fill="#991B1B" fontSize="10" fontFamily="monospace" fontWeight="700">
            -£420.00
          </text>
        </g>

        {/* 3. Stripe Fees */}
        <g transform="translate(380, 99)">
          <rect width="210" height="32" rx="6" fill="#FFFFFF" stroke="#635BFF" strokeWidth="1" strokeOpacity="0.4" />
          <circle cx="12" cy="16" r="3.5" fill="#635BFF" />
          <text x="24" y="20" fill="#4F46E5" fontSize="10" fontWeight="600">Stripe Fees</text>
          <text x="198" y="20" textAnchor="end" fill="#4F46E5" fontSize="10" fontFamily="monospace" fontWeight="700">
            -£142.79
          </text>
        </g>

        {/* 4. FX Adjustments */}
        <g transform="translate(380, 144)">
          <rect width="210" height="32" rx="6" fill="#FFFFFF" stroke="#F59E0B" strokeWidth="1" strokeOpacity="0.4" />
          <circle cx="12" cy="16" r="3.5" fill="#F59E0B" />
          <text x="24" y="20" fill="#92400E" fontSize="10" fontWeight="600">FX Adjustments</text>
          <text x="198" y="20" textAnchor="end" fill="#92400E" fontSize="10" fontFamily="monospace" fontWeight="700">
            -£179.00
          </text>
        </g>

        {/* 5. GL Net */}
        <g transform="translate(380, 188)">
          <rect width="210" height="32" rx="6" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.2" strokeOpacity="0.4" />
          <circle cx="12" cy="16" r="3.5" fill="#0F172A" />
          <text x="24" y="20" fill="#0F172A" fontSize="10" fontWeight="600">GL Net (Balanced)</text>
          <text x="198" y="20" textAnchor="end" fill="#0F172A" fontSize="10" fontFamily="monospace" fontWeight="700">
            =£4,378.21
          </text>
        </g>
      </svg>
    </div>
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
          {/* Hero with Dis-aggregation Prism Artwork */}
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
              <div className="space-y-4 text-center lg:col-span-6 lg:text-left">
                {/* Live Interactive Pill */}
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/90 px-3.5 py-1 font-mono text-xs text-muted shadow-xs backdrop-blur-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981]" />
                  </span>
                  <span className="font-semibold text-foreground">BROWSER-LOCAL DETERMINISTIC</span>
                  <span className="text-border">•</span>
                  <span>Autonomous Product &amp; Software Factory • Payout Dis-aggregation Engine</span>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-[34px] lg:leading-tight">
                  Turn one netted Stripe payout into clean GL journal lines
                </h1>

                <p className="text-sm text-muted sm:text-base leading-relaxed">
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
            {/* Apple-style Segmented Pill Control */}
            <div className="mb-4 flex items-center justify-start">
              <div className="inline-flex rounded-xl bg-[#F1F5F9] p-1 shadow-inner border border-black/[0.04]">
                <button
                  type="button"
                  onClick={() => {
                    setMode("json");
                    setError(null);
                  }}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all sm:text-sm cursor-pointer ${
                    mode === "json"
                      ? "bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] font-semibold"
                      : "text-muted hover:text-foreground"
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
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all sm:text-sm cursor-pointer ${
                    mode === "key"
                      ? "bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] font-semibold"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Connect a Stripe restricted key</span>
                </button>
              </div>
            </div>

            {/* Elevated Ghost Border Card */}
            <Card className="rounded-2xl border-0 bg-card shadow-[0_0_0_1px_rgba(15,23,42,0.06),0_8px_24px_-4px_rgba(15,23,42,0.04)]">
              <CardHeader>
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
              <CardContent className="space-y-4">
                {mode === "json" ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadSample("small")}
                          className="h-7 text-xs shadow-2xs"
                        >
                          Small sample
                        </Button>
                        <label className="inline-flex h-7 items-center gap-1.5 rounded border border-border px-2.5 text-xs font-medium text-foreground hover:bg-card cursor-pointer transition-colors shadow-2xs">
                          <input
                            type="file"
                            accept="application/json,.json"
                            className="sr-only"
                            onChange={handleFileUpload}
                          />
                          <Upload className="h-3 w-3" />
                          <span>Upload JSON file</span>
                        </label>
                      </div>
                      <div className="text-[11px] text-subtle font-mono">
                        {jsonText ? `${jsonText.split("\n").length} lines buffer` : "Awaiting input"}
                      </div>
                    </div>

                    {/* Authentic IDE / Terminal Treatment with Line Gutter */}
                    <div className="overflow-hidden rounded-xl border border-border/80 bg-[#F8FAFC] shadow-inner">
                      {/* Editor Header Bar */}
                      <div className="flex items-center justify-between border-b border-border/70 bg-card/75 px-3.5 py-2 text-xs backdrop-blur-xs">
                        <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
                          <span className="flex items-center gap-1.5" aria-hidden="true">
                            <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
                            <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                            <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                          </span>
                          <span className="text-border">|</span>
                          <span className="font-semibold text-foreground">stripe_payout_export.json</span>
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-0.5 font-mono text-[10px] font-semibold text-muted shadow-2xs">
                          <ShieldCheck className="h-3 w-3 text-success" />
                          <span>CLIENT-SIDE ONLY • ZERO EGRESS</span>
                        </span>
                      </div>

                      {/* Editor Body with Gutter */}
                      <div className="flex min-h-[190px] font-mono text-xs">
                        <div
                          className="select-none border-r border-border/60 bg-black/[0.02] px-2.5 py-3 text-right font-mono text-[11px] leading-[1.4rem] text-muted/40"
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
                        </div>
                        <textarea
                          value={jsonText}
                          onChange={(e) => setJsonText(e.target.value)}
                          placeholder='{"payout": {"id": "po_1...", "amount": 437821, "currency": "gbp"}, "balance_transactions": [...]}'
                          aria-label="Stripe JSON export"
                          className="w-full resize-y bg-transparent p-3 font-mono text-xs leading-[1.4rem] text-foreground placeholder:text-muted/50 focus:outline-hidden"
                          rows={8}
                        />
                      </div>
                    </div>

                    {/* Primary CTA with Tactile Feedback */}
                    <div>
                      <Button
                        onClick={handleJson}
                        disabled={busy}
                        className="gap-2 shadow-[0_2px_8px_rgba(79,70,229,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_4px_12px_rgba(79,70,229,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 cursor-pointer font-semibold px-5"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowRightLeft className="h-4 w-4" />
                        )}
                        <span>Reconcile</span>
                      </Button>
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
                        className="gap-2 shadow-[0_2px_8px_rgba(79,70,229,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_4px_12px_rgba(79,70,229,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 cursor-pointer font-semibold px-5"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-4 w-4" />
                        )}
                        <span>Reconcile (metered)</span>
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
        </main>
      </div>
    </div>
  );
}
