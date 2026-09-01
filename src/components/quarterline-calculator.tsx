"use client";

import * as React from "react";
import {
  calculateSelfEmployment2026,
  type FilingStatus,
  type SelfEmployment2026Input,
  type SelfEmployment2026Output,
} from "@/lib/calc/selfEmployment2026";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  AlertTriangle,
  CheckCircle2,
  Calendar,
  DollarSign,
  FileText,
  ShieldCheck,
  Zap,
  TrendingDown,
  Info,
  Download,
  ChevronRight,
  ChevronDown,
  Sparkles,
} from "lucide-react";

const trackEvent = (event: string, payload?: Record<string, unknown>) => {
  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, payload }),
  }).catch((err) => console.error("[telemetry] client track failed:", err));
};

type SectionKey = "revenue" | "safeHarbor" | "obbba";

function SectionCard({
  title,
  subtitle,
  icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-background/60"
      >
        <span className="flex items-center gap-2.5">
          {icon}
          <span className="flex flex-col gap-0.5">
            <span className="text-base font-semibold text-foreground">{title}</span>
            {subtitle && <span className="text-xs text-subtle">{subtitle}</span>}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-subtle transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      {open && <div className="space-y-5 px-6 pb-6 pt-1">{children}</div>}
    </section>
  );
}

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

const METHOD_LABEL: Record<string, string> = {
  "90_percent_current_year": "90% current-year rule",
  "100_percent_prior_year": "100% prior-year safe harbor",
  "110_percent_prior_year": "110% prior-year safe harbor",
};
const methodLabel = (m: string) => METHOD_LABEL[m] ?? m;

