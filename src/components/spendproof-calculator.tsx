"use client";

import * as React from "react";
import {
  DEFAULT_SCENARIO,
  INVOICE_DOCUMENT_EXAMPLE,
  SCENARIO_KEYS_NOTE,
  SPENDPROOF_SCENARIOS,
  SpendProofFieldError,
  formatMicros,
  formatMicrosSigned,
  formatRatePerThousand,
  reconcileCsv,
  scenarioByKey,
  type CloseReport,
  type Finding,
  type FindingSeverity,
  type ScenarioKey,
} from "@/lib/calc/spendproof";
import { trackEvent } from "@/lib/telemetry-client";
import { IdeTextarea } from "@/components/editorial/ide-textarea";
import { TACTILE_CTA } from "@/components/editorial/signature";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  ScanLine,
  ShieldCheck,
} from "lucide-react";

const SEVERITY_VARIANT: Record<FindingSeverity, "destructive" | "warning" | "accent"> = {
  blocking: "destructive",
  unmatched: "warning",
  advisory: "accent",
};

type UnmappedColumns = { invoice: string[]; ledger: string[] } | null;
type ExtractionState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "blocked"; message: string; missing: string[] }
  | { kind: "labels"; labels: string[]; note: string };

function scenarioText(key: ScenarioKey) {
  const scenario = scenarioByKey(key);
  return {
    key,
    invoice: scenario?.invoiceCsv ?? "",
    ledger: scenario?.ledgerCsv ?? "",
  };
}

