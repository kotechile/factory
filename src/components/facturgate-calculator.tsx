"use client";

import * as React from "react";
import {
  convertInvoiceToFacturX,
  validateEinvoice,
  type EinvoiceInput,
  type EinvoiceReport,
  type TargetCountry,
  type TargetFormat,
} from "@/lib/calc/einvoice";
import { brokenFixtures, demoInvoice } from "@/lib/calc/einvoice/fixtures";
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
  ClipboardCopy,
  Download,
  FileCode2,
  RefreshCw,
  ShieldCheck,
  Wand2,
} from "lucide-react";

const FORMATS: Array<{ value: TargetFormat; label: string }> = [
  { value: "facturx", label: "Factur-X / CII (EN 16931)" },
  { value: "cii", label: "Standalone CII (EN 16931)" },
  { value: "ubl", label: "UBL 2.1 (Peppol BIS 3.0)" },
];

const COUNTRIES: Array<{ value: TargetCountry; label: string }> = [
  { value: "FR", label: "France — CIUS-FR overlay" },
  { value: "PL", label: "Poland — KSeF (VAT rounded at total)" },
  { value: "BE", label: "Belgium — Peppol BIS 3.0" },
  { value: "DE", label: "Germany — XRechnung / EN 16931" },
];

export interface FacturGateCalculatorProps {
  initialFormat?: TargetFormat;
  initialCountry?: TargetCountry;
}

function severityVariant(severity: string): "destructive" | "warning" {
  return severity === "blocking" ? "destructive" : "warning";
}

