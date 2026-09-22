"use client";

import * as React from "react";
import {
  DEFAULT_SCENARIO,
  SCENARIO_KEYS_NOTE,
  SCENARIOS,
  caseFor,
  caseToJson,
  type ScenarioKey,
} from "@/lib/calc/caseproof/fixtures";
import {
  CaseProofInputError,
  auditCase,
  formatLeverValue,
  formatMonths,
  formatPct,
  formatUsd,
  readCaseInput,
  type AssumptionFinding,
  type CaseProofReport,
} from "@/lib/calc/caseproof";
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
  ArrowDown,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

export interface CaseProofCalculatorProps {
  initialScenario?: ScenarioKey;
}

const VERDICT_VARIANT: Record<AssumptionFinding["verdict"], "success" | "destructive" | "warning" | "accent"> = {
  pass: "success",
  fail: "destructive",
  unstated: "warning",
  unverifiable: "accent",
};

const STATUS_VARIANT: Record<CaseProofReport["audit"]["verdict"]["status"], "success" | "destructive" | "warning"> = {
  clears: "success",
  fails: "destructive",
  blocked: "warning",
};

function scenarioText(key: ScenarioKey) {
  const scenario = caseFor(key);
  return {
    key,
    label: SCENARIOS.find((entry) => entry.key === key)?.label ?? key,
    caseJson: caseToJson(key),
    quoteCsv: scenario.options[0]?.quoteCsv ?? "",
  };
}