export default function SpendProofCalculator({
  initialScenario = DEFAULT_SCENARIO,
}: {
  initialScenario?: ScenarioKey;
}) {
  // The worked example the page ships with is the initial state, computed once — no effect that
  // sets state on mount.
  const [initial] = React.useState(() => scenarioText(initialScenario));
  const [invoiceText, setInvoiceText] = React.useState(initial.invoice);
  const [ledgerText, setLedgerText] = React.useState(initial.ledger);
  const [report, setReport] = React.useState<CloseReport | null>(null);
  const [unmapped, setUnmapped] = React.useState<UnmappedColumns>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [documentText, setDocumentText] = React.useState(INVOICE_DOCUMENT_EXAMPLE);
  const [extraction, setExtraction] = React.useState<ExtractionState>({ kind: "idle" });

  React.useEffect(() => {
    trackEvent("page_view", undefined, "spendproof");
  }, []);

  const loadScenario = React.useCallback((key: ScenarioKey) => {
    const text = scenarioText(key);
    setInvoiceText(text.invoice);
    setLedgerText(text.ledger);
    setReport(null);
    setUnmapped(null);
    setError(null);
  }, []);

  const editField = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setReport(null);
    setUnmapped(null);
    setError(null);
  };

  const runReconcile = () => {
    try {
      const result = reconcileCsv({ invoiceCsv: invoiceText, ledgerCsv: ledgerText });
      setReport(result.report);
      setUnmapped(result.unmappedColumns);
      setError(null);
      trackEvent(
        "reconcile_click",
        {
          closeReady: result.report.closeReady,
          findings: result.report.findings.length,
          untaggedQuantity: result.report.untaggedQuantity,
          invoiceTotalUsd: result.report.invoiceTotalMicroUsd / 1_000_000,
          recomputedTotalUsd: result.report.recomputedTotalMicroUsd / 1_000_000,
        },
        "spendproof",
      );
    } catch (runError) {
      // Explicit, not silent: a file the engine cannot read stops the run and names the column.
      setReport(null);
      setUnmapped(null);
      if (runError instanceof SpendProofFieldError) {
        setError(`${runError.ruleId} at ${runError.fieldPath} — ${runError.message}`);
      } else {
        setError(
          runError instanceof Error
            ? `The reconciliation failed: ${runError.message} Nothing was reconciled.`
            : "The reconciliation failed unexpectedly.",
        );
      }
    }
  };

  const readFile = async (file: File, setter: (value: string) => void) => {
    try {
      setter(await file.text());
      setReport(null);
      setUnmapped(null);
      setError(null);
    } catch (readError) {
      setError(
        `Could not read ${file.name}: ${readError instanceof Error ? readError.message : "unknown error"}`,
      );
    }
  };

  const downloadClosePack = () => {
    if (!report) return;
    const blob = new Blob([report.closePack], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `spendproof-close-pack-${report.period.start}-to-${report.period.end}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    trackEvent(
      "export_click",
      { closeReady: report.closeReady, findings: report.findings.length },
      "spendproof",
    );
  };

  const runExtraction = async () => {
    if (!documentText.trim()) return;
    setExtraction({ kind: "loading" });
    try {
      const response = await fetch("/api/spendproof/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentText, documentName: "provider-invoice" }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        blocked?: boolean;
        error?: string;
        missing?: string[];
        data?: { labels?: string[]; note?: string };
      };
      if (!response.ok) {
        // The loud door: the deploy has no model/parse key, or the invoice could not be read.
        setExtraction({
          kind: "blocked",
          message: body.error ?? `The extraction was refused (HTTP ${response.status}).`,
          missing: body.missing ?? [],
        });
        return;
      }
      setExtraction({
        kind: "labels",
        labels: body.data?.labels ?? [],
        note: body.data?.note ?? "",
      });
    } catch (extractionError) {
      setExtraction({
        kind: "blocked",
        message:
          extractionError instanceof Error
            ? extractionError.message
            : "The extraction request failed.",
        missing: [],
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <Card className="rounded-2xl border-0 bg-card ring-1 ring-[#0F172A]/[0.06] shadow-[0_0_0_1px_rgba(15,23,42,0.06),0_8px_24px_-4px_rgba(15,23,42,0.04)]">
        <CardHeader>
          <CardTitle>1 &middot; Your two records</CardTitle>
          <CardDescription>
            The provider&apos;s own line-item export and your tagged-usage ledger. The reconciliation
            runs in this page — the same deterministic engine the agent tool calls — and no rate is
            ever looked up: every line is recomputed at the rate the invoice itself declares.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
              Invoice line items (declared fields)
              <IdeTextarea
                title="provider-invoice.csv"
                ariaLabel="Invoice line items (CSV)"
                value={invoiceText}
                onChange={editField(setInvoiceText)}
                rows={5}
                placeholder="provider,period_start,period_end,service,model,sku,quantity,unit_price_usd_per_thousand,amount_usd,invoice_total_usd"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
              Tagged-usage ledger (CSV)
              <IdeTextarea
                title="tagged-usage.csv"
                ariaLabel="Tagged-usage ledger (CSV)"
                value={ledgerText}
                onChange={editField(setLedgerText)}
                rows={5}
                placeholder="bucket,service,model,sku,quantity,timestamp"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { label: "Invoice lines file", setter: setInvoiceText },
              { label: "Ledger file", setter: setLedgerText },
            ].map((slot) => (
              <label
                key={slot.label}
                className="flex cursor-pointer items-center gap-2 rounded border border-border bg-background px-3 py-2 text-xs text-muted hover:text-foreground"
              >
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                {slot.label}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void readFile(file, slot.setter);
                  }}
                />
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              className={TACTILE_CTA}
              onClick={runReconcile}
              disabled={!invoiceText.trim() || !ledgerText.trim()}
            >
              <ShieldCheck className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Reconcile the period
            </Button>
            {SPENDPROOF_SCENARIOS.map((scenario) => (
              <Button
                key={scenario.key}
                variant="outline"
                onClick={() => loadScenario(scenario.key)}
                title={scenario.expects}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {scenario.label}
              </Button>
            ))}
            <Button
              variant="ghost"
              onClick={() => {
                setInvoiceText("");
                setLedgerText("");
                setReport(null);
                setUnmapped(null);
                setError(null);
              }}
            >
              Clear
            </Button>
          </div>
          <p className="text-xs text-subtle">{SCENARIO_KEYS_NOTE}</p>
        </CardContent>
      </Card>

      <div aria-live="polite" className="space-y-6">
        {error ? (
          <Card className="border-destructive">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        {unmapped && (unmapped.invoice.length > 0 || unmapped.ledger.length > 0) ? (
          <Card className="border-warning">
            <CardContent className="pt-6 text-xs text-warning">
              Columns the reconciliation does not map (reported, not silently ignored):{" "}
              {[
                ...unmapped.invoice.map((column) => `invoice: ${column}`),
                ...unmapped.ledger.map((column) => `ledger: ${column}`),
              ].join(" · ")}
            </CardContent>
          </Card>
        ) : null}

        {report ? (
          <>
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>2 &middot; Close verdict</CardTitle>
                  <CardDescription>
                    {report.closeReady
                      ? "Nothing in the implemented rule set withholds the close: every line reconciled at the invoice's own declared rate and no usage is unattributed."
                      : "The close is withheld — the rule ids below name exactly what has to be resolved first. Nothing is estimated and no rate is filled in."}
                  </CardDescription>
                </div>
                <Badge variant={report.closeReady ? "success" : "destructive"}>
                  {report.closeReady ? "CLOSE-READY" : "CLOSE WITHHELD"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    ["Invoice total", formatMicros(report.invoiceTotalMicroUsd)],
                    ["Recomputed from ledger", formatMicros(report.recomputedTotalMicroUsd)],
                    ["Aggregate variance", formatMicrosSigned(report.aggregateVarianceMicroUsd)],
                    [
                      "Declared tolerance",
                      `${formatMicros(report.toleranceMicroUsd)} (${((report.toleranceMicroUsd / Math.max(1, report.invoiceLineSumMicroUsd)) * 100).toFixed(2)}%)`,
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded border border-border p-3">
                      <dt className="text-xs text-muted">{label}</dt>
                      <dd className="font-mono text-lg font-semibold text-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="muted">{report.lines.length} invoice line(s)</Badge>
                  <Badge variant="muted">
                    {report.lines.reduce((total, line) => total + line.buckets.length, 0)} attribution
                    bucket(s)
                  </Badge>
                  {report.untaggedQuantity > 0 ? (
                    <Badge variant="destructive">
                      {report.untaggedQuantity.toLocaleString("en-US")} units unattributed (
                      {formatMicros(report.untaggedValueMicroUsd)})
                    </Badge>
                  ) : (
                    <Badge variant="success">No untagged usage</Badge>
                  )}
                  <Badge variant="outline">
                    period {report.period.start} → {report.period.end}
                  </Badge>
                  <Badge variant="outline">{report.provider}</Badge>
                </div>
                {report.blockers.length > 0 ? (
                  <p className="font-mono text-xs text-destructive">
                    Withholding the close: {report.blockers.join(" · ")}
                  </p>
                ) : null}
                <Button variant="outline" size="sm" onClick={downloadClosePack}>
                  <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Download close pack (CSV)
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3 &middot; Findings — what kind of discrepancy, and the fix</CardTitle>
                <CardDescription>
                  Rounding, period-boundary overlap, missing or late usage, untagged spend or a
                  mid-period rate change. Every finding names its rule id and what to do about it.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {report.findings.length === 0 ? (
                  <p className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Zero findings: both records agree at the declared rate.
                  </p>
                ) : (
                  <ul aria-label="Findings" className="space-y-3">
                    {report.findings.map((finding: Finding, index) => (
                      <li
                        key={`${finding.ruleId}-${finding.scope}-${index}`}
                        className="rounded border border-border p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <code className="break-all font-mono text-xs font-semibold text-foreground">
                            {finding.ruleId}
                          </code>
                          <div className="flex items-center gap-2">
                            <Badge variant={SEVERITY_VARIANT[finding.severity]}>
                              {finding.severity}
                            </Badge>
                            <Badge variant="outline">{finding.kind}</Badge>
                            {finding.deltaMicroUsd === undefined ? null : (
                              <span className="font-mono text-xs text-foreground">
                                {formatMicrosSigned(finding.deltaMicroUsd)}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="mt-2 break-all font-mono text-[11px] text-subtle">
                          {finding.scope}
                        </p>
                        <p className="mt-1 text-sm text-muted">{finding.message}</p>
                        <p className="mt-1 text-xs text-subtle">Fix: {finding.fix}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4 &middot; Per-bucket trail — allocated vs recomputed</CardTitle>
                <CardDescription>
                  The invoice has no buckets of its own, so its amount is allocated across your tagged
                  buckets by tagged-quantity share and each one is recomputed at the declared rate
                  {report.lines.some((line) => line.recomputedMicroUsd === null)
                    ? "; a line with more than one declared rate shows no bucket trail, because no single rate can recompute it"
                    : ""}
                  .
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {report.lines.map((line) => {
                  const rate =
                    line.declaredUnitPrices.length === 1 ? line.declaredUnitPrices[0] : null;
                  return (
                    <div key={line.key} className="rounded border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="break-all font-mono text-xs font-medium text-foreground">
                          {line.key}
                        </span>
                        <Badge
                          variant={
                            line.kind === null || line.kind === "rounding"
                              ? "outline"
                              : line.kind === "untagged_spend"
                                ? "destructive"
                                : "warning"
                          }
                        >
                          {line.kind ?? "reconciled"}
                        </Badge>
                      </div>
                      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                        {[
                          ["Billed quantity", line.invoiceQuantity.toLocaleString("en-US")],
                          [
                            "Declared rate",
                            rate === null
                              ? line.declaredUnitPrices.map(formatRatePerThousand).join(" → ")
                              : formatRatePerThousand(rate),
                          ],
                          [
                            "Recomputed",
                            line.recomputedMicroUsd === null
                              ? "not computable at one rate"
                              : formatMicros(line.recomputedMicroUsd),
                          ],
                          [
                            "Variance",
                            line.varianceMicroUsd === null
                              ? "not reported"
                              : formatMicrosSigned(line.varianceMicroUsd),
                          ],
                          ["Tagged quantity", line.taggedQuantity.toLocaleString("en-US")],
                          ["Untagged quantity", line.untaggedQuantity.toLocaleString("en-US")],
                          ["Near period edge", line.boundaryQuantity.toLocaleString("en-US")],
                          [
                            "Outside the window",
                            line.outOfPeriodQuantity.toLocaleString("en-US"),
                          ],
                        ].map(([label, value]) => (
                          <div key={String(label)}>
                            <dt className="text-subtle">{label as string}</dt>
                            <dd className="break-words font-mono text-foreground">
                              {value as string}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      {line.buckets.length > 0 ? (
                        <ul className="mt-3 space-y-2">
                          {line.buckets.map((bucket) => (
                            <li
                              key={bucket.bucket}
                              className="flex flex-wrap items-center justify-between gap-2 rounded bg-background/80 px-3 py-2 text-xs"
                            >
                              <span className="break-all font-mono text-foreground">
                                {bucket.bucket}
                              </span>
                              <span className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-muted">
                                <span>
                                  {bucket.ledgerQuantity.toLocaleString("en-US")} units
                                </span>
                                <span>
                                  allocated {formatMicros(bucket.allocatedInvoiceMicroUsd)}
                                </span>
                                <span>recomputed {formatMicros(bucket.recomputedMicroUsd)}</span>
                                <span
                                  className={
                                    bucket.reconciled ? "text-[#047857]" : "text-destructive"
                                  }
                                >
                                  {formatMicrosSigned(bucket.varianceMicroUsd)}
                                </span>
                                <Badge variant={bucket.reconciled ? "success" : "warning"}>
                                  {bucket.reconciled ? "reconciled" : "unmatched"}
                                </Badge>
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Coverage — what this reconciliation does and does not claim</CardTitle>
                <CardDescription>
                  <AlertTriangle className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
                  {report.coverage.note}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
                    Implemented rule ids
                  </p>
                  <p className="break-words font-mono text-xs text-muted">
                    {report.coverage.implementedRuleIds.join(", ")}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
                    Not implemented in v1 (never reported as a pass)
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
                    {report.coverage.unsupportedFamilies.map((family) => (
                      <li key={family}>{family}</li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs text-subtle">
                  Deterministic core: the reconciliation makes no network request and no model call —
                  it runs in this page and in <code className="font-mono">/api/agent/calculate</code>{" "}
                  for agents. A document that has to be READ (a PDF invoice) is read by the extraction
                  layer, which labels every field and withholds the verdict on anything it cannot read.
                </p>
              </CardContent>
            </Card>
          </>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>
              <FileText className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
              5 &middot; Read a PDF invoice (extraction)
            </CardTitle>
            <CardDescription>
              Paste the invoice&apos;s document text. A document parse plus a model read it into the
              declared field set &mdash; every field is labelled <code className="font-mono">extracted</code>,{" "}
              <code className="font-mono">unreadable</code> or <code className="font-mono">unstated</code>,
              and anything that is not <code className="font-mono">extracted</code> withholds the
              verdict. The model reads the document; it never computes a figure.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <IdeTextarea
              title="invoice.pdf.txt"
              ariaLabel="Invoice document text"
              value={documentText}
              onChange={setDocumentText}
              rows={5}
              badge={null}
              meta="EXTRACTION INPUT"
              placeholder="Paste the invoice's text (or the provider's PDF text layer) here…"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className={TACTILE_CTA}
                onClick={() => void runExtraction()}
                disabled={!documentText.trim() || extraction.kind === "loading"}
              >
                <ScanLine className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {extraction.kind === "loading" ? "Extracting…" : "Extract declared fields"}
              </Button>
              <span className="text-xs text-subtle">
                The extraction keys live server-side only and are never sent to this page.
              </span>
            </div>

            {extraction.kind === "blocked" ? (
              <div
                role="region"
                aria-label="Extraction result"
                className="rounded-xl border border-destructive/60 bg-destructive/[0.04] p-3"
              >
                <p className="text-sm text-destructive">{extraction.message}</p>
                {extraction.missing.length > 0 ? (
                  <p className="mt-1 break-all font-mono text-[11px] text-destructive">
                    missing in the deploy environment: {extraction.missing.join(", ")}
                  </p>
                ) : null}
              </div>
            ) : null}

            {extraction.kind === "labels" ? (
              <div
                role="region"
                aria-label="Extraction result"
                className="space-y-2 rounded-xl border border-border bg-background/80 p-3"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Extracted fields
                </p>
                <p className="break-words font-mono text-xs text-muted">
                  {extraction.labels.join(" · ")}
                </p>
                {extraction.note ? (
                  <p className="text-xs text-subtle">{extraction.note}</p>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
