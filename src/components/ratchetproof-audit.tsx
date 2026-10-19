"use client";

import * as React from "react";
import {
  COVERAGE_NOTE,
  DEFAULT_SCENARIO,
  IMPLEMENTED_RULE_IDS,
  RATCHETPROOF_SCENARIOS,
  RatchetProofFieldError,
  SCENARIO_KEYS,
  UNSUPPORTED_FAMILIES,
  auditFromText,
  formatKw,
  formatMicros,
  formatMicrosSigned,
  formatRate,
  scenarioByKey,
  type AuditReport,
  type FindingSeverity,
  type ScenarioKey,
} from "@/lib/calc/ratchetproof";
import { trackEvent } from "@/lib/telemetry-client";
import { AppleSegmentedTabs } from "@/components/editorial/apple-segmented-tabs";
import { IdeTextarea } from "@/components/editorial/ide-textarea";
import { TACTILE_CTA } from "@/components/editorial/signature";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GhostCard } from "@/components/editorial/signature";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Landmark,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Zap,
} from "lucide-react";

const SEVERITY_VARIANT: Record<FindingSeverity, "destructive" | "warning" | "accent"> = {
  blocking: "destructive",
  unmatched: "warning",
  advisory: "accent",
};

type InputTab = "interval" | "tariff" | "bills";

const INPUT_TABS: { key: InputTab; label: string }[] = [
  { key: "interval", label: "Interval data" },
  { key: "tariff", label: "Tariff" },
  { key: "bills", label: "Bills" },
];

function base64FromBytes(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return window.btoa(binary);
}

async function readDocument(file: File): Promise<{ name: string; contentType: string; base64: string }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return { name: file.name, contentType: file.type || "application/pdf", base64: base64FromBytes(bytes) };
}

function scenarioText(key: ScenarioKey) {
  const scenario = scenarioByKey(key);
  return {
    interval: scenario.intervalCsv,
    tariff: scenario.tariffJson,
    bills: scenario.billsCsv,
    seedHistory: scenario.seedHistory,
  };
}