export default function CaseProofCalculator({ initialScenario = DEFAULT_SCENARIO }: CaseProofCalculatorProps) {
  const [initial] = React.useState(() => scenarioText(initialScenario));
  const [caseJson, setCaseJson] = React.useState(initial.caseJson);
  const [quoteCsv, setQuoteCsv] = React.useState(initial.quoteCsv);
  const [report, setReport] = React.useState<CaseProofReport | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    trackEvent("page_view", undefined, "caseproof");
  }, []);

  const runAudit = () => {
    try {
      const parsed = JSON.parse(caseJson) as Record<string, unknown>;
      const options = Array.isArray(parsed.options) ? [...(parsed.options as Record<string, unknown>[])] : [];
      if (options[0] && quoteCsv.trim()) {
        // The quote box is the vendor's own document: its rows are echoed into the bid under audit.
        options[0] = { ...options[0], quoteCsv };
      }
      const input = readCaseInput({ ...parsed, options });
      const result = auditCase(input);
      setReport(result);
      setError(null);
      trackEvent(
        "audit_click",
        {
          status: result.audit.verdict.status,
          paybackMonths: result.audit.buyerRun.paybackMonths,
          vendorClaimPaybackMonths: result.audit.vendorRun.result?.paybackMonths ?? null,
          unstated: result.audit.unstated.length,
          findings: result.audit.findings.length,
          compared: result.comparison?.results.length ?? 0,
        },
        "caseproof",
      );
    } catch (runError) {
      setReport(null);
      if (runError instanceof CaseProofInputError) {
        setError(`${runError.ruleId} at ${runError.fieldPath} — ${runError.message}`);
      } else {
        setError(
          runError instanceof Error
            ? `The audit failed: ${runError.message}. Nothing was audited.`
            : "The audit failed unexpectedly.",
        );
      }
    }
  };

  const loadScenario = (key: ScenarioKey) => {
    const text = scenarioText(key);
    setCaseJson(text.caseJson);
    setQuoteCsv(text.quoteCsv);
    setReport(null);
    setError(null);
  };

  const readFile = async (file: File, setter: (value: string) => void) => {
    try {
      setter(await file.text());
      setReport(null);
      setError(null);
    } catch (readError) {
      setError(`Could not read ${file.name}: ${readError instanceof Error ? readError.message : "unknown error"}`);
    }
  };

  const downloadPack = () => {
    if (!report) return;
    const blob = new Blob([report.audit.decisionPack.csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `caseproof-decision-pack-${report.audit.buyerRun.depreciation.rule.taxYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    trackEvent(
      "export_click",
      {
        status: report.audit.verdict.status,
        paybackMonths: report.audit.buyerRun.paybackMonths,
      },
      "caseproof",
    );
  };

  const audit = report?.audit ?? null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>1 &middot; The vendor&apos;s quote, line by line</CardTitle>
          <CardDescription>
            Paste or upload the quote&apos;s own line items as CSV rows. Every value is echoed as the
            vendor wrote it — CaseProof never re-prices a line, and a line the quote leaves blank is
            reported unpriced, not $0.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
            Quote line items (CSV)
            <textarea
              value={quoteCsv}
              onChange={(event) => {
                setQuoteCsv(event.target.value);
                setReport(null);
              }}
              rows={7}
              spellCheck={false}
              placeholder="item,amount_usd,category,note"
              className="w-full rounded border border-border bg-background p-3 font-mono text-xs leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded border border-border bg-background px-3 py-2 text-xs text-muted hover:text-foreground">
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              <span>Upload quote CSV</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void readFile(file, setQuoteCsv);
                }}
              />
            </label>
            <span className="text-xs text-subtle">Header: item, amount_usd, optional category and note.</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2 &middot; Your case</CardTitle>
          <CardDescription>
            The bid structure, your staffing sheet and your tax position as JSON. Money is integer
            cents; a term you do not state is reported unstated and blocks a pass — it is never
            filled in for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
            Case (JSON)
            <textarea
              value={caseJson}
              onChange={(event) => {
                setCaseJson(event.target.value);
                setReport(null);
              }}
              rows={12}
              spellCheck={false}
              className="w-full rounded border border-border bg-background p-3 font-mono text-xs leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={runAudit} disabled={!caseJson.trim()}>
              <ShieldCheck className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Audit the case
            </Button>
            {SCENARIOS.map((scenario) => (
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
            <label className="flex cursor-pointer items-center gap-2 rounded border border-border bg-background px-3 py-2 text-xs text-muted hover:text-foreground">
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              <span>Upload case JSON</span>
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void readFile(file, setCaseJson);
                }}
              />
            </label>
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

        {audit && report ? (
          <>
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>3 &middot; The verdict</CardTitle>
                  <CardDescription>{audit.verdict.headline}</CardDescription>
                </div>
                <Badge variant={STATUS_VARIANT[audit.verdict.status]}>{audit.verdict.status}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {[
                    [
                      "Vendor's claimed payback",
                      audit.claimedPaybackMonths === null
                        ? "no payback claimed"
                        : formatMonths(audit.claimedPaybackMonths),
                    ],
                    [
                      "Proposal re-run on its own assumptions",
                      audit.vendorRun.result
                        ? formatMonths(audit.vendorRun.result.paybackMonths)
                        : (audit.vendorRun.reason ?? "—"),
                    ],
                    ["Your numbers", formatMonths(audit.buyerRun.paybackMonths)],
                  ].map(([label, value]) => (
                    <div key={label as string} className="rounded border border-border p-3">
                      <dt className="text-xs text-muted">{label as string}</dt>
                      <dd className="font-mono text-sm font-semibold text-foreground">{value as string}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="muted">
                    {audit.baselineSummary.totalHeadcount.toLocaleString("en-US")} FTE ·{" "}
                    {formatUsd(audit.baselineSummary.annualLoadedCostCents)}/yr fully loaded
                  </Badge>
                  <Badge variant="outline">
                    {audit.baselineSummary.linesPerYear.toLocaleString("en-US")} lines/yr
                  </Badge>
                  <Badge variant="outline">discounted at {formatPct(audit.hurdleRatePct)}</Badge>
                </div>
                {audit.verdict.reasons.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
                    {audit.verdict.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="flex items-start gap-2 text-sm text-success">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Every assumption the case depends on is stated, and the case clears the hurdle on your numbers.</span>
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>4 &middot; What moved the payback</CardTitle>
                  <CardDescription>
                    The vendor&apos;s assumptions re-run first, then your own applied one group at a
                    time. The chain ends on the audited payback, so no month of the gap is unexplained.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={downloadPack}>
                  <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Decision pack (CSV)
                </Button>
              </CardHeader>
              <CardContent>
                {audit.drivers.length === 0 ? (
                  <p className="text-sm text-muted">
                    The vendor&apos;s own basis could not be re-run, so there is no chain to show:{" "}
                    {audit.vendorRun.reason ?? "the proposal states no assumptions to reproduce."}
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {audit.drivers.map((driver) => (
                      <li key={driver.field} className="rounded border border-border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-medium text-foreground">{driver.label}</span>
                          <Badge
                            variant={
                              driver.addedMonths === null
                                ? "muted"
                                : driver.addedMonths > 0
                                  ? "warning"
                                  : "success"
                            }
                          >
                            {driver.addedMonths === null
                              ? "no payback inside the horizon"
                              : `${driver.addedMonths > 0 ? "+" : ""}${driver.addedMonths} months`}
                          </Badge>
                        </div>
                        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                          {[
                            ["Payback before", formatMonths(driver.paybackBeforeMonths)],
                            ["Payback after", formatMonths(driver.paybackAfterMonths)],
                            ["From", formatLeverValue(driver.fromValue, driver.unit)],
                            ["To", formatLeverValue(driver.toValue, driver.unit)],
                          ].map(([label, value]) => (
                            <div key={label}>
                              <dt className="text-subtle">{label}</dt>
                              <dd className="font-mono text-foreground">{value}</dd>
                            </div>
                          ))}
                        </dl>
                        <p className="mt-2 text-xs text-subtle">{driver.detail}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5 &middot; The loaded labour rate</CardTitle>
                <CardDescription>
                  {audit.buyerRun.labour.notes.join(" ")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-hidden rounded border border-border">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-background text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th scope="col" className="px-3 py-2">Component</th>
                        <th scope="col" className="px-3 py-2">$ per hour</th>
                        <th scope="col" className="px-3 py-2">How it is derived</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audit.buyerRun.labour.components.map((component) => (
                        <tr key={component.key} className="border-t border-border">
                          <td className="px-3 py-2 text-foreground">{component.label}</td>
                          <td className="px-3 py-2 font-mono text-xs text-foreground">
                            {(component.centsPerHour / 100).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-xs text-muted">{component.basis}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-border">
                        <td className="px-3 py-2 font-medium text-foreground">Fully loaded rate</td>
                        <td className="px-3 py-2 font-mono text-xs font-semibold text-foreground">
                          {(audit.buyerRun.labour.centsPerHour / 100).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted">
                          {audit.buyerRun.labour.floorOnly
                            ? "a floor: at least one component is unstated"
                            : "weighted across the staffing sheet by paid hours"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {audit.buyerRun.labour.gapCents !== null ? (
                  <p className="text-xs text-subtle">
                    The vendor&apos;s case prices labour at{" "}
                    {formatLeverValue((audit.buyerRun.labour.vendorAssumedHourlyRateCents ?? 0) / 100, "usd_per_hour")};
                    the gap is {formatLeverValue(audit.buyerRun.labour.gapCents / 100, "usd_per_hour")} per hour.
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>6 &middot; After-tax cash flow, by tax year</CardTitle>
                <CardDescription>
                  §179 first, then bonus depreciation, then the payments and the amortized one-time
                  lines — each tax year read against the rule cited for it, never one blended deduction.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    ["Payback", formatMonths(audit.buyerRun.paybackMonths)],
                    ["NPV at your hurdle", formatUsd(audit.buyerRun.npvCents)],
                    ["IRR", audit.buyerRun.irrPct === null ? "no sign change" : formatPct(audit.buyerRun.irrPct)],
                    ["Upfront outlay", formatUsd(audit.buyerRun.upfrontCents)],
                  ].map(([label, value]) => (
                    <div key={label as string} className="rounded border border-border p-3">
                      <dt className="text-xs text-muted">{label as string}</dt>
                      <dd className="font-mono text-sm font-semibold text-foreground">{value as string}</dd>
                    </div>
                  ))}
                </dl>
                <div className="overflow-hidden rounded border border-border">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-background text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th scope="col" className="px-3 py-2">Tax year</th>
                        <th scope="col" className="px-3 py-2">Net cash</th>
                        <th scope="col" className="px-3 py-2">Cumulative</th>
                        <th scope="col" className="px-3 py-2">Labour removed</th>
                        <th scope="col" className="px-3 py-2">Costs</th>
                        <th scope="col" className="px-3 py-2">Tax benefit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audit.buyerRun.years.map((year) => (
                        <tr key={year.year} className="border-t border-border">
                          <td className="px-3 py-2 font-mono text-xs text-foreground">{year.taxYear}</td>
                          <td className="px-3 py-2 font-mono text-xs text-foreground">{formatUsd(year.netCents)}</td>
                          <td className="px-3 py-2 font-mono text-xs text-muted">{formatUsd(year.cumulativeCents)}</td>
                          <td className="px-3 py-2 font-mono text-xs text-muted">
                            {formatUsd(year.labourSavingCents + year.downtimeCents + year.errorSavingCents)}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-muted">
                            {formatUsd(year.maintenanceCents + year.softwareCents + year.leasePaymentCents + year.debtServiceCents)}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-muted">{formatUsd(year.taxBenefitCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-xs text-subtle">
                  <p className="mb-1 font-medium uppercase tracking-wide text-muted">Depreciation by tax year</p>
                  <p className="mb-2 text-subtle">
                    Rule: {audit.buyerRun.depreciation.rule.source}
                  </p>
                  <ul className="space-y-1">
                    {audit.buyerRun.depreciation.years.map((year) => (
                      <li key={year.taxYear} className="font-mono">
                        {year.taxYear}: §179 {formatUsd(year.section179Cents)} · bonus {formatUsd(year.bonusCents)} ·
                        straight-line {formatUsd(year.straightLineCents)}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>7 &middot; Confirm in writing before signature</CardTitle>
                <CardDescription>
                  Every assumption the case depends on, with the value at which it stops clearing
                  your hurdle rate. Riskiest first: the ones with the least margin lead.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {audit.confirmInWriting.map((finding) => (
                    <li key={finding.field} className="rounded border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">{finding.label}</span>
                        <Badge variant={VERDICT_VARIANT[finding.verdict]}>{finding.verdict}</Badge>
                      </div>
                      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                        {[
                          ["Your value", finding.buyerValue === null ? "unstated" : formatLeverValue(finding.buyerValue, finding.unit)],
                          ["Vendor's assumption", finding.vendorValue === null ? "not stated" : formatLeverValue(finding.vendorValue, finding.unit)],
                          ["Break-even", finding.breakEvenValue === null ? "no crossing in range" : formatLeverValue(finding.breakEvenValue, finding.unit)],
                          ["Margin", finding.headroomPct === null ? "—" : `${finding.headroomPct > 0 ? "+" : ""}${finding.headroomPct.toFixed(1)}%`],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <dt className="text-subtle">{label}</dt>
                            <dd className="break-words font-mono text-foreground">{value}</dd>
                          </div>
                        ))}
                      </dl>
                      <p className="mt-2 text-xs text-muted">{finding.message}</p>
                      <p className="mt-1 text-xs text-subtle">Action: {finding.action}</p>
                    </li>
                  ))}
                </ul>
                {audit.unstated.length > 0 ? (
                  <div className="mt-4 rounded border border-warning p-3">
                    <p className="text-sm font-medium text-warning">
                      Unstated lines — these block a pass verdict
                    </p>
                    <ul className="mt-2 space-y-2 text-xs text-muted">
                      {audit.unstated.map((field) => (
                        <li key={field.field}>
                          <span className="font-mono text-foreground">{field.field}</span> — {field.detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {report.comparison ? (
              <Card>
                <CardHeader>
                  <CardTitle>8 &middot; The bids on one cash model</CardTitle>
                  <CardDescription>
                    Ranked by NPV at your hurdle rate, with the point at which the ranking flips and
                    the sensitivity grid the capital committee will ask for.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="overflow-hidden rounded border border-border">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead className="bg-background text-xs uppercase tracking-wide text-muted">
                        <tr>
                          <th scope="col" className="px-3 py-2">Rank</th>
                          <th scope="col" className="px-3 py-2">Bid</th>
                          <th scope="col" className="px-3 py-2">NPV at hurdle</th>
                          <th scope="col" className="px-3 py-2">Per order</th>
                          <th scope="col" className="px-3 py-2">Payback</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.comparison.ranking.map((entry) => {
                          const result = report.comparison!.results.find((item) => item.id === entry.id);
                          return (
                            <tr key={entry.id} className="border-t border-border">
                              <td className="px-3 py-2 font-mono text-xs text-foreground">{entry.rank}</td>
                              <td className="px-3 py-2 text-foreground">{entry.vendor}</td>
                              <td className="px-3 py-2 font-mono text-xs text-foreground">{formatUsd(entry.npvCents)}</td>
                              <td className="px-3 py-2 font-mono text-xs text-muted">
                                {entry.costPerOrderCents === null ? "—" : formatUsd(entry.costPerOrderCents)}
                              </td>
                              <td className="px-3 py-2 font-mono text-xs text-muted">
                                {formatMonths(result?.paybackMonths ?? null)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {report.comparison.crossings.length > 0 ? (
                    <ul className="space-y-2 text-xs text-muted">
                      {report.comparison.crossings.map((crossing) => (
                        <li key={`${crossing.pair.join("-")}-${crossing.axis}`} className="rounded border border-border p-3">
                          <span className="block text-foreground">{crossing.statement}</span>
                          <span className="mt-1 block font-mono text-subtle">{crossing.axis} = {crossing.value}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted">
                      No ranking flip was found inside the tested ranges of the peak premium, the
                      maintenance load or the hurdle rate — one bid leads throughout.
                    </p>
                  )}
                  <div className="overflow-hidden rounded border border-border">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead className="bg-background text-xs uppercase tracking-wide text-muted">
                        <tr>
                          <th scope="col" className="px-3 py-2">Scenario</th>
                          <th scope="col" className="px-3 py-2">Ranking (best first)</th>
                          <th scope="col" className="px-3 py-2">Leader flips</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.comparison.sensitivity.map((cell) => (
                          <tr key={cell.label} className="border-t border-border">
                            <td className="px-3 py-2 text-foreground">{cell.label}</td>
                            <td className="break-all px-3 py-2 font-mono text-xs text-muted">{cell.ranking.join(" > ")}</td>
                            <td className="px-3 py-2 text-xs">
                              {cell.changedLeader ? (
                                <Badge variant="warning">flips</Badge>
                              ) : (
                                <span className="text-subtle">holds</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>Coverage — what this audit does and does not claim</CardTitle>
                <CardDescription>{audit.coverage.note}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Implemented rule ids</p>
                  <p className="font-mono text-xs text-muted">{audit.coverage.implementedRuleIds.join(", ")}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
                    Not implemented in v1 (never reported as a pass)
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
                    {audit.coverage.unsupportedFamilies.map((family) => (
                      <li key={family}>{family}</li>
                    ))}
                  </ul>
                </div>
                <p className="flex items-start gap-2 text-xs text-subtle">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    Deterministic core: no LLM call and no network request audits your case — the
                    engine runs in this page, and the same engine answers{" "}
                    <code className="font-mono">/api/agent/calculate</code> for agents. The decision
                    pack is the CSV above; a paid branded export and Stripe checkout are not part of
                    v1.
                  </span>
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="flex items-start gap-2 pt-6 text-sm text-muted">
              <ArrowDown className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Pick a worked scenario or paste your own case, then run the audit. Nothing is
                calculated until you ask for it.
              </span>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
