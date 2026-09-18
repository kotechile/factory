"use client";

import * as React from "react";
import {
  AUDIT_SCENARIOS,
  DEFAULT_SCENARIO,
  SCENARIO_KEYS_NOTE,
  scenarioByKey,
  type ScenarioKey,
} from "@/lib/calc/parcelaudit/fixtures";
import {
  ParcelAuditFieldError,
  auditInvoiceCsv,
  formatLb,
  formatUsd,
  type AuditReport,
  type CsvAuditResult,
  type LineAudit,
  type Severity,
} from "@/lib/calc/parcelaudit";
import { trackEvent } from "@/lib/telemetry-client";
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
  RefreshCw,
  ShieldCheck,
  Truck,
} from "lucide-react";

export interface ParcelProofCalculatorProps {
  initialScenario?: ScenarioKey;
}

const SEVERITY_VARIANT: Record<Severity, "destructive" | "warning" | "accent"> = {
  blocking: "destructive",
  recoverable: "warning",
  advisory: "accent",
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function scenarioText(key: ScenarioKey) {
  const scenario = scenarioByKey(key);
  return {
    key,
    label: scenario?.label ?? key,
    records: scenario?.shipmentRecordsCsv ?? "",
    lines: scenario?.invoiceLinesCsv ?? "",
    rateCard: scenario?.rateCardCsv ?? "",
    asOfDate: scenario?.asOfDate ?? todayIso(),
  };
}

export default function ParcelProofCalculator({ initialScenario = DEFAULT_SCENARIO }: ParcelProofCalculatorProps) {
  // The worked example the page ships with is the initial state, computed once — no effect that
  // sets state on mount.
  const [initial] = React.useState(() => scenarioText(initialScenario));
  const [recordsText, setRecordsText] = React.useState(initial.records);
  const [linesText, setLinesText] = React.useState(initial.lines);
  const [rateCardText, setRateCardText] = React.useState(initial.rateCard);
  // The dispute clock needs a "today". Worked examples are audited at their own reference date (so a
  // demo stays meaningful and reproducible); anything the visitor pastes or uploads is audited at
  // today's date. Which one was used is stated in the summary, never left implicit.
  const [asOfDate, setAsOfDate] = React.useState(initial.asOfDate);
  const [report, setReport] = React.useState<AuditReport | null>(null);
  const [unmapped, setUnmapped] = React.useState<CsvAuditResult["unmappedColumns"] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    trackEvent("page_view", undefined, "parcelproof");
  }, []);

  const loadScenario = React.useCallback((key: ScenarioKey) => {
    const text = scenarioText(key);
    setRecordsText(text.records);
    setLinesText(text.lines);
    setRateCardText(text.rateCard);
    setAsOfDate(text.asOfDate);
    setReport(null);
    setUnmapped(null);
    setError(null);
  }, []);

  /** A manual edit means the data is the visitor's own — audit it at today's date. */
  const editField = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setAsOfDate(todayIso());
    setReport(null);
  };

  const runAudit = () => {
    try {
      const result = auditInvoiceCsv({
        shipmentRecordsCsv: recordsText,
        invoiceLinesCsv: linesText,
        rateCardCsv: rateCardText,
        asOfDate,
      });
      setReport(result.report);
      setUnmapped(result.unmappedColumns);
      setError(null);
      trackEvent(
        "audit_click",
        {
          clean: result.report.clean,
          findings: result.report.summary.findings,
          recoverableCents: result.report.summary.recoverableTotalCents,
          expiredCents: result.report.summary.expiredTotalCents,
          lines: result.report.lines.length,
        },
        "parcelproof",
      );
    } catch (runError) {
      // Explicit, not silent: a file the audit cannot read stops the run and names the column.
      setReport(null);
      setUnmapped(null);
      if (runError instanceof ParcelAuditFieldError) {
        setError(`${runError.ruleId} at ${runError.fieldPath} — ${runError.message} Nothing was audited.`);
      } else {
        setError(
          runError instanceof Error
            ? `The audit failed: ${runError.message}. Nothing was audited.`
            : "The audit failed unexpectedly.",
        );
      }
    }
  };

  const readFile = async (file: File, setter: (value: string) => void) => {
    try {
      setter(await file.text());
      setAsOfDate(todayIso());
      setReport(null);
      setError(null);
    } catch (readError) {
      setError(
        `Could not read ${file.name}: ${readError instanceof Error ? readError.message : "unknown error"}`,
      );
    }
  };

  const downloadDisputeCsv = () => {
    if (!report) return;
    const blob = new Blob([report.disputePacket], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `parcelproof-dispute-${report.asOfDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    trackEvent(
      "export_click",
      { findings: report.summary.findings, recoverableCents: report.summary.recoverableTotalCents },
      "parcelproof",
    );
  };

  const summary = report?.summary ?? null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>1 &middot; Your two files</CardTitle>
          <CardDescription>
            Paste or upload the shipment records you handed over and the carrier&apos;s invoice lines.
            The audit runs in this page — the same deterministic engine the agent tools call.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
              Shipment records (CSV)
              <textarea
                value={recordsText}
                onChange={(event) => editField(setRecordsText)(event.target.value)}
                rows={8}
                spellCheck={false}
                placeholder="order_id,tracking,carrier,service,ship_date,length,width,height,actual_weight_lb,zone,residential,address_correction,promised_date,delivered_at"
                className="w-full rounded border border-border bg-background p-3 font-mono text-xs leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
              Invoice lines (CSV)
              <textarea
                value={linesText}
                onChange={(event) => editField(setLinesText)(event.target.value)}
                rows={8}
                spellCheck={false}
                placeholder="tracking,invoice_date,carrier,service,billed_weight_lb,zone,base_charge_usd,surcharges,total_usd"
                className="w-full rounded border border-border bg-background p-3 font-mono text-xs leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
            Contract rate card (CSV) — optional, and the only way a line gets priced
            <textarea
              value={rateCardText}
              onChange={(event) => editField(setRateCardText)(event.target.value)}
              rows={5}
              spellCheck={false}
              placeholder="carrier,service,zone,min_weight_lb,max_weight_lb,rate_usd"
              className="w-full rounded border border-border bg-background p-3 font-mono text-xs leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "Shipment records file", setter: setRecordsText },
              { label: "Invoice lines file", setter: setLinesText },
              { label: "Rate card file", setter: setRateCardText },
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
            <Button onClick={runAudit} disabled={!recordsText.trim() || !linesText.trim()}>
              <ShieldCheck className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Audit invoice
            </Button>
            {AUDIT_SCENARIOS.map((scenario) => (
              <Button
                key={scenario.key}
                variant="outline"
                onClick={() => loadScenario(scenario.key)}
                title={scenario.description}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {scenario.label}
              </Button>
            ))}
            <Button
              variant="ghost"
              onClick={() => {
                setRecordsText("");
                setLinesText("");
                setRateCardText("");
                setAsOfDate(todayIso());
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

        {unmapped && (unmapped.shipmentRecords.length > 0 || unmapped.invoiceLines.length > 0 || unmapped.rateCard.length > 0) ? (
          <Card className="border-warning">
            <CardContent className="pt-6 text-xs text-warning">
              Columns the audit does not map (reported, not silently ignored):{" "}
              {[
                ...unmapped.shipmentRecords.map((column) => `shipment records: ${column}`),
                ...unmapped.invoiceLines.map((column) => `invoice lines: ${column}`),
                ...unmapped.rateCard.map((column) => `rate card: ${column}`),
              ].join(" · ")}
            </CardContent>
          </Card>
        ) : null}

        {report && summary ? (
          <>
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>2 &middot; Recovery summary</CardTitle>
                  <CardDescription>
                    {report.clean
                      ? "Nothing in the implemented rule set was flagged on this invoice."
                      : "Claimable money is split from expired money: an overcharge whose dispute window has closed is measured, not counted as recovery."}
                  </CardDescription>
                </div>
                <Badge variant={report.clean ? "success" : summary.recoverableTotalCents > 0 ? "warning" : "outline"}>
                  {report.clean ? "clean" : `${summary.findings} ${summary.findings === 1 ? "flag" : "flags"}`}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    ["Claimable now", formatUsd(summary.recoverableTotalCents)],
                    ["Closing within 7 days", formatUsd(summary.expiringSoonCents)],
                    ["Window already expired", formatUsd(summary.expiredTotalCents)],
                    ["Carrier under-billed", formatUsd(summary.underBilledTotalCents)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded border border-border p-3">
                      <dt className="text-xs text-muted">{label}</dt>
                      <dd className="font-mono text-lg font-semibold text-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="muted">{summary.linesAudited} lines audited</Badge>
                  {summary.linesUnverifiable > 0 ? (
                    <Badge variant="destructive">{summary.linesUnverifiable} lines could not be audited</Badge>
                  ) : null}
                  {summary.linesUnpriced > 0 ? (
                    <Badge variant="warning">{summary.linesUnpriced} lines unpriced — supply your rate card</Badge>
                  ) : null}
                  <Badge variant="muted">{summary.observedWindowDays}-day invoice window observed</Badge>
                  <Badge variant="outline">audited as of {report.asOfDate}</Badge>
                  {summary.recordsUnbilled > 0 ? (
                    <Badge variant="outline">{summary.recordsUnbilled} records not billed here</Badge>
                  ) : null}
                </div>
                <div className="overflow-hidden rounded border border-border">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-background text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th scope="col" className="px-3 py-2">Carrier</th>
                        <th scope="col" className="px-3 py-2">Lines</th>
                        <th scope="col" className="px-3 py-2">Claimable</th>
                        <th scope="col" className="px-3 py-2">Expired</th>
                        <th scope="col" className="px-3 py-2">Annualised run-rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.byCarrier.map((rollup) => (
                        <tr key={rollup.carrier} className="border-t border-border">
                          <td className="px-3 py-2 font-mono text-xs uppercase">{rollup.carrier}</td>
                          <td className="px-3 py-2 font-mono text-xs">{rollup.lines}</td>
                          <td className="px-3 py-2 font-mono text-xs">{formatUsd(rollup.recoverableCents)}</td>
                          <td className="px-3 py-2 font-mono text-xs">{formatUsd(rollup.expiredCents)}</td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {rollup.annualisedRunRateCents === null
                              ? "— (window < 7 days)"
                              : formatUsd(rollup.annualisedRunRateCents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>3 &middot; Findings</CardTitle>
                  <CardDescription>
                    Every flag names its rule id, the field it was raised on, the trigger that failed
                    and the fix.
                  </CardDescription>
                </div>
                {report.findings.length > 0 ? (
                  <Button variant="outline" size="sm" onClick={downloadDisputeCsv}>
                    <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Download dispute CSV
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-4">
                {report.findings.length === 0 ? (
                  <p className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    No rule in the implemented set failed.
                  </p>
                ) : (
                  <div
                    className="overflow-x-auto rounded border border-border"
                    tabIndex={0}
                    role="region"
                    aria-label="Findings: rule, severity, line, trigger and fix"
                  >
                    <table className="w-full border-collapse text-left text-sm">
                      <thead className="bg-background text-xs uppercase tracking-wide text-muted">
                        <tr>
                          <th scope="col" className="px-3 py-2">Rule</th>
                          <th scope="col" className="px-3 py-2">Severity</th>
                          <th scope="col" className="px-3 py-2">Line and field</th>
                          <th scope="col" className="px-3 py-2">Finding, trigger and fix</th>
                          <th scope="col" className="px-3 py-2">Delta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.findings.map((finding, index) => (
                          <tr
                            key={`${finding.ruleId}-${finding.tracking}-${finding.fieldPath}-${index}`}
                            className="border-t border-border align-top"
                          >
                            <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-foreground">
                              {finding.ruleId}
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant={SEVERITY_VARIANT[finding.severity]}>{finding.severity}</Badge>
                            </td>
                            <td className="w-48 break-all px-3 py-2">
                              <span className="block font-mono text-xs text-muted">
                                {finding.tracking}
                              </span>
                              <span className="mt-1 block break-all font-mono text-xs text-subtle">
                                {finding.fieldPath}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-muted">
                              <span className="block text-foreground">{finding.message}</span>
                              {finding.trigger ? (
                                <span className="mt-1 block text-xs text-subtle">
                                  Trigger: {finding.trigger}
                                </span>
                              ) : null}
                              <span className="mt-1 block text-xs text-subtle">Fix: {finding.fix}</span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-foreground">
                              {finding.deltaCents === undefined ? "—" : formatUsd(finding.deltaCents)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4 &middot; Line ledger — billed vs recomputed, and the clock</CardTitle>
                <CardDescription>
                  One row per invoice line. The recomputed total is{" "}
                  <span className="font-mono">billed − Σ finding deltas</span>, so every number here is
                  reproducible from your two files.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Per-line ledger as labelled blocks rather than a 9-column table: at this card
                    width a table clipped its last columns, and a clipped number in an audit reads as
                    a hidden one. The layout guard (tests/e2e/parcelproof-layout.spec.ts) asserts no
                    audit table overflows its card. */}
                <ul className="space-y-3">
                  {report.lines.map((line: LineAudit, index) => (
                    <li key={`${line.tracking}-${index}`} className="rounded border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="break-all font-mono text-xs font-medium text-foreground">
                          {line.tracking}
                        </span>
                        <Badge
                          variant={
                            line.disputeWindow?.status === "expired"
                              ? "destructive"
                              : line.disputeWindow?.status === "expiring"
                                ? "warning"
                                : "muted"
                          }
                        >
                          {line.disputeWindow
                            ? `${line.disputeWindow.status} · ${line.disputeWindow.daysRemaining}d left`
                            : "not audited"}
                        </Badge>
                      </div>
                      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                        {[
                          ["Service", line.service ?? "—"],
                          ["Billed weight", formatLb(line.billedWeightLb)],
                          ["Recomputed weight", formatLb(line.recomputedWeightLb)],
                          [
                            "Weight delta",
                            line.weightDeltaLb === null
                              ? "—"
                              : `${line.weightDeltaLb > 0 ? "+" : ""}${line.weightDeltaLb} lb`,
                          ],
                          ["Billed total", formatUsd(line.billedTotalCents)],
                          ["Recomputed total", formatUsd(line.recomputedTotalCents)],
                          ["Rate", line.rateVerification],
                          ["Dispute deadline", line.disputeWindow?.deadline ?? "—"],
                        ].map(([label, value]) => (
                          <div key={String(label)}>
                            <dt className="text-subtle">{label as string}</dt>
                            <dd className="break-words font-mono text-foreground">{value as string}</dd>
                          </div>
                        ))}
                      </dl>
                      {line.unauditedReason ? (
                        <p className="mt-2 text-xs text-destructive">
                          Not audited: {line.unauditedReason}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Coverage — what this audit does and does not claim</CardTitle>
                <CardDescription>
                  <Truck className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
                  {report.coverage.note}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
                    Implemented rule ids
                  </p>
                  <p className="font-mono text-xs text-muted">
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
                <p className="flex items-start gap-2 text-xs text-subtle">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    Deterministic core: no LLM call and no network request is made to audit your files
                    — the engine runs in this page and in{" "}
                    <code className="font-mono">/api/agent/calculate</code> for agents. The worked
                    examples are audited at their own reference date (shown above); files you paste or
                    upload are audited at today&apos;s date ({todayIso()}).
                  </span>
                </p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