export default function RatchetProofAudit({
  initialScenario = DEFAULT_SCENARIO,
}: {
  initialScenario?: ScenarioKey;
}) {
  const [initial] = React.useState(() => scenarioText(initialScenario));
  const [scenario, setScenario] = React.useState<ScenarioKey>(initialScenario);
  const [intervalText, setIntervalText] = React.useState(initial.interval);
  const [tariffText, setTariffText] = React.useState(initial.tariff);
  const [billsText, setBillsText] = React.useState(initial.bills);
  const [seedHistory, setSeedHistory] = React.useState(initial.seedHistory);
  const [tab, setTab] = React.useState<InputTab>("interval");
  const [report, setReport] = React.useState<AuditReport | null>(null);
  const [error, setError] = React.useState<{ message: string; ruleId?: string } | null>(null);
  const [busy, setBusy] = React.useState<"local" | "documents" | null>(null);
  const [documents, setDocuments] = React.useState<{ tariff: File | null; bills: File | null }>({
    tariff: null,
    bills: null,
  });

  React.useEffect(() => {
    trackEvent("page_view", undefined, "ratchetproof");
  }, []);

  const loadScenario = React.useCallback((key: ScenarioKey) => {
    const text = scenarioText(key);
    setScenario(key);
    setIntervalText(text.interval);
    setTariffText(text.tariff);
    setBillsText(text.bills);
    setSeedHistory(text.seedHistory);
    setReport(null);
    setError(null);
  }, []);

  const runAudit = () => {
    setBusy("local");
    setError(null);
    try {
      const result = auditFromText({
        intervalTexts: [intervalText],
        tariffText,
        billsText,
        seedHistory,
      });
      setReport(result.report);
      trackEvent(
        "audit_run",
        {
          verdict: result.report.verdict,
          months: result.report.months.length,
          carry_over_usd: result.report.carryOverMicroUsd / 1_000_000,
        },
        "ratchetproof",
      );
    } catch (caught) {
      setReport(null);
      if (caught instanceof RatchetProofFieldError) {
        setError({ message: caught.message, ruleId: caught.ruleId });
      } else {
        setError({ message: caught instanceof Error ? caught.message : "The audit failed." });
      }
    } finally {
      setBusy(null);
    }
  };

  const runFromDocuments = async () => {
    if (!documents.tariff) {
      setError({
        message:
          "Choose the tariff PDF first: the extraction path reads the tariff and the bills, and the interval data stays the paste box.",
      });
      return;
    }
    setBusy("documents");
    setError(null);
    try {
      const tariffDocument = await readDocument(documents.tariff);
      const billsDocument = documents.bills ? await readDocument(documents.bills) : null;
      const response = await fetch("/api/ratchetproof/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intervalText,
          tariffBase64: tariffDocument.base64,
          tariffName: tariffDocument.name,
          tariffMimeType: tariffDocument.contentType,
          ...(billsDocument
            ? {
                billsBase64: billsDocument.base64,
                billsName: billsDocument.name,
                billsMimeType: billsDocument.contentType,
              }
            : { billsText }),
          seedHistory,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        blocked?: boolean;
        data?: { report: AuditReport; labels: string[] };
        error?: string;
        ruleId?: string;
        missing?: string[];
        findings?: unknown[];
      };
      if (!response.ok || !payload.ok || !payload.data) {
        setReport(null);
        setError({
          message:
            payload.error ??
            `The audit endpoint answered ${response.status} without a report.`,
          ruleId: payload.ruleId,
        });
        return;
      }
      setReport(payload.data.report);
      trackEvent(
        "audit_run",
        { verdict: payload.data.report.verdict, source: "documents" },
        "ratchetproof",
      );
    } catch (caught) {
      setReport(null);
      setError({ message: caught instanceof Error ? caught.message : "The audit request failed." });
    } finally {
      setBusy(null);
    }
  };

  const downloadFindings = () => {
    if (!report) return;
    const blob = new Blob([report.findingSet], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ratchetproof-finding-set.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <GhostCard className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Landmark className="h-4 w-4 text-primary" aria-hidden="true" />
              Audit the billed demand
            </h2>
            <p className="mt-1 text-sm text-muted">
              Load a worked example or drop in your own export. The engine sums coincident meter
              intervals, applies the tariff&apos;s window and ratchet, and prices the gap between what
              the meter reached and what the bill charged.
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 font-mono text-[11px]">
            Σ intervals read = Σ intervals in file
          </Badge>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Worked examples">
          {SCENARIO_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => loadScenario(key)}
              aria-pressed={scenario === key}
              className={
                scenario === key
                  ? "rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
                  : "rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-black/[0.03]"
              }
            >
              {RATCHETPROOF_SCENARIOS[key].label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-subtle">{RATCHETPROOF_SCENARIOS[scenario].description}</p>

        <div className="mt-4">
          <AppleSegmentedTabs
            tabs={INPUT_TABS}
            value={tab}
            onChange={setTab}
            ariaLabel="Audit inputs"
          />
        </div>

        <div className="mt-3 space-y-3">
          {tab === "interval" ? (
            <IdeTextarea
              title="interval-export.csv"
              ariaLabel="Interval data (CSV or Green Button XML)"
              value={intervalText}
              onChange={(value) => {
                setIntervalText(value);
                setReport(null);
              }}
              rows={9}
              meta="meter_id → interval_start_utc → kW (or a wide export, or Green Button XML)"
              placeholder="meter_id,interval_start_utc,kw"
            />
          ) : null}
          {tab === "tariff" ? (
            <IdeTextarea
              title="tariff-declaration.json"
              ariaLabel="Tariff declaration (JSON with provenance)"
              value={tariffText}
              onChange={(value) => {
                setTariffText(value);
                setReport(null);
              }}
              rows={9}
              meta="every field carries value + provenance + page + quote"
              placeholder='{ "ratchetPercent": { "value": 75, "provenance": "extracted" } }'
            />
          ) : null}
          {tab === "bills" ? (
            <IdeTextarea
              title="bills.csv"
              ariaLabel="Bill figures (CSV)"
              value={billsText}
              onChange={(value) => {
                setBillsText(value);
                setReport(null);
              }}
              rows={7}
              meta="the bill's own printed figures — never recomputed"
              placeholder="month,period_start,period_end,printed_billed_demand_kw,..."
            />
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={runAudit} disabled={busy !== null} className={TACTILE_CTA}>
              <Zap className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Run the audit
            </Button>
            <Button
              variant="outline"
              onClick={() => loadScenario(scenario)}
              disabled={busy !== null}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Reset to the example
            </Button>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-medium text-muted">
              <span className="mb-1 block">Tariff PDF</span>
              <input
                type="file"
                accept="application/pdf"
                className="block w-44 text-xs text-muted"
                onChange={(event) =>
                  setDocuments((current) => ({
                    ...current,
                    tariff: event.target.files?.[0] ?? null,
                  }))
                }
              />
            </label>
            <label className="text-xs font-medium text-muted">
              <span className="mb-1 block">Bills PDF</span>
              <input
                type="file"
                accept="application/pdf"
                className="block w-44 text-xs text-muted"
                onChange={(event) =>
                  setDocuments((current) => ({
                    ...current,
                    bills: event.target.files?.[0] ?? null,
                  }))
                }
              />
            </label>
            <Button variant="outline" onClick={runFromDocuments} disabled={busy !== null}>
              <ScanLine className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Read PDFs &amp; audit
            </Button>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-foreground"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
              <div className="min-w-0">
                {error.ruleId ? (
                  <code className="block font-mono text-[11px] font-semibold text-destructive">
                    {error.ruleId}
                  </code>
                ) : null}
                <p className="break-words text-sm text-muted">{error.message}</p>
              </div>
            </div>
          </div>
        ) : null}
      </GhostCard>

      {report ? (
        <AuditResult report={report} onDownload={downloadFindings} />
      ) : (
        <GhostCard subtle className="p-4">
          <p className="text-sm text-muted">
            Nothing is audited until you run it. The worked example is a four-month, two-meter set:
            a 1,000 kW January peak, a 1,400 kW Saturday spike the tariff does not bill, and a 75%
            ratchet over a three-month lookback.
          </p>
        </GhostCard>
      )}

      <GhostCard subtle className="p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
          What this build does — and what it deliberately does not
        </h3>
        <p className="mt-1 text-xs text-muted">{COVERAGE_NOTE}</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-foreground">Implemented rule ids</span>
            <p className="mt-1 break-words font-mono text-[11px] text-subtle">
              {IMPLEMENTED_RULE_IDS.join(" · ")}
            </p>
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-foreground">Out of scope in v1</span>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted">
              {UNSUPPORTED_FAMILIES.map((family) => (
                <li key={family}>{family}</li>
              ))}
            </ul>
          </div>
        </div>
      </GhostCard>
    </div>
  );
}

function AuditResult({ report, onDownload }: { report: AuditReport; onDownload: () => void }) {
  const blocked = report.verdict === "blocked";
  return (
    <div className="space-y-5">
      <GhostCard className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {blocked ? (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  AUDIT BLOCKED
                </Badge>
              ) : (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  AUDIT COMPLETE
                </Badge>
              )}
              <span className="font-mono text-xs text-subtle">
                {report.totals.monthsAudited - report.totals.monthsBlocked}/{report.totals.monthsAudited} months
                verdict · {report.totals.intervalsRead.toLocaleString()} intervals read
              </span>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-foreground">
              {blocked
                ? `${report.totals.monthsBlocked} month${report.totals.monthsBlocked === 1 ? "" : "s"} withheld — no billed-demand verdict was assumed`
                : `The floor is ${formatKw(report.ledger.rows[0]?.billedKwMilli ?? 0)} on ${report.ledger.rows.length} billed month${report.ledger.rows.length === 1 ? "" : "s"}`}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {blocked
                ? "A tariff clause or a bill figure could not be read. The month is reported as blocked and carries no billed number — a 0% default would fabricate the floor this audit exists to price."
                : "Every figure below was computed by the deterministic engine. The model, when a PDF path is used, only filled declared fields."}
            </p>
          </div>
          <Button variant="outline" onClick={onDownload} className="shrink-0">
            <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Download the finding set
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Carry-over" value={formatMicros(report.carryOverMicroUsd)} mono />
          <Metric
            label="Shave saving"
            value={
              report.counterfactual ? formatMicros(report.counterfactual.savingMicroUsd) : "—"
            }
            mono
          />
          <Metric
            label="Billed ÷ metered"
            value={`${formatKw(report.totals.billedKwMilli)} ÷ ${formatKw(report.totals.meteredKwMilli)}`}
            mono
          />
          <Metric
            label="Intervals (read ÷ declared)"
            value={`${report.totals.intervalsRead.toLocaleString()} ÷ ${report.totals.intervalsDeclared.toLocaleString()}`}
            mono
          />
        </div>
      </GhostCard>

      <GhostCard className="p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-foreground">Per-month variance — recomputed vs billed</h3>
        <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2" role="list" aria-label="Monthly variance">
          {report.months.map((month) => (
            <li
              key={month.month}
              className="min-w-0 rounded-xl border border-border/80 bg-background/70 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold text-foreground">{month.month}</span>
                {month.blocked ? (
                  <Badge variant="destructive">blocked</Badge>
                ) : month.varianceKwMilli === 0 ? (
                  <Badge variant="success">exact</Badge>
                ) : (
                  <Badge variant="warning">{formatMicrosSigned(month.varianceMicroUsd ?? 0)}</Badge>
                )}
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                <dt className="text-subtle">Metered peak</dt>
                <dd className="text-right font-mono text-foreground">
                  {month.meteredPeakKwMilli === null ? "—" : formatKw(month.meteredPeakKwMilli)}
                </dd>
                <dt className="text-subtle">Recomputed</dt>
                <dd className="text-right font-mono text-foreground">
                  {month.recomputedBilledKwMilli === null ? "withheld" : formatKw(month.recomputedBilledKwMilli)}
                </dd>
                <dt className="text-subtle">Printed bill</dt>
                <dd className="text-right font-mono text-foreground">
                  {month.printedBilledKwMilli === null ? "not stated" : formatKw(month.printedBilledKwMilli)}
                </dd>
                <dt className="text-subtle">Variance</dt>
                <dd className="text-right font-mono text-foreground">
                  {month.varianceKwMilli === null ? "—" : formatKw(month.varianceKwMilli)}
                </dd>
                <dt className="text-subtle">Billed on</dt>
                <dd className="text-right text-foreground">
                  {month.binding === null ? "—" : month.binding.replace("_", " ")}
                </dd>
                <dt className="text-subtle">Ratchet floor</dt>
                <dd className="text-right font-mono text-foreground">
                  {month.ratchetFloorKwMilli === null ? "—" : formatKw(month.ratchetFloorKwMilli)}
                </dd>
              </dl>
              <p className="mt-2 break-words text-[11px] text-muted">{month.note}</p>
              {month.blocked && month.blockingRuleIds.length > 0 ? (
                <p className="mt-1 break-words font-mono text-[10px] text-destructive">
                  {month.blockingRuleIds.join(" · ")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </GhostCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GhostCard className="p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
            The peak event
          </h3>
          {report.floorEvent ? (
            <>
              <p className="mt-1 text-xs text-muted">
                The interval that set the ratchet floor — shaving this one interval re-prices every
                month the floor binds.
              </p>
              <p className="mt-2 font-mono text-lg font-semibold text-foreground">
                {formatKw(report.floorEvent.totalKwMilli)}
              </p>
              <p className="font-mono text-[11px] text-subtle">{report.floorEvent.startUtc}</p>
              <ul className="mt-2 space-y-1" role="list" aria-label="Loads in the peak interval">
                {report.floorEvent.byMeter.map((entry) => (
                  <li
                    key={entry.meterId}
                    className="flex items-center justify-between gap-2 rounded border border-border/70 bg-background/70 px-2 py-1 text-xs"
                  >
                    <span className="min-w-0 truncate text-foreground">{entry.meterId}</span>
                    <span className="shrink-0 font-mono text-foreground">{formatKw(entry.kwMilli)}</span>
                  </li>
                ))}
              </ul>
              {report.counterfactual ? (
                <p className="mt-2 text-xs text-muted">
                  Shaving it by{" "}
                  <span className="font-mono text-foreground">
                    {formatKw(report.counterfactual.shaveKwMilli)}
                  </span>{" "}
                  saves{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {formatMicros(report.counterfactual.savingMicroUsd)}
                  </span>{" "}
                  across {report.counterfactual.monthsAffected.length} month
                  {report.counterfactual.monthsAffected.length === 1 ? "" : "s"}.
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">
              No ratchet-bound month, so there is no floor event to price.
            </p>
          )}
        </GhostCard>

        <GhostCard className="p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
            What the tariff did not bill
          </h3>
          {report.ignoredPeakEvent ? (
            <>
              <p className="mt-2 font-mono text-lg font-semibold text-foreground">
                {formatKw(report.ignoredPeakEvent.totalKwMilli)}
              </p>
              <p className="font-mono text-[11px] text-subtle">
                {report.ignoredPeakEvent.startUtc} · outside the billed window
              </p>
              <p className="mt-2 text-xs text-muted">
                The highest interval in the series is larger than every billed peak, and it sets
                nothing: a spike outside the tariff&apos;s days and hours is not billed demand.
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">
              Every interval in the series falls inside the billed window.
            </p>
          )}
          <p className="mt-3 text-[11px] text-subtle">
            Site peak ({report.sitePeakEvent?.startUtc ?? "—"}):{" "}
            <span className="font-mono">
              {report.sitePeakEvent ? formatKw(report.sitePeakEvent.totalKwMilli) : "—"}
            </span>
          </p>
        </GhostCard>
      </div>

      <GhostCard className="p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-foreground">The ratchet ledger</h3>
        <p className="mt-1 text-xs text-muted">
          Carry-over is (billed − metered) × the month&apos;s demand rate: the dollars charged for
          demand the site did not use.
        </p>
        {report.ledger.rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No ledger row could be priced — every month is blocked or has no declared rate.
          </p>
        ) : (
          <ul className="mt-3 space-y-2" role="list" aria-label="Ratchet ledger">
            {report.ledger.rows.map((row) => (
              <li
                key={row.month}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-border/70 bg-background/70 px-3 py-2"
              >
                <span className="font-mono text-xs font-semibold text-foreground">{row.month}</span>
                <span className="min-w-0 text-[11px] text-muted">
                  {formatKw(row.meteredKwMilli)} metered · {formatKw(row.billedKwMilli)} billed ·{" "}
                  {formatRate(row.rateMicroUsdPerKw)} ({row.rateSource})
                </span>
                <span className="font-mono text-xs font-semibold text-foreground">
                  {formatMicros(row.carryMicroUsd)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </GhostCard>

      <GhostCard className="p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-foreground">Findings</h3>
        {report.findings.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Zero findings: every recomputed month agrees with the bill it was charged.
          </p>
        ) : (
          <ul className="mt-3 space-y-2" role="list" aria-label="Findings">
            {report.findings.map((finding, index) => (
              <li
                key={`${finding.ruleId}-${finding.scope}-${index}`}
                className="min-w-0 rounded-xl border border-border/70 bg-background/70 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={SEVERITY_VARIANT[finding.severity]}>{finding.severity}</Badge>
                  <code className="break-all font-mono text-[11px] text-foreground">{finding.ruleId}</code>
                  <span className="break-all font-mono text-[11px] text-subtle">{finding.scope}</span>
                </div>
                <p className="mt-1 text-xs text-muted">{finding.message}</p>
                <p className="mt-1 text-[11px] text-subtle">{finding.fix}</p>
              </li>
            ))}
          </ul>
        )}
      </GhostCard>

      <GhostCard subtle className="p-3">
        <p className="break-words font-mono text-[10px] text-subtle">
          {report.engine.id} v{report.engine.version} · computedBy={report.provenance.computedBy} ·
          tariff={report.provenance.tariffSource} · labels: {report.labels.slice(0, 6).join(", ")}
          {report.labels.length > 6 ? ` … (+${report.labels.length - 6})` : ""}
        </p>
      </GhostCard>
    </div>
  );
}

function Metric({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-border/80 bg-background/80 p-2.5">
      <span className="block text-[10px] font-medium uppercase tracking-wide text-subtle">{label}</span>
      <span className={mono ? "mt-1 block font-mono text-sm font-semibold text-foreground" : "mt-1 block text-sm font-semibold text-foreground"}>
        {value}
      </span>
    </div>
  );
}
