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
  Landmark,
  Receipt,
  ArrowRightLeft,
  Sparkles,
  Upload,
  Calendar,
} from "lucide-react";

const trackEvent = (event: string, payload?: Record<string, unknown>) => {
  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, payload: payload ?? {}, product: "ledgerlink" }),
  }).catch((err) => console.error("[ledgerlink] telemetry failed:", err));
};

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
    trackEvent("page_view");
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
    trackEvent("reconcile_click", { source: "json" });
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
    trackEvent("reconcile_click", { source: "stripe_key" });
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
    trackEvent("export_csv_click", { lines: result.journalLines.length });
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
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-lg font-bold tracking-tight text-card shadow-sm">
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
            <Button size="sm" variant="outline" onClick={() => loadSample("worked")}>
              <Sparkles className="h-4 w-4" />
              <span>Load Worked Example</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="mx-auto max-w-3xl space-y-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted">
            <Landmark className="h-3.5 w-3.5 text-primary" />
            <span>Autonomous Product &amp; Software Factory • Payout Dis-aggregation Engine</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
            Turn one netted Stripe payout into clean GL journal lines
          </h1>
          <p className="text-sm text-muted sm:text-base">
            A single payout is a bundle of charges, refunds, chargebacks, Stripe fees, Connect
            transfers and FX adjustments. LedgerLink decomposes it into categorized journal lines
            that <strong className="text-foreground">sum to the payout net exactly</strong> — ready
            for Xero or QuickBooks.
          </p>
        </div>

        {/* Source picker */}
        <div className="mx-auto max-w-4xl">
          <div className="mb-3 flex flex-wrap gap-1 border-b border-border">
            {(
              [
                ["json", "Paste / Upload JSON export"],
                ["key", "Connect a Stripe restricted key"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-xs font-medium transition-colors sm:text-sm ${
                  mode === m
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <Card className="border-border">
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
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => loadSample("small")}>
                      Small sample
                    </Button>
                    <label className="inline-flex h-8 items-center gap-1.5 rounded border border-border px-3 text-xs font-medium text-foreground hover:bg-card">
                      <input
                        type="file"
                        accept="application/json,.json"
                        className="sr-only"
                        onChange={handleFileUpload}
                      />
                      <Upload className="h-3.5 w-3.5" />
                      Upload JSON file
                    </label>
                  </div>
                  <textarea
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    placeholder='{"payout": {"id": "po_1...", "amount": 437821, "currency": "gbp"}, "balance_transactions": [...]}'
                    aria-label="Stripe JSON export"
                    className="h-48 w-full rounded border border-border bg-background p-3 font-mono text-xs text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  <Button onClick={handleJson} disabled={busy} className="gap-1.5">
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRightLeft className="h-4 w-4" />
                    )}
                    <span>Reconcile</span>
                  </Button>
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
                  <Button onClick={handleKey} disabled={busy} className="gap-1.5">
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    <span>Reconcile (metered)</span>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="mx-auto flex max-w-4xl items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
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
            <Card className="border-border">
              <div className="flex items-center justify-between gap-3 border-b border-border p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-card shadow-sm">
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
                <Button size="sm" variant="outline" onClick={handleExportCsv} className="gap-1.5">
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
                    <div key={key} className="rounded-lg border border-border bg-background p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
                      <p className={`mt-1 font-mono text-base font-bold tabular-nums ${tone}`}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div
                  className={`mt-4 flex items-start gap-2 rounded-lg border p-3 text-xs ${
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
                      <span className="font-mono tabular-nums">{formatMoney(result.sumNet, currency)}</span>{" "}
                      vs payout net{" "}
                      <span className="font-mono tabular-nums">
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
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Receipt className="h-4 w-4 text-primary" />
                  <span>Decomposed GL Journal Lines</span>
                </CardTitle>
                <CardDescription>
                  {result.journalLines.length} lines • net {formatMoney(sumLineNet(result), currency)}{" "}
                  (Xero / QuickBooks-ready).
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-[420px] overflow-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                      <th className="py-2 pr-3 font-medium">Date</th>
                      <th className="py-2 pr-3 font-medium">Account</th>
                      <th className="py-2 pr-3 text-right font-medium">Debit</th>
                      <th className="py-2 pr-3 text-right font-medium">Credit</th>
                      <th className="py-2 font-medium">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.journalLines.map((l, i) => (
                      <tr key={`${l.reference}-${i}`} className="border-b border-border/60">
                        <td className="py-2 pr-3 font-mono tabular-nums text-xs text-muted">{l.date}</td>
                        <td className="py-2 pr-3 font-medium text-foreground">{l.account}</td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums text-destructive">
                          {l.debit ? formatMoney(l.debit, currency) : "—"}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums text-success">
                          {l.credit ? formatMoney(l.credit, currency) : "—"}
                        </td>
                        <td className="py-2 font-mono text-xs text-muted">{l.reference}</td>
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
          <Card className="border-border bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-primary" />
                <span>How bookkeepers use it</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted">
              Paste the payout&apos;s balance_transactions export (or connect a read-only key) and
              get a month-end-ready journal in seconds — no Synder/PayTraQer setup, no spreadsheet
              panic. The engine is fully deterministic and verifiable right here.
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
