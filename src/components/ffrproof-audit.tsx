"use client";

import * as React from "react";
import {
  DEFAULT_SCENARIO_RECORD,
  auditFfr,
  formatBps,
  formatCents,
  formatCentsSigned,
  readCompositeInput,
  toAuditInput,
  type FfrAuditReport,
  type FfrVerdict,
} from "@/lib/calc/ffrproof";
import { trackEvent } from "@/lib/telemetry-client";
import { AppleSegmentedTabs } from "@/components/editorial/apple-segmented-tabs";
import { IdeInset } from "@/components/editorial/ide-inset";
import { IdeTextarea } from "@/components/editorial/ide-textarea";
import { GhostCard, TACTILE_CTA } from "@/components/editorial/signature";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, FileText, RefreshCw, ShieldCheck } from "lucide-react";

type Mode = "declared" | "upload";

const SAMPLE_JSON = JSON.stringify(DEFAULT_SCENARIO_RECORD, null, 2);
const SAMPLE_REPORT_JSON = JSON.stringify(DEFAULT_SCENARIO_RECORD.report, null, 2);
const SAMPLE_GL_CSV = DEFAULT_SCENARIO_RECORD.glCsv as string;
const SAMPLE_BUDGET_CSV = DEFAULT_SCENARIO_RECORD.budgetCsv as string;

const VERDICT_LABEL: Record<FfrVerdict, string> = {
  clean: "CLEAN",
  findings: "FINDINGS",
  blocked: "BLOCKED",
};

const VERDICT_STYLE: Record<FfrVerdict, string> = {
  clean: "bg-success/10 text-success border-success/30",
  findings: "bg-warning/10 text-warning border-warning/30",
  blocked: "bg-destructive/10 text-destructive border-destructive/30",
};

const SEVERITY_STYLE: Record<string, string> = {
  blocking: "bg-destructive/10 text-destructive border-destructive/30",
  unmatched: "bg-warning/10 text-warning border-warning/30",
  advisory: "bg-muted/10 text-muted border-border",
};

