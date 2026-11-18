"use client";

import * as React from "react";
import {
  DEFAULT_SCENARIO_RECORD,
  SCHEDULE_SLUGS,
  auditClaim,
  formatCents,
  formatTenths,
  readClaimRecord,
  scheduleBySlug,
  type AuditReport,
  type Verdict,
} from "@/lib/calc/claimproof";
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

const VERDICT_LABEL: Record<Verdict, string> = {
  underpaid: "UNDERPAID",
  "correctly-paid": "CORRECTLY-PAID",
  overpaid: "OVERPAID",
  unverifiable: "UNVERIFIABLE",
};

const VERDICT_STYLE: Record<Verdict, string> = {
  underpaid: "bg-destructive/10 text-destructive border-destructive/30",
  "correctly-paid": "bg-success/10 text-success border-success/30",
  overpaid: "bg-warning/10 text-warning border-warning/30",
  unverifiable: "bg-muted/10 text-muted border-border",
};

export default function ClaimProofAudit() {
  const [scheduleSlug, setScheduleSlug] = React.useState<string>("truemfg@2022-06");
  const [mode, setMode] = React.useState<Mode>("declared");
  const [declaredText, setDeclaredText] = React.useState<string>(SAMPLE_JSON);
  const [report, setReport] = React.useState<AuditReport | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    trackEvent("page_view", undefined, "claimproof");
  }, []);

  const runDeterministic = (record: unknown) => {
    setLoading(true);
    setError(null);
    try {
      const parsed = readClaimRecord(record);
      if (parsed.blocked) {
        setReport(null);
        setError(
          parsed.findings[0]?.message ??
            "The declared fields could not be read into a claim; the audit is withheld.",
        );
        setLoading(false);
        return;
      }
      const schedule = scheduleBySlug(scheduleSlug);
      const result = auditClaim({ ...parsed.claim, oemSlug: schedule.slug }, schedule, parsed.payment);
      setReport(result);
    } catch (err) {
      setReport(null);
      setError(err instanceof Error ? err.message : "The audit failed.");
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
        setError("Paste the declared-fields JSON first, or press Load sample.");
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(declaredText);
      } catch {
        setError("The declared fields are not valid JSON. Nothing was audited.");
        return;
      }
      runDeterministic(parsed);
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const claimInput = document.getElementById("claimproof-claim-file") as HTMLInputElement | null;
      const remittanceInput = document.getElementById("claimproof-remittance-file") as HTMLInputElement | null;
      const claimFile = claimInput?.files?.[0];
      const remittanceFile = remittanceInput?.files?.[0];
      if (!claimFile || !remittanceFile) {
        setError("Upload both the filed claim and the remittance PDF, then audit.");
        setLoading(false);
        return;
      }
      const [claimBase64, remittanceBase64] = await Promise.all([
        readFileAsBase64(claimFile),
        readFileAsBase64(remittanceFile),
      ]);
      const response = await fetch("/api/claimproof/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleSlug,
          claimBase64,
          claimName: claimFile.name,
          remittanceBase64,
          remittanceName: remittanceFile.name,
        }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        blocked?: boolean;
        error?: string;
        data?: { report: AuditReport };
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
          ariaLabel="ClaimProof input mode"
          value={mode}
          onChange={setMode}
          tabs={[
            { key: "declared", label: "Declared fields" },
            { key: "upload", label: "Upload remittance + claim" },
          ]}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="text-xs font-medium text-muted" htmlFor="claimproof-schedule">
            Schedule
          </label>
          <select
            id="claimproof-schedule"
            value={scheduleSlug}
            onChange={(event) => setScheduleSlug(event.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-xs text-foreground"
          >
            {SCHEDULE_SLUGS.map((slug) => (
              <option key={slug} value={slug}>
                {slug}
              </option>
            ))}
          </select>
        </div>

        {mode === "upload" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 rounded-xl border border-dashed border-border bg-background/60 p-4">
              <span className="text-xs font-semibold text-foreground">Filed claim (PDF)</span>
              <input id="claimproof-claim-file" type="file" accept="application/pdf" className="text-xs text-muted" />
            </label>
            <label className="flex flex-col gap-1 rounded-xl border border-dashed border-border bg-background/60 p-4">
              <span className="text-xs font-semibold text-foreground">Remittance / payment advice (PDF)</span>
              <input id="claimproof-remittance-file" type="file" accept="application/pdf" className="text-xs text-muted" />
            </label>
          </div>
        ) : null}

        {mode === "declared" ? (
          <IdeTextarea
            title="declared-fields.json"
            ariaLabel="Declared-fields JSON"
            meta="claim + payment, declared fields"
            value={declaredText}
            onChange={setDeclaredText}
            rows={12}
            placeholder='{ "claimId": { "value": "CL-1", "provenance": "extracted" }, … }'
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onAudit} disabled={loading} className={TACTILE_CTA}>
            {loading ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" />
            )}
            {mode === "upload" ? "Extract and audit" : "Audit the claim"}
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
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs font-semibold ${VERDICT_STYLE[report.verdict]}`}>
              {report.verdict === "underpaid" || report.verdict === "correctly-paid" ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              {VERDICT_LABEL[report.verdict]}
            </span>
            <span className="font-mono text-xs text-muted">
              {report.scheduleSlug} · {report.oem} · revision {report.scheduleVersion}
            </span>
            {report.staleSchedule ? (
              <Badge variant="destructive">STALE SCHEDULE</Badge>
            ) : null}
            {report.blockedLineCount > 0 ? (
              <Badge variant="warning">
                {report.blockedLineCount} BLOCKED {report.blockedLineCount === 1 ? "LINE" : "LINES"}
              </Badge>
            ) : null}
          </div>

          <GhostCard>
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Per-line variance</h3>
                <span className="font-mono text-xs text-subtle">
                  Σ variance {formatCents(report.totalVarianceCents)}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-subtle">
                      <th className="py-2 pr-3 font-medium">Line</th>
                      <th className="py-2 pr-3 font-medium">Expected</th>
                      <th className="py-2 pr-3 font-medium">Paid</th>
                      <th className="py-2 pr-3 font-medium">Variance</th>
                      <th className="py-2 pr-3 font-medium">Verdict</th>
                      <th className="py-2 font-medium">Rule · page</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.lines.map((line) => (
                      <tr key={line.scope} className="border-b border-border/60">
                        <td className="py-2 pr-3 font-semibold text-foreground">{line.label}</td>
                        <td className="py-2 pr-3 font-mono text-muted">
                          {line.expectedCents === null ? "—" : formatCents(line.expectedCents)}
                        </td>
                        <td className="py-2 pr-3 font-mono text-muted">{formatCents(line.paidCents)}</td>
                        <td className="py-2 pr-3 font-mono">
                          {line.varianceCents === null ? "—" : formatCents(line.varianceCents)}
                        </td>
                        <td className="py-2 pr-3">
                          <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${VERDICT_STYLE[line.verdict]}`}>
                            {VERDICT_LABEL[line.verdict]}
                          </span>
                        </td>
                        <td className="py-2 text-subtle">
                          <span className="font-mono">{line.ruleId}</span>
                          <span className="text-subtle"> · {line.page}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </GhostCard>

          <GhostCard>
            <div className="space-y-2 p-4">
              <h3 className="text-sm font-semibold text-foreground">Allowed hours by repair code</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-subtle">
                      <th className="py-2 pr-3 font-medium">Code</th>
                      <th className="py-2 pr-3 font-medium">Allowed</th>
                      <th className="py-2 pr-3 font-medium">Claimed</th>
                      <th className="py-2 font-medium">Rule</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.repairAllowances.map((line, index) => (
                      <tr key={`${line.code}-${index}`} className="border-b border-border/60">
                        <td className="py-2 pr-3 font-mono text-foreground">
                          {line.code}
                          {line.multipleRepairIncrement ? " (+increment)" : ""}
                        </td>
                        <td className="py-2 pr-3 font-mono text-muted">
                          {line.allowedTenths === null ? "unstated" : formatTenths(line.allowedTenths)}
                        </td>
                        <td className="py-2 pr-3 font-mono text-muted">{formatTenths(line.claimedTenths)}</td>
                        <td className="py-2 text-subtle">
                          <span className="font-mono">{line.ruleId ?? "cp-labor-allowance"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </GhostCard>

          {report.findings.length > 0 ? (
            <GhostCard>
              <div className="space-y-2 p-4">
                <h3 className="text-sm font-semibold text-foreground">Findings</h3>
                <ul className="space-y-2">
                  {report.findings.map((finding, index) => (
                    <li key={`${finding.ruleId}-${index}`} className="text-xs text-muted">
                      <span className="font-mono font-semibold text-foreground">{finding.ruleId}</span>
                      <span className="text-subtle"> · {finding.severity}</span>
                      <p className="mt-1">{finding.message}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </GhostCard>
          ) : null}

          <IdeInset
            title="resubmission-summary.txt"
            meta="finding set"
            badge={null}
            maxHeightClass="max-h-64"
            code={report.resubmissionSummary}
          />
        </div>
      ) : (
        <GhostCard>
          <div className="flex items-start gap-3 p-4">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
            <p className="text-xs text-muted">
              The declared fields below are the worked sample (two refrigeration repairs, an over-cap
              nitrogen fee, short-paid labour). Press Audit the claim to re-derive the vendored True
              schedule against the remittance in your browser — no model, no upload. The upload path
              reads the two documents as declared fields and answers with an explicit unconfigured
              error until the deploy carries the extraction key.
            </p>
          </div>
        </GhostCard>
      )}
    </div>
  );
}