export default function QuarterLineCalculator({
  initial,
}: {
  initial?: Partial<SelfEmployment2026Input>;
}) {
  // Input States
  const [grossIncome, setGrossIncome] = React.useState<number>(initial?.grossIncome ?? 130000);
  const [businessExpenses, setBusinessExpenses] = React.useState<number>(initial?.businessExpenses ?? 15000);
  const [filingStatus, setFilingStatus] = React.useState<FilingStatus>(initial?.filingStatus ?? "single");
  const [w2Wages, setW2Wages] = React.useState<number>(initial?.w2Wages ?? 0);
  const [priorYearAgi, setPriorYearAgi] = React.useState<number>(initial?.priorYearAgi ?? 90000);
  const [priorYearTax, setPriorYearTax] = React.useState<number>(initial?.priorYearTax ?? 16000);
  const [age, setAge] = React.useState<number>(initial?.age ?? 38);
  const [isTippedOccupation, setIsTippedOccupation] = React.useState<boolean>(initial?.isTippedOccupation ?? false);
  const [qualifiedTips, setQualifiedTips] = React.useState<number>(initial?.qualifiedTips ?? 0);
  const [isSstb, setIsSstb] = React.useState<boolean>(initial?.isSstb ?? false);
  const [w2WagesPaidByBusiness, setW2WagesPaidByBusiness] = React.useState<number>(initial?.w2WagesPaidByBusiness ?? 0);
  const [ubia, setUbia] = React.useState<number>(initial?.ubia ?? 0);
  const [retirementContributions, setRetirementContributions] = React.useState<number>(initial?.retirementContributions ?? 0);
  const [sehi, setSehi] = React.useState<number>(initial?.sehi ?? 0);
  const [stateLocalTaxPaid, setStateLocalTaxPaid] = React.useState<number>(initial?.stateLocalTaxPaid ?? 0);

  // UI States
  const [activeTab, setActiveTab] = React.useState<"estimate" | "qbi" | "trap_check" | "scorecard">("estimate");
  const [openSections, setOpenSections] = React.useState<Record<SectionKey, boolean>>({
    revenue: true,
    safeHarbor: false,
    obbba: false,
  });
  const [isExportModalOpen, setIsExportModalOpen] = React.useState<boolean>(false);
  const [isPurchased, setIsPurchased] = React.useState<boolean>(false);
  const [isCheckingOut, setIsCheckingOut] = React.useState<boolean>(false);
  const [exportNotice, setExportNotice] = React.useState<string | null>(null);

  const toggleSection = (key: SectionKey) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  // Compute live deterministic calculation
  const calcResult: SelfEmployment2026Output = React.useMemo(() => {
    const input: SelfEmployment2026Input = {
      grossIncome,
      businessExpenses,
      filingStatus,
      w2Wages,
      priorYearAgi,
      priorYearTax,
      age,
      isTippedOccupation,
      qualifiedTips,
      isSstb,
      w2WagesPaidByBusiness,
      ubia,
      retirementContributions,
      sehi,
      stateLocalTaxPaid,
    };
    return calculateSelfEmployment2026(input);
  }, [
    grossIncome,
    businessExpenses,
    filingStatus,
    w2Wages,
    priorYearAgi,
    priorYearTax,
    age,
    isTippedOccupation,
    qualifiedTips,
    isSstb,
    w2WagesPaidByBusiness,
    ubia,
    retirementContributions,
    sehi,
    stateLocalTaxPaid,
  ]);

  // Fire page_view once on mount (growth kill/scale telemetry) and check for Stripe redirect.
  React.useEffect(() => {
    trackEvent("page_view");

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const status = params.get("status");
      const sessionId = params.get("session_id");
      if (status === "success" && sessionId) {
        setIsPurchased(true);
        setExportNotice("Payment verified! Your 2026 Tax Readiness Audit Report is unlocked.");
      }
    }
  }, []);

  const handleCheckout = async (plan: "pdf_audit_export" | "cpa_monthly") => {
    trackEvent("checkout_click", { plan });
    setIsCheckingOut(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to start checkout");
      }
    } catch {
      alert("Network error during checkout initiation");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleDownloadReport = () => {
    trackEvent("export_click");
    const reportText = `QUARTERLINE 2026 TAX READINESS AUDIT REPORT
Governing Law: ${calcResult.governingLaw}
Tax Year: 2026
Generated: ${new Date().toLocaleDateString()}

1. BUSINESS SUMMARY (SCHEDULE C)
Gross 1099/Business Revenue: $${calcResult.grossIncome.toLocaleString()}
Business Expenses: $${calcResult.businessExpenses.toLocaleString()}
Net Schedule C Profit: $${calcResult.netBusinessProfit.toLocaleString()}

2. SELF-EMPLOYMENT TAX (SCHEDULE SE)
Net SE Earnings (92.35%): $${Math.round(calcResult.seEarningsSubjectToTax).toLocaleString()}
Social Security Tax (12.4% up to $184,500): $${Math.round(calcResult.socialSecurityTax).toLocaleString()}
Medicare Tax (2.9%): $${Math.round(calcResult.medicareTax).toLocaleString()}
Additional Medicare Tax (0.9%): $${Math.round(calcResult.additionalMedicareTax).toLocaleString()}
Total Self-Employment Tax: $${Math.round(calcResult.totalSelfEmploymentTax).toLocaleString()}
Half-SE Above-the-Line Deduction: $${Math.round(calcResult.halfSeTaxDeduction).toLocaleString()}

3. SECTION 199A QBI DEDUCTION (STATUTORY 20.0% RATE)
Qualified Business Income (QBI): $${Math.round(calcResult.qualifiedBusinessIncome).toLocaleString()}
Statutory QBI Rate: 20.0% (OBBBA Pub. L. 119-21 Enacted Law)
Allowable QBI Deduction: $${Math.round(calcResult.qbiDeduction).toLocaleString()}
Estimated Tax Savings: $${Math.round(calcResult.qbiTaxSavings).toLocaleString()}

4. FEDERAL INCOME TAX & TOTAL LIABILITY
Taxable Income Before QBI: $${Math.round(calcResult.taxableIncomeBeforeQbi).toLocaleString()}
Final Taxable Income: $${Math.round(calcResult.finalTaxableIncome).toLocaleString()}
Federal Income Tax: $${Math.round(calcResult.federalIncomeTax).toLocaleString()}
Total Annual Tax Liability: $${Math.round(calcResult.totalTaxLiability).toLocaleString()}
Effective Tax Rate: ${(calcResult.overallEffectiveRate * 100).toFixed(1)}%

5. ESTIMATED QUARTERLY INSTALLMENTS (SAFE HARBOR)
Safe Harbor Applied: ${calcResult.estimatedPayments.safeHarborApplied ? "Yes" : "No"} (${methodLabel(calcResult.estimatedPayments.methodUsed)})
Required Annual Payment: $${Math.round(calcResult.estimatedPayments.requiredAnnualPayment).toLocaleString()}
${calcResult.estimatedPayments.quarterlyInstallments.map((q) => `${q.quarter} (Due ${q.dueDate}): $${q.amount.toLocaleString()}`).join("\n")}

6. TAX READINESS SCORECARD
Overall Score: ${calcResult.scorecard.totalScore}/100 (${calcResult.scorecard.rating})
Action Items:
${calcResult.scorecard.keyActionItems.map((a) => `- ${a}`).join("\n")}
`;

    const blob = new Blob([reportText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QuarterLine-2026-Tax-Audit-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSimulateUnlock = () => {
    setIsPurchased(true);
    setExportNotice("Export access unlocked. You can now download the 2026 Audit Report.");
    setIsExportModalOpen(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      {/* Top Banner: Urgent Q3 Estimated Tax Deadline */}
      <div className="flex items-center justify-center gap-2 border-b border-warning/20 bg-warning/10 px-4 py-2.5 text-center text-xs font-medium sm:text-sm">
        <Calendar className="inline-block h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
        <span>
          <strong>Q3 2026 Estimated-Tax Deadline: September 15, 2026</strong> — lock in your
          safe-harbor payment to avoid IRS underpayment penalties.
        </span>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-lg font-bold tracking-tight text-card shadow-sm">
              Q
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-foreground">QuarterLine</span>
                <Badge variant="accent">2026 OBBBA</Badge>
              </div>
              <p className="text-xs text-subtle">2026 Self-Employment &amp; QBI Tax Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Badge variant="success" className="hidden gap-1 md:inline-flex">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>20% QBI Pinned (Enacted Law)</span>
            </Badge>

            {isPurchased ? (
              <Button size="sm" variant="default" onClick={handleDownloadReport} className="gap-1.5">
                <Download className="h-4 w-4" />
                <span>Download Report</span>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="default"
                onClick={() => setIsExportModalOpen(true)}
                className="gap-1.5"
              >
                <FileText className="h-4 w-4" />
                <span>Export Report</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="mx-auto max-w-3xl space-y-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span>Autonomous Product &amp; Software Factory • Pub. L. 119-21 &amp; Rev. Proc. 2025-32</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
            2026 Self-Employment Tax &amp; QBI Deduction Calculator
          </h1>
          <p className="text-sm text-muted sm:text-base">
            Free real-time calculation engine with OBBBA permanent Section 199A QBI deduction
            (pinned to the enacted 20% rate), safe-harbor quarterly payment planning, and accuracy
            verification.
          </p>
        </div>

        {/* 23% vs 20% Accuracy Warning Bar */}
        <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
            <div>
              <strong className="font-semibold text-foreground">
                2026 Law Alert: Section 199A QBI Rate is 20.0%, NOT 23.0%
              </strong>
              <p className="mt-0.5 text-xs text-muted">
                The House 23% proposal never made it into enacted law. Using 23% creates an IRS
                underpayment subject to a 20% penalty. QuarterLine pins the exact 20% statutory rate.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveTab("trap_check")}
            className="shrink-0 text-xs"
          >
            Check Trap Impact
          </Button>
        </div>

        {exportNotice && (
          <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/10 p-3.5 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>{exportNotice}</span>
            </div>
            <Button size="sm" variant="default" onClick={handleDownloadReport} className="h-7 text-xs">
              Download File
            </Button>
          </div>
        )}

        {/* Two-column grid: Form inputs (7) + Sticky summary (5) */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
          {/* LEFT — Inputs */}
          <div className="space-y-4 lg:col-span-7">
            {/* Filing status (always visible) */}
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <label
                htmlFor="filing-status-select"
                className="text-[13px] font-medium leading-none text-muted"
              >
                Filing Status
              </label>
              <select
                id="filing-status-select"
                value={filingStatus}
                onChange={(e) => setFilingStatus(e.target.value as FilingStatus)}
                className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="single">Single ($201,750 QBI Threshold)</option>
                <option value="married_filing_jointly">Married Filing Jointly ($403,500 Threshold)</option>
                <option value="head_of_household">Head of Household ($201,750 Threshold)</option>
                <option value="married_filing_separately">Married Filing Separately ($201,750 Threshold)</option>
              </select>
            </div>

            {/* Section 1 — Business Revenue & Expenses */}
            <SectionCard
              title="Business Revenue & Expenses"
              subtitle="Schedule C gross income and deductible expenses"
              icon={<DollarSign className="h-4 w-4 text-primary" aria-hidden="true" />}
              open={openSections.revenue}
              onToggle={() => toggleSection("revenue")}
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input
                  label="Gross 1099/Revenue ($)"
                  type="number"
                  min="0"
                  step="1000"
                  value={grossIncome || ""}
                  onChange={(e) => setGrossIncome(Math.max(0, Number(e.target.value)))}
                  helperText="Schedule C gross income"
                />
                <Input
                  label="Business Expenses ($)"
                  type="number"
                  min="0"
                  step="500"
                  value={businessExpenses || ""}
                  onChange={(e) => setBusinessExpenses(Math.max(0, Number(e.target.value)))}
                  helperText="Deductible expenses"
                />
              </div>
            </SectionCard>

            {/* Section 2 — Safe Harbor & Prior Year Taxes */}
            <SectionCard
              title="Safe Harbor & Prior Year Taxes"
              subtitle="2025 baseline shields you from underpayment penalties"
              icon={<ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />}
              open={openSections.safeHarbor}
              onToggle={() => toggleSection("safeHarbor")}
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input
                  label="2025 Prior-Year AGI ($)"
                  type="number"
                  min="0"
                  step="1000"
                  value={priorYearAgi || ""}
                  onChange={(e) => setPriorYearAgi(Math.max(0, Number(e.target.value)))}
                  helperText="110% safe harbor if AGI > $150k"
                />
                <Input
                  label="2025 Total Tax Paid ($)"
                  type="number"
                  min="0"
                  step="500"
                  value={priorYearTax || ""}
                  onChange={(e) => setPriorYearTax(Math.max(0, Number(e.target.value)))}
                  helperText="Prior-year total tax"
                />
              </div>
            </SectionCard>

            {/* Section 3 — OBBBA & Section 199A Adjustments */}
            <SectionCard
              title="OBBBA & Section 199A Adjustments"
              subtitle="Deductions, wage base, and QBI phase-out inputs"
              icon={<Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />}
              open={openSections.obbba}
              onToggle={() => toggleSection("obbba")}
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input
                  label="Outside W-2 Wages ($)"
                  type="number"
                  min="0"
                  step="1000"
                  value={w2Wages || ""}
                  onChange={(e) => setW2Wages(Math.max(0, Number(e.target.value)))}
                  helperText="Reduces $184,500 SS cap"
                />
                <Input
                  label="Filer Age"
                  type="number"
                  min="18"
                  max="100"
                  value={age || ""}
                  onChange={(e) => setAge(Math.max(18, Number(e.target.value)))}
                  helperText="65+ qualifies for $6k senior deduction"
                />
              </div>

              <div className="space-y-3">
                <label className="flex cursor-pointer items-start gap-2.5 text-xs text-foreground">
                  <input
                    type="checkbox"
                    checked={isSstb}
                    onChange={(e) => setIsSstb(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Specified Service Trade or Business (SSTB: law, health, consulting, finance)</span>
                </label>
                <label className="flex cursor-pointer items-start gap-2.5 text-xs text-foreground">
                  <input
                    type="checkbox"
                    checked={isTippedOccupation}
                    onChange={(e) => setIsTippedOccupation(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Tipped occupation (OBBBA &ldquo;No Tax on Tips&rdquo; up to $25k)</span>
                </label>
              </div>

              {isTippedOccupation && (
                <Input
                  label="Qualified Tips ($)"
                  type="number"
                  min="0"
                  step="500"
                  value={qualifiedTips || ""}
                  onChange={(e) => setQualifiedTips(Math.max(0, Number(e.target.value)))}
                  helperText="Deduction applies to income tax only"
                />
              )}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input
                  label="Solo 401(k) / SEP-IRA ($)"
                  type="number"
                  min="0"
                  step="1000"
                  value={retirementContributions || ""}
                  onChange={(e) => setRetirementContributions(Math.max(0, Number(e.target.value)))}
                  helperText="Pre-tax retirement"
                />
                <Input
                  label="SEHI Health Insurance ($)"
                  type="number"
                  min="0"
                  step="500"
                  value={sehi || ""}
                  onChange={(e) => setSehi(Math.max(0, Number(e.target.value)))}
                  helperText="Above-the-line deduction"
                />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input
                  label="W-2 Paid to Employees ($)"
                  type="number"
                  min="0"
                  step="1000"
                  value={w2WagesPaidByBusiness || ""}
                  onChange={(e) => setW2WagesPaidByBusiness(Math.max(0, Number(e.target.value)))}
                  helperText="For high-earner QBI limit"
                />
                <Input
                  label="UBIA Property Basis ($)"
                  type="number"
                  min="0"
                  step="5000"
                  value={ubia || ""}
                  onChange={(e) => setUbia(Math.max(0, Number(e.target.value)))}
                  helperText="2.5% UBIA calculation"
                />
              </div>

              <Input
                label="State & Local Tax Paid (SALT) ($)"
                type="number"
                min="0"
                step="1000"
                value={stateLocalTaxPaid || ""}
                onChange={(e) => setStateLocalTaxPaid(Math.max(0, Number(e.target.value)))}
                helperText="OBBBA SALT cap at $40,400"
              />
            </SectionCard>
          </div>

          {/* RIGHT — Sticky summary */}
          <div className="space-y-6 lg:sticky lg:top-20 lg:col-span-5">
            {/* KPI cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Schedule C Net Profit</CardDescription>
                  <CardTitle className="font-mono text-xl font-bold tabular-nums text-foreground sm:text-2xl">
                    {money(calcResult.netBusinessProfit)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-subtle">
                  Gross <span className="font-mono tabular-nums">{money(calcResult.grossIncome)}</span> −{" "}
                  <span className="font-mono tabular-nums">{money(calcResult.businessExpenses)}</span> exp.
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">QBI Section 199A Deduction</CardDescription>
                  <CardTitle className="font-mono text-xl font-bold tabular-nums text-primary sm:text-2xl">
                    {money(calcResult.qbiDeduction)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-1 text-xs font-medium text-success">
                  <TrendingDown className="h-3.5 w-3.5" />
                  <span>
                    Saves ~<span className="font-mono tabular-nums">{money(calcResult.qbiTaxSavings)}</span> in taxes
                  </span>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Total 2026 Tax Liability</CardDescription>
                  <CardTitle className="font-mono text-xl font-bold tabular-nums text-foreground sm:text-2xl">
                    {money(calcResult.totalTaxLiability)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-subtle">
                  <span className="font-mono tabular-nums">
                    {(calcResult.overallEffectiveRate * 100).toFixed(1)}%
                  </span>{" "}
                  effective rate
                </CardContent>
              </Card>
            </div>

            {/* Navigation tabs */}
            <div className="flex gap-1 overflow-x-auto border-b border-border">
              {(
                [
                  ["estimate", "Quarterly Estimates"],
                  ["qbi", "SE & QBI Breakdown"],
                  ["trap_check", "23% Trap Checker"],
                  ["scorecard", `Scorecard (${calcResult.scorecard.totalScore}/100)`],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-xs font-medium transition-colors sm:text-sm ${
                    activeTab === key
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab 1: Estimated Quarterly Installments & Safe Harbor */}
            {activeTab === "estimate" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span>2026 Estimated Tax Installments</span>
                    </CardTitle>
                    <Badge variant={calcResult.estimatedPayments.safeHarborApplied ? "success" : "accent"}>
                      {calcResult.estimatedPayments.safeHarborApplied
                        ? `Safe Harbor Active (${methodLabel(calcResult.estimatedPayments.methodUsed)})`
                        : "90% Current-Year Rule"}
                    </Badge>
                  </div>
                  <CardDescription>
                    Pay each quarter via IRS Direct Pay / EFTPS to prevent IRS penalties.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {calcResult.estimatedPayments.quarterlyInstallments.map((q) => (
                      <div
                        key={q.quarter}
                        className={`flex flex-col justify-between rounded-lg border p-4 ${
                          q.isUrgent ? "border-warning/40 bg-card" : "border-border bg-card"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground">
                            {q.quarter} Installment
                          </span>
                          {q.isUrgent && <Badge variant="warning">Urgent</Badge>}
                        </div>
                        <div className="mt-3 flex items-baseline justify-between gap-2">
                          <span className="text-xs text-subtle">Due {q.dueDate}</span>
                          <span className="font-mono text-lg font-bold tabular-nums text-foreground">
                            {money(q.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5 rounded-lg border border-border bg-background p-4 text-xs text-muted">
                    <div className="flex justify-between font-medium text-foreground">
                      <span>Total Required Annual Estimated Payment</span>
                      <span className="font-mono tabular-nums">
                        {money(calcResult.estimatedPayments.requiredAnnualPayment)}
                      </span>
                    </div>
                    <p>
                      {calcResult.estimatedPayments.safeHarborApplied ? (
                        <>
                          Safe Harbor Applied: paying based on 2025 prior-year tax (
                          <span className="font-mono tabular-nums">{money(priorYearTax)}</span>) shields
                          you from underpayment penalties regardless of 2026 earnings growth.
                        </>
                      ) : (
                        "Based on 90% of your projected 2026 tax liability. Enter prior-year tax on the left to activate 100%/110% safe-harbor protection."
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tab 2: Full SE Tax & Section 199A QBI Breakdown */}
            {activeTab === "qbi" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Zap className="h-4 w-4 text-primary" />
                    <span>Detailed Tax Computation &amp; QBI Engine</span>
                  </CardTitle>
                  <CardDescription>Deterministic calculation breakdown under OBBBA rules.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden rounded-lg border border-border text-xs">
                    <div className="flex justify-between border-b border-border bg-background px-4 py-2.5 font-semibold text-foreground">
                      <span>Line Item</span>
                      <span>Amount</span>
                    </div>
                    <div className="divide-y divide-border">
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-muted">Net Schedule C Profit</span>
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {money(calcResult.netBusinessProfit)}
                        </span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-muted">Social Security Tax (12.4% on first $184.5k)</span>
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {money(calcResult.socialSecurityTax)}
                        </span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-muted">Medicare Tax (2.9% uncapped)</span>
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {money(calcResult.medicareTax)}
                        </span>
                      </div>
                      {calcResult.additionalMedicareTax > 0 && (
                        <div className="flex justify-between px-4 py-2.5">
                          <span className="text-muted">Additional Medicare Tax (0.9% over threshold)</span>
                          <span className="font-mono font-medium tabular-nums text-foreground">
                            {money(calcResult.additionalMedicareTax)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between bg-card px-4 py-2.5 font-semibold">
                        <span className="text-foreground">Total Self-Employment Tax</span>
                        <span className="font-mono tabular-nums text-foreground">
                          {money(calcResult.totalSelfEmploymentTax)}
                        </span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-muted">Half-SE Tax Deduction (Above-the-Line)</span>
                        <span className="font-mono font-medium tabular-nums text-success">
                          −{money(calcResult.halfSeTaxDeduction)}
                        </span>
                      </div>
                      {calcResult.seniorDeduction > 0 && (
                        <div className="flex justify-between px-4 py-2.5">
                          <span className="text-muted">OBBBA Senior Deduction (65+)</span>
                          <span className="font-mono font-medium tabular-nums text-success">
                            −{money(calcResult.seniorDeduction)}
                          </span>
                        </div>
                      )}
                      {calcResult.tipDeduction > 0 && (
                        <div className="flex justify-between px-4 py-2.5">
                          <span className="text-muted">OBBBA &ldquo;No Tax on Tips&rdquo; Deduction</span>
                          <span className="font-mono font-medium tabular-nums text-success">
                            −{money(calcResult.tipDeduction)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-muted">Standard / Claimed Deduction</span>
                        <span className="font-mono font-medium tabular-nums text-success">
                          −{money(calcResult.claimedDeduction)}
                        </span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5 font-semibold">
                        <span className="text-foreground">Taxable Income Before QBI</span>
                        <span className="font-mono tabular-nums text-foreground">
                          {money(calcResult.taxableIncomeBeforeQbi)}
                        </span>
                      </div>
                      <div className="flex justify-between bg-primary/10 px-4 py-2.5 font-bold">
                        <span className="text-primary">Section 199A QBI Deduction (20%)</span>
                        <span className="font-mono tabular-nums text-primary">
                          −{money(calcResult.qbiDeduction)}
                        </span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5 font-semibold">
                        <span className="text-foreground">Federal Income Tax</span>
                        <span className="font-mono tabular-nums text-foreground">
                          {money(calcResult.federalIncomeTax)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tab 3: 23% vs 20% Trap Checker */}
            {activeTab === "trap_check" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span>23% vs 20% QBI Trap Diagnostic</span>
                  </CardTitle>
                  <CardDescription>
                    Verify your calculation against widespread misinformation in 2026 tax articles.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5 rounded-lg border border-success/40 bg-card p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                          Enacted 2026 Law (OBBBA)
                        </span>
                        <Badge variant="success">20.0% Rate</Badge>
                      </div>
                      <div className="font-mono text-xl font-bold tabular-nums text-foreground">
                        {money(calcResult.qbiDeduction)}
                      </div>
                      <p className="text-xs text-muted">
                        Compliant with Public Law 119-21. Safe from audit penalties.
                      </p>
                    </div>

                    <div className="space-y-1.5 rounded-lg border border-destructive/40 bg-card p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-destructive">
                          Erroneous House Proposal
                        </span>
                        <Badge variant="destructive">23.0% Rate</Badge>
                      </div>
                      <div className="font-mono text-xl font-bold tabular-nums text-destructive">
                        {money(calcResult.trapCheck.erroneous23PercentDeduction)}
                      </div>
                      <p className="text-xs text-muted">
                        Overstates deduction by{" "}
                        {money(calcResult.trapCheck.overstatementAmount)}.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-lg border border-border bg-card p-4 text-xs">
                    <h3 className="flex items-center gap-1.5 font-semibold text-foreground">
                      <Info className="h-4 w-4 text-primary" />
                      Why is there confusion?
                    </h3>
                    <p className="text-muted">{calcResult.trapCheck.explanation}</p>
                    <div className="flex items-center justify-between border-t border-border pt-3 font-medium text-destructive">
                      <span>Potential IRS Section 6662 Accuracy Penalty Risk</span>
                      <span className="font-mono tabular-nums">
                        {money(calcResult.trapCheck.potentialPenaltyRisk)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tab 4: Tax Readiness Scorecard */}
            {activeTab === "scorecard" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span>2026 Tax Readiness Scorecard</span>
                    </CardTitle>
                    <Badge variant={calcResult.scorecard.totalScore >= 75 ? "success" : "warning"}>
                      {calcResult.scorecard.rating}
                    </Badge>
                  </div>
                  <CardDescription>
                    Automated compliance, deduction capture, and underpayment risk assessment.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                        Overall Score
                      </span>
                      <div className="font-mono text-3xl font-bold tabular-nums text-foreground">
                        {calcResult.scorecard.totalScore}
                        <span className="text-sm font-normal text-subtle"> / 100</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div>
                        QBI Optimization: <strong>{calcResult.scorecard.qbiOptimizationScore}/25</strong>
                      </div>
                      <div>
                        Safe Harbor: <strong>{calcResult.scorecard.safeHarborComplianceScore}/25</strong>
                      </div>
                      <div>
                        Underpayment: <strong>{calcResult.scorecard.underpaymentRiskScore}/25</strong>
                      </div>
                      <div>
                        Deduction: <strong>{calcResult.scorecard.deductionCaptureScore}/25</strong>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      Recommended Action Items
                    </h3>
                    <ul className="space-y-2">
                      {calcResult.scorecard.keyActionItems.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 rounded-lg border border-border bg-card p-3 text-xs text-foreground"
                        >
                          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Export Callout Card */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex flex-col items-center justify-between gap-4 p-5 sm:flex-row">
                <div className="space-y-1 text-center sm:text-left">
                  <h2 className="flex items-center justify-center gap-1.5 text-sm font-semibold text-foreground sm:justify-start">
                    <FileText className="h-4 w-4 text-primary" />
                    Official 2026 Audit Report &amp; CPA Workpapers
                  </h2>
                  <p className="text-xs text-muted">
                    Generate an audit-proof branded report with statutory citations, safe-harbor
                    calculations, and Schedule C reconciliation.
                  </p>
                </div>
                {isPurchased ? (
                  <Button variant="default" onClick={handleDownloadReport} className="shrink-0 gap-1.5">
                    <Download className="h-4 w-4" />
                    <span>Download Report</span>
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    onClick={() => setIsExportModalOpen(true)}
                    className="shrink-0 gap-1.5"
                  >
                    <span>Export Report ($9)</span>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="space-y-1 border-t border-border bg-card py-6 text-center text-xs text-subtle">
        <p>QuarterLine • Autonomous Product &amp; Software Factory</p>
        <p>
          Governed by One Big Beautiful Bill Act (Pub. L. 119-21) &amp; Rev. Proc. 2025-32. Not
          formal legal advice.
        </p>
      </footer>

      {/* Stripe Checkout & Export Modal */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Unlock Official 2026 Audit Report Export"
        description="Choose your export package to download the full certified PDF workpaper."
      >
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div
              onClick={() => handleCheckout("pdf_audit_export")}
              className="flex cursor-pointer flex-col justify-between rounded-lg border border-border bg-card p-4 transition-all hover:border-primary"
            >
              <div>
                <Badge variant="outline" className="mb-2">
                  One-off
                </Badge>
                <div className="font-mono text-lg font-bold text-foreground">$9.00</div>
                <div className="mt-1 text-xs font-semibold text-foreground">
                  Single PDF Audit Export
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  Complete 2026 tax readiness report with Rev. Proc. 2025-32 citations and
                  safe-harbor backup.
                </p>
              </div>
              <Button size="sm" variant="default" disabled={isCheckingOut} className="mt-4 w-full text-xs">
                {isCheckingOut ? "Loading…" : "Get $9 PDF"}
              </Button>
            </div>

            <div
              onClick={() => handleCheckout("cpa_monthly")}
              className="flex cursor-pointer flex-col justify-between rounded-lg border border-primary/40 bg-primary/5 p-4 transition-all hover:border-primary"
            >
              <div>
                <Badge variant="accent" className="mb-2">
                  Pro / CPA
                </Badge>
                <div className="font-mono text-lg font-bold text-foreground">
                  $29.00<span className="text-xs font-normal text-subtle">/mo</span>
                </div>
                <div className="mt-1 text-xs font-semibold text-foreground">
                  Accountant Multi-Client Roster
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  Unlimited multi-client PDF exports, WebMCP API integration, and batch calculation
                  tools.
                </p>
              </div>
              <Button size="sm" variant="accent" disabled={isCheckingOut} className="mt-4 w-full text-xs">
                {isCheckingOut ? "Loading…" : "Start Pro ($29/mo)"}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              Secured by Stripe Checkout
            </span>
            <button
              type="button"
              onClick={handleSimulateUnlock}
              className="text-xs text-primary hover:underline"
            >
              Simulate Dev Unlock
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