export default function FFRProofAudit() {
  const [mode, setMode] = React.useState<Mode>("declared");
  const [declaredText, setDeclaredText] = React.useState<string>(SAMPLE_JSON);
  const [reportText, setReportText] = React.useState<string>(SAMPLE_REPORT_JSON);
  const [glText, setGlText] = React.useState<string>(SAMPLE_GL_CSV);
  const [budgetText, setBudgetText] = React.useState<string>(SAMPLE_BUDGET_CSV);
  const [priorText, setPriorText] = React.useState<string>("");
  const [report, setReport] = React.useState<FfrAuditReport | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    trackEvent("page_view", undefined, "ffrproof");
  }, []);

  const runDeterministic = (composite: unknown) => {
    setLoading(true);
    setError(null);
    try {
      const parsed = readCompositeInput(composite);
      const result = auditFfr(toAuditInput(parsed));
      setReport(result);
    } catch (err) {
      setReport(null);
      setError(err instanceof Error ? err.message : "The pre-flight failed.");
    } finally {
      setLoading(false);
    }
  };

  const readFileAsBase64 = async (file: File) => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("Could not read the file as base64."));
          return;
        }
        resolve(result.split(",")[1] ?? result);
      };
      reader.onerror = () => reject(new Error("Could not read the file."));
      reader.readAsDataURL(file);
    });
    return base64;
  };

  const onAudit = async () => {
    if (mode === "declared") {
      if (!declaredText.trim()) {
        setError("Paste the declared composite JSON first, or press Load sample.");
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(declaredText);
      } catch {
        setError("The declared composite is not valid JSON. Nothing was audited.");
        return;
      }
      runDeterministic(parsed);
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const awardInput = document.getElementById("ffrproof-award-file") as HTMLInputElement | null;
      const drawdownInput = document.getElementById("ffrproof-drawdown-file") as HTMLInputElement | null;
      const awardFile = awardInput?.files?.[0];
      const drawdownFile = drawdownInput?.files?.[0];
      if (!awardFile || !drawdownFile) {
        setError("Upload both the award terms and the drawdown statement, then audit.");
        setLoading(false);
        return;
      }
      let reportJson: unknown;
      try {
        reportJson = JSON.parse(reportText);
      } catch {
        setError("The report (worksheet) is not valid JSON. Nothing was audited.");
        setLoading(false);
        return;
      }
      if (!glText.trim() || !budgetText.trim()) {
        setError("The GL export and the approved budget (CSV) are both required.");
        setLoading(false);
        return;
      }
      let priorReport: unknown = null;
      if (priorText.trim()) {
        try {
          priorReport = JSON.parse(priorText);
        } catch {
          setError("The prior filing is not valid JSON. Nothing was audited.");
          setLoading(false);
          return;
        }
      }
      const [awardBase64, drawdownBase64] = await Promise.all([
        readFileAsBase64(awardFile),
        readFileAsBase64(drawdownFile),
      ]);
      const response = await fetch("/api/ffrproof/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          awardTermsBase64: awardBase64,
          awardTermsName: awardFile.name,
          drawdownBase64: drawdownBase64,
          drawdownName: drawdownFile.name,
          report: reportJson,
          glCsv: glText,
          budgetCsv: budgetText,
          priorReport,
        }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        blocked?: boolean;
        error?: string;
        data?: { report: FfrAuditReport };
      };
      if (!response.ok) {
        setError(json.error ?? `The audit endpoint answered ${response.status}.`);
        return;
      }
      if (!json.data?.report) {
        setError("The audit returned no report. Nothing was computed.");
        return;
      }
      setReport(json.data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The upload audit failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <AppleSegmentedTabs<Mode>
          ariaLabel="FFRProof input mode"
          value={mode}
          onChange={setMode}
          tabs={[
            { key: "declared", label: "Declared fields" },
            { key: "upload", label: "Upload terms + drawdown" },
          ]}
        />

        {mode === "upload" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 rounded-xl border border-dashed border-border bg-background/60 p-4">
              <span className="text-xs font-semibold text-foreground">Award terms / notice of award (PDF)</span>
              <input id="ffrproof-award-file" type="file" accept="application/pdf" className="text-xs text-muted" />
            </label>
            <label className="flex flex-col gap-1 rounded-xl border border-dashed border-border bg-background/60 p-4">
              <span className="text-xs font-semibold text-foreground">Drawdown statement (PDF)</span>
              <input id="ffrproof-drawdown-file" type="file" accept="application/pdf" className="text-xs text-muted" />
            </label>
          </div>
        ) : null}

        {mode === "declared" ? (
          <IdeTextarea
            title="ffrproof-composite.json"
            ariaLabel="Declared composite JSON"
            meta="report + award terms + drawdown + GL + budget, declared fields"
            value={declaredText}
            onChange={setDeclaredText}
            rows={14}
            placeholder='{ "report": { … }, "awardTerms": { … }, "drawdown": { … }, "glCsv": "…", "budgetCsv": "…" }'
          />
        ) : (
          <div className="space-y-3">
            <IdeTextarea
              title="report.json"
              ariaLabel="SF-425 worksheet JSON"
              meta="lines 10a–10k, integer cents"
              value={reportText}
              onChange={setReportText}
              rows={10}
            />
            <IdeTextarea
              title="gl-export.csv"
              ariaLabel="GL export CSV"
              meta="category,actual_usd"
              value={glText}
              onChange={setGlText}
              rows={4}
            />
            <IdeTextarea
              title="approved-budget.csv"
              ariaLabel="Approved budget CSV"
              meta="category,approved_usd"
              value={budgetText}
              onChange={setBudgetText}
              rows={4}
            />
            <IdeTextarea
              title="prior-report.json (optional)"
              ariaLabel="Prior filing JSON"
              meta="leave empty for a first filing"
              value={priorText}
              onChange={setPriorText}
              rows={6}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onAudit} disabled={loading} className={TACTILE_CTA}>
            {loading ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" />
            )}
            {mode === "upload" ? "Extract and audit" : "Run the pre-flight"}
          </Button>
          {mode === "declared" ? (
            <Button variant="outline" onClick={() => setDeclaredText(SAMPLE_JSON)}>
              Load sample
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {report ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs font-semibold ${VERDICT_STYLE[report.verdict]}`}
            >
              {report.verdict === "clean" ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              {VERDICT_LABEL[report.verdict]}
            </span>
            <span className="font-mono text-xs text-muted">
              {report.crossFoot.lines.filter((l) => l.holds).length}/{report.crossFoot.lines.length}{" "}
              cross-foot · {report.findings.length} finding{report.findings.length === 1 ? "" : "s"}
            </span>
            {report.blockedFindingScopes.length > 0 ? (
              <Badge variant="warning">{report.blockedFindingScopes.length} BLOCKED CHECK</Badge>
            ) : null}
          </div>

          <GhostCard>
            <div className="space-y-3 p-4">
              <h3 className="text-sm font-semibold text-foreground">The four line identities</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-subtle">
                      <th className="py-2 pr-3 font-medium">Identity</th>
                      <th className="py-2 pr-3 font-medium">As filed</th>
                      <th className="py-2 pr-3 font-medium">Re-derived</th>
                      <th className="py-2 pr-3 font-medium">Difference</th>
                      <th className="py-2 font-medium">Cross-foots</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.crossFoot.lines.map((line) => (
                      <tr key={line.formLine} className="border-b border-border/60">
                        <td className="py-2 pr-3 font-mono text-foreground">{line.identity}</td>
                        <td className="py-2 pr-3 font-mono text-muted">{formatCents(line.lhsCents)}</td>
                        <td className="py-2 pr-3 font-mono text-muted">{formatCents(line.rhsCents)}</td>
                        <td className="py-2 pr-3 font-mono">
                          {line.holds ? (
                            <span className="text-success">$0.00</span>
                          ) : (
                            formatCentsSigned(line.differenceCents)
                          )}
                        </td>
                        <td className="py-2 text-muted">{line.holds ? "✓" : "✗"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </GhostCard>

          <GhostCard>
            <div className="space-y-2 p-4">
              <h3 className="text-sm font-semibold text-foreground">Cash reconciliation — 10a / 10b vs the drawdown statement</h3>
              <div className="grid grid-cols-1 gap-2 text-xs text-muted sm:grid-cols-3">
                <div>
                  <span className="font-semibold text-foreground">10a receipts</span>
                  <p className="font-mono">
                    report {formatCents(report.cashRecon.reportReceiptsCents)} · statement{" "}
                    {formatCents(report.cashRecon.statementReceiptsCents)}
                  </p>
                  <p className="font-mono">
                    drift{" "}
                    {report.cashRecon.receiptsDriftCents === 0 ? (
                      <span className="text-success">$0.00</span>
                    ) : (
                      formatCentsSigned(report.cashRecon.receiptsDriftCents)
                    )}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-foreground">10b disbursements</span>
                  <p className="font-mono">
                    report {formatCents(report.cashRecon.reportDisbursementsCents)} · statement{" "}
                    {formatCents(report.cashRecon.statementDisbursementsCents)}
                  </p>
                  <p className="font-mono">
                    drift{" "}
                    {report.cashRecon.disbursementsDriftCents === 0 ? (
                      <span className="text-success">$0.00</span>
                    ) : (
                      formatCentsSigned(report.cashRecon.disbursementsDriftCents)
                    )}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-foreground">By subaccount</span>
                  {report.cashRecon.bySubaccount.map((s) => (
                    <p key={s.subaccount} className="font-mono">
                      {s.subaccount}: {formatCents(s.receiptsCents)} / {formatCents(s.disbursementsCents)}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </GhostCard>

          <GhostCard>
            <div className="space-y-2 p-4">
              <h3 className="text-sm font-semibold text-foreground">Match position — required vs provided vs remaining</h3>
              <p className="text-xs text-muted">
                10i {formatCents(report.match.requiredRecipientShareCents)} · 10j{" "}
                {formatCents(report.match.recipientShareProvidedCents)} · 10k{" "}
                {formatCents(report.match.remainingRecipientShareCents)}
                {report.match.requiredMatchPercentBps !== null
                  ? ` · required ${formatBps(report.match.requiredMatchPercentBps)}`
                  : " · required match % not stated"}
              </p>
            </div>
          </GhostCard>

          <GhostCard>
            <div className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Budget variance</h3>
                <span className="font-mono text-xs text-subtle">
                  Σ {formatCentsSigned(report.budget.totalVarianceCents)}
                  {report.budget.thresholdStated
                    ? ` · threshold ${formatBps(report.budget.priorApprovalThresholdBps ?? 0)}`
                    : " · threshold unstated"}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-subtle">
                      <th className="py-2 pr-3 font-medium">Category</th>
                      <th className="py-2 pr-3 font-medium">Approved</th>
                      <th className="py-2 pr-3 font-medium">Actual</th>
                      <th className="py-2 pr-3 font-medium">Variance</th>
                      <th className="py-2 font-medium">Prior approval</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.budget.rows.map((row) => (
                      <tr key={row.category} className="border-b border-border/60">
                        <td className="py-2 pr-3 font-semibold text-foreground">{row.category}</td>
                        <td className="py-2 pr-3 font-mono text-muted">{formatCents(row.approvedCents)}</td>
                        <td className="py-2 pr-3 font-mono text-muted">{formatCents(row.actualCents)}</td>
                        <td className="py-2 pr-3 font-mono">{formatCentsSigned(row.varianceCents)}</td>
                        <td className="py-2 font-mono">
                          {row.overThreshold === null
                            ? "unstated"
                            : row.overThreshold
                              ? "required"
                              : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </GhostCard>

          {report.period.priorFederalExpendituresCents !== null ? (
            <GhostCard>
              <div className="space-y-2 p-4">
                <h3 className="text-sm font-semibold text-foreground">Period vs cumulative</h3>
                <p className="text-xs text-muted">
                  prior 10e {formatCents(report.period.priorFederalExpendituresCents)} · current 10e{" "}
                  {formatCents(report.period.currentFederalExpendituresCents)} · period spend{" "}
                  {report.period.periodSpendCents === null ? "n/a" : formatCents(report.period.periodSpendCents)}
                  {report.period.deltaCents !== null ? ` · drift ${formatCentsSigned(report.period.deltaCents)}` : ""}
                </p>
              </div>
            </GhostCard>
          ) : null}

          {report.findings.length > 0 ? (
            <GhostCard>
              <div className="space-y-2 p-4">
                <h3 className="text-sm font-semibold text-foreground">Findings</h3>
                <ul className="space-y-2">
                  {report.findings.map((finding, index) => (
                    <li key={`${finding.ruleId}-${index}`} className="text-xs text-muted">
                      <span
                        className={`mr-2 inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${SEVERITY_STYLE[finding.severity]}`}
                      >
                        {finding.severity}
                      </span>
                      <span className="font-mono font-semibold text-foreground">{finding.ruleId}</span>
                      <span className="text-subtle"> · {finding.scope}</span>
                      <p className="mt-1">{finding.message}</p>
                      <p className="mt-0.5 text-subtle">{finding.fix}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </GhostCard>
          ) : null}

          {report.blockedFindingScopes.length > 0 ? (
            <GhostCard>
              <div className="flex items-start gap-3 p-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <p className="text-xs text-muted">
                  These checks did not run because the award terms did not state the field:{" "}
                  <span className="font-mono">{report.blockedFindingScopes.join(", ")}</span>. A missing
                  or unreadable input is an explicit finding that blocks the verdict — never a guess.
                </p>
              </div>
            </GhostCard>
          ) : null}

          <IdeInset
            title="preflight-summary.txt"
            meta="finding set"
            badge={null}
            maxHeightClass="max-h-64"
            code={report.summary}
          />
        </div>
      ) : (
        <GhostCard>
          <div className="flex items-start gap-3 p-4">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
            <p className="text-xs text-muted">
              The declared composite below is the worked sample: a $100,000 award whose form cross-foots
              cleanly, but 10a drifts from the drawdown statement by $0.04 and the match is $5,000 short.
              Press Run the pre-flight to re-derive everything in your browser — no model, no upload.
              Nothing is filed or certified for the recipient; the output is the audited worksheet the
              human signs.
            </p>
          </div>
        </GhostCard>
      )}
    </div>
  );
}