export default function FacturGateCalculator({
  initialFormat = "facturx",
  initialCountry = "FR",
}: FacturGateCalculatorProps) {
  const [format, setFormat] = React.useState<TargetFormat>(initialFormat);
  const [country, setCountry] = React.useState<TargetCountry>(initialCountry);
  const [documentText, setDocumentText] = React.useState("");
  const [report, setReport] = React.useState<EinvoiceReport | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    trackEvent("page_view", undefined, "facturgate");
  }, []);

  const loadDocument = React.useCallback(
    (input: EinvoiceInput) => {
      setDocumentText(JSON.stringify({ ...input, targetFormat: format, targetCountry: country }, null, 2));
      setReport(null);
      setError(null);
    },
    [format, country],
  );

  const run = (mode: "validate" | "convert") => {
    let parsed: EinvoiceInput;
    try {
      parsed = JSON.parse(documentText) as EinvoiceInput;
    } catch (parseError) {
      // Explicit, not silent: a malformed payload stops the run and says why.
      setReport(null);
      setError(
        `The pasted document is not valid JSON: ${parseError instanceof Error ? parseError.message : "parse failure"}. Nothing was validated.`,
      );
      return;
    }
    const input: EinvoiceInput = { ...parsed, targetFormat: format, targetCountry: country };
    try {
      const next = mode === "convert" ? convertInvoiceToFacturX(input) : validateEinvoice(input);
      setReport(next);
      setError(null);
      trackEvent(
        mode === "convert" ? "convert_click" : "validate_click",
        {
          targetFormat: format,
          targetCountry: country,
          valid: next.valid,
          score: next.score,
          blocking: next.findings.filter((finding) => finding.severity === "blocking").length,
        },
        "facturgate",
      );
    } catch (runError) {
      setReport(null);
      setError(runError instanceof Error ? runError.message : "The gate failed unexpectedly.");
    }
  };

  const downloadXml = () => {
    const xml = report?.emitted?.xml;
    if (!xml) return;
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `${format}-en16931.xml`;
    link.click();
    URL.revokeObjectURL(url);
    trackEvent("export_click", { targetFormat: format, targetCountry: country }, "facturgate");
  };

  const copyXml = async () => {
    const xml = report?.emitted?.xml;
    if (!xml) return;
    try {
      await navigator.clipboard.writeText(xml);
      setCopied(true);
      trackEvent("copy_click", { targetFormat: format }, "facturgate");
    } catch (copyError) {
      setError(`Could not copy to the clipboard: ${copyError instanceof Error ? copyError.message : "unknown error"}`);
    }
  };

  const reconciliation = report?.reconciliation ?? null;
  const blocking = report?.findings.filter((finding) => finding.severity === "blocking").length ?? 0;
  const advisory = report?.findings.filter((finding) => finding.severity === "advisory").length ?? 0;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>1 &middot; Target and document</CardTitle>
          <CardDescription>
            Paste the canonical invoice model (JSON). The gate runs locally in this page — the same
            deterministic engine the agent tools call.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
              Destination format
              <select
                value={format}
                onChange={(event) => setFormat(event.target.value as TargetFormat)}
                className="h-10 w-full rounded border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {FORMATS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
              Target country rule set
              <select
                value={country}
                onChange={(event) => setCountry(event.target.value as TargetCountry)}
                className="h-10 w-full rounded border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {COUNTRIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
            Canonical invoice model (JSON)
            <textarea
              value={documentText}
              onChange={(event) => setDocumentText(event.target.value)}
              rows={12}
              spellCheck={false}
              placeholder='{ "seller": { … }, "buyer": { … }, "invoice": { … } }'
              className="w-full rounded border border-border bg-background p-4 font-mono text-xs leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => run("validate")} disabled={!documentText.trim()}>
              <ShieldCheck className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Validate &amp; score
            </Button>
            <Button variant="accent" onClick={() => run("convert")} disabled={!documentText.trim()}>
              <Wand2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Validate &amp; convert
            </Button>
            <Button variant="outline" onClick={() => loadDocument(demoInvoice(country, format))}>
              <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Load valid {country} example
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const broken = brokenFixtures.currencyDisplayString();
                setDocumentText(JSON.stringify({ ...broken, targetFormat: format, targetCountry: country }, null, 2));
                setReport(null);
                setError(null);
              }}
            >
              <AlertTriangle className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Load broken example
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setDocumentText("");
                setReport(null);
                setError(null);
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <div aria-live="polite" className="space-y-6">
        {error ? (
          <Card className="border-destructive">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        {report ? (
          <>
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>2 &middot; Pre-send readiness</CardTitle>
                  <CardDescription>
                    {report.valid
                      ? "No blocking rule failed — the artifact below is safe to submit."
                      : "Blocking rules failed — this document would be rejected. Fix the findings before submitting."}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={report.valid ? "success" : "destructive"}>
                    {report.verdict === "ready"
                      ? "ready"
                      : report.verdict === "ready-with-advisories"
                        ? "advisories"
                        : "blocked"}
                  </Badge>
                  <span className="font-mono text-2xl font-semibold text-foreground">
                    {report.score}/100
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant={blocking > 0 ? "destructive" : "outline"}>
                    {blocking} blocking
                  </Badge>
                  <Badge variant={advisory > 0 ? "warning" : "outline"}>{advisory} advisory</Badge>
                  <Badge variant="muted">
                    {reconciliation ? `${reconciliation.roundingPolicy} VAT rounding` : "not reconcilable"}
                  </Badge>
                </div>

                {report.findings.length === 0 ? (
                  <p className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    No rule in the implemented set failed.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded border border-border">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead className="bg-background text-xs uppercase tracking-wide text-muted">
                        <tr>
                          <th scope="col" className="px-3 py-2">Rule</th>
                          <th scope="col" className="px-3 py-2">Severity</th>
                          <th scope="col" className="px-3 py-2">Field</th>
                          <th scope="col" className="px-3 py-2">Finding and fix</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.findings.map((finding, index) => (
                          <tr key={`${finding.ruleId}-${finding.fieldPath}-${index}`} className="border-t border-border align-top">
                            <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-foreground">
                              {finding.ruleId}
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant={severityVariant(finding.severity)}>
                                {finding.severity}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 font-mono text-xs text-muted">{finding.fieldPath}</td>
                            <td className="px-3 py-2 text-muted">
                              <span className="block text-foreground">{finding.message}</span>
                              <span className="mt-1 block text-xs text-subtle">Fix: {finding.fix}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {reconciliation ? (
              <Card>
                <CardHeader>
                  <CardTitle>3 &middot; Reconciliation (recomputed from the lines)</CardTitle>
                  <CardDescription>
                    Every figure below is recomputed from the invoice lines; the document&apos;s
                    declared totals are never used to fill a gap.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {[
                      ["Line net sum (BT-106)", reconciliation.lineNetSum],
                      ["Total without VAT (BT-109)", reconciliation.taxExclusive],
                      ["Total VAT (BT-110)", reconciliation.vatTotal],
                      ["Grand total (BT-112)", reconciliation.grandTotal],
                      ["Declared grand total", reconciliation.declaredGrandTotal ?? 0],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded border border-border p-3">
                        <dt className="text-xs text-muted">{label as string}</dt>
                        <dd className="font-mono text-lg font-semibold text-foreground">
                          {(value as number).toFixed(2)}
                        </dd>
                      </div>
                    ))}
                    <div className="rounded border border-border p-3">
                      <dt className="text-xs text-muted">Delta (computed − declared)</dt>
                      <dd
                        className={`font-mono text-lg font-semibold ${
                          reconciliation.delta === 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        {reconciliation.delta.toFixed(2)}
                      </dd>
                    </div>
                  </dl>

                  <div className="overflow-hidden rounded border border-border">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead className="bg-background text-xs uppercase tracking-wide text-muted">
                        <tr>
                          <th scope="col" className="px-3 py-2">VAT category</th>
                          <th scope="col" className="px-3 py-2">Rate</th>
                          <th scope="col" className="px-3 py-2">Taxable (BT-116)</th>
                          <th scope="col" className="px-3 py-2">Tax (BT-117)</th>
                          <th scope="col" className="px-3 py-2">Exemption reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reconciliation.vatByBreakdown.map((group) => (
                          <tr key={`${group.category}-${group.rate}`} className="border-t border-border">
                            <td className="px-3 py-2 font-mono text-xs">{group.category}</td>
                            <td className="px-3 py-2 font-mono text-xs">{group.rate.toFixed(2)}%</td>
                            <td className="px-3 py-2 font-mono text-xs">{group.taxableAmount.toFixed(2)}</td>
                            <td className="px-3 py-2 font-mono text-xs">{group.taxAmount.toFixed(2)}</td>
                            <td className="px-3 py-2 text-xs text-muted">
                              {group.exemptionReason ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {report.emitted ? (
              <Card>
                <CardHeader className="flex-row items-center justify-between gap-3">
                  <div>
                    <CardTitle>4 &middot; Emitted artifact</CardTitle>
                    <CardDescription>
                      {report.emitted.format} &middot; profile {report.emitted.profile} &middot;{" "}
                      {report.emitted.customizationId}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyXml}>
                      <ClipboardCopy className="mr-1.5 h-4 w-4" aria-hidden="true" />
                      {copied ? "Copied" : "Copy"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadXml}>
                      <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
                      Download
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-subtle">{report.emitted.note}</p>
                  <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap break-all rounded border border-border bg-background p-4 font-mono text-xs leading-relaxed text-foreground">
                    {report.emitted.xml}
                  </pre>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>Coverage — what this gate does and does not claim</CardTitle>
                <CardDescription>
                  <FileCode2 className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
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
                    Not implemented in v1 (never reported as passing)
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
                    {report.coverage.unsupportedFamilies.map((family) => (
                      <li key={family}>{family}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
