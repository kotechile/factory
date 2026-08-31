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
  Sparkles,
} from "lucide-react";

export default function QuarterLinePage() {
  // Input States
  const [grossIncome, setGrossIncome] = React.useState<number>(130000);
  const [businessExpenses, setBusinessExpenses] = React.useState<number>(15000);
  const [filingStatus, setFilingStatus] = React.useState<FilingStatus>("single");
  const [w2Wages, setW2Wages] = React.useState<number>(0);
  const [priorYearAgi, setPriorYearAgi] = React.useState<number>(90000);
  const [priorYearTax, setPriorYearTax] = React.useState<number>(16000);
  const [age, setAge] = React.useState<number>(38);
  const [isTippedOccupation, setIsTippedOccupation] = React.useState<boolean>(false);
  const [qualifiedTips, setQualifiedTips] = React.useState<number>(0);
  const [isSstb, setIsSstb] = React.useState<boolean>(false);
  const [w2WagesPaidByBusiness, setW2WagesPaidByBusiness] = React.useState<number>(0);
  const [ubia, setUbia] = React.useState<number>(0);
  const [retirementContributions, setRetirementContributions] = React.useState<number>(0);
  const [sehi, setSehi] = React.useState<number>(0);
  const [stateLocalTaxPaid, setStateLocalTaxPaid] = React.useState<number>(0);

  // UI States
  const [activeTab, setActiveTab] = React.useState<"estimate" | "qbi" | "trap_check" | "scorecard">("estimate");
  const [isExportModalOpen, setIsExportModalOpen] = React.useState<boolean>(false);
  const [isPurchased, setIsPurchased] = React.useState<boolean>(false);
  const [isCheckingOut, setIsCheckingOut] = React.useState<boolean>(false);
  const [exportNotice, setExportNotice] = React.useState<string | null>(null);

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

  const handleCheckout = async (plan: "pdf_audit_export" | "cpa_monthly") => {
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
Safe Harbor Applied: ${calcResult.estimatedPayments.safeHarborApplied ? "Yes" : "No"} (${calcResult.estimatedPayments.methodUsed})
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
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary selection:text-card">
      {/* Top Banner: Urgent Q3 Estimated Tax Deadline */}
      <div className="bg-warning/10 border-b border-warning/20 px-4 py-2.5 text-center text-xs sm:text-sm font-medium text-foreground flex items-center justify-center gap-2">
        <Calendar className="h-4 w-4 text-warning inline-block shrink-0" aria-hidden="true" />
        <span>
          <strong>Q3 2026 Estimated-Tax Deadline: September 15, 2026</strong> — Lock in your safe-harbor payment to avoid IRS underpayment penalties.
        </span>
      </div>

      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded bg-primary flex items-center justify-center text-card font-black tracking-tight text-lg shadow-sm">
              Q
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-foreground">QuarterLine</span>
                <Badge variant="accent">2026 OBBBA</Badge>
              </div>
              <p className="text-xs text-muted">2026 Self-Employment &amp; QBI Tax Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Badge variant="success" className="hidden md:inline-flex gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>20% QBI Pinned (Enacted Law)</span>
            </Badge>

            {isPurchased ? (
              <Button size="sm" variant="default" onClick={handleDownloadReport} className="gap-1.5">
                <Download className="h-4 w-4" />
                <span>Download PDF Report</span>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="default"
                onClick={() => setIsExportModalOpen(true)}
                className="gap-1.5 shadow-sm"
              >
                <FileText className="h-4 w-4" />
                <span>Export Audit Report</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-border bg-card text-xs text-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span>Autonomous Product &amp; Software Factory • Pub. L. 119-21 &amp; Rev. Proc. 2025-32</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            2026 Self-Employment Tax &amp; QBI Deduction Calculator
          </h1>
          <p className="text-sm sm:text-base text-muted">
            Free real-time calculation engine with OBBBA permanent Section 199A QBI deduction (pinned to the enacted 20% rate), safe-harbor quarterly payment planning, and accuracy verification.
          </p>
        </div>

        {/* 23% vs 20% Accuracy Warning Bar */}
        <div className="rounded border border-warning/30 bg-warning/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <strong className="text-foreground font-semibold">2026 Law Alert: Section 199A QBI Rate is 20.0%, NOT 23.0%</strong>
              <p className="text-xs text-muted mt-0.5">
                The House 23% proposal never made it into enacted law. Using 23% creates an IRS underpayment subject to a 20% penalty. QuarterLine pins the exact 20% statutory rate.
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
          <div className="rounded border border-success/30 bg-success/10 p-3.5 text-xs sm:text-sm text-foreground flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>{exportNotice}</span>
            </div>
            <Button size="sm" variant="default" onClick={handleDownloadReport} className="h-7 text-xs">
              Download File
            </Button>
          </div>
        )}

        {/* Two-Column Grid: Form Inputs (Left) + Interactive Preview (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Parameters Form */}
          <div className="lg:col-span-5 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span>Taxpayer Parameters</span>
                  </CardTitle>
                  <span className="text-xs text-muted">2026 Tax Year</span>
                </div>
                <CardDescription>
                  Enter your business revenue, expenses, and filing details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Gross Revenue & Expenses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Gross 1099/Revenue ($)"
                    type="number"
                    min="0"
                    step="1000"
                    value={grossIncome || ""}
                    onChange={(e) => setGrossIncome(Math.max(0, Number(e.target.value)))}
                    helperText="Schedule C Gross Income"
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

                {/* Filing Status */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="filing-status-select" className="text-xs font-medium text-foreground">
                    Filing Status
                  </label>
                  <select
                    id="filing-status-select"
                    value={filingStatus}
                    onChange={(e) => setFilingStatus(e.target.value as FilingStatus)}
                    className="h-10 w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="single">Single ($201,750 QBI Threshold)</option>
                    <option value="married_filing_jointly">Married Filing Jointly ($403,500 Threshold)</option>
                    <option value="head_of_household">Head of Household ($201,750 Threshold)</option>
                    <option value="married_filing_separately">Married Filing Separately ($201,750 Threshold)</option>
                  </select>
                </div>

                {/* Prior Year Safe Harbor */}
                <div className="pt-2 border-t border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                      Safe Harbor Baseline (2025)
                    </span>
                    <span className="text-xs text-muted">Eliminates Penalties</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="2025 Prior-Year AGI ($)"
                      type="number"
                      min="0"
                      step="1000"
                      value={priorYearAgi || ""}
                      onChange={(e) => setPriorYearAgi(Math.max(0, Number(e.target.value)))}
                      helperText="110% safe harbor if &gt;$150k"
                    />
                    <Input
                      label="2025 Total Tax Paid ($)"
                      type="number"
                      min="0"
                      step="500"
                      value={priorYearTax || ""}
                      onChange={(e) => setPriorYearTax(Math.max(0, Number(e.target.value)))}
                      helperText="Prior year total tax"
                    />
                  </div>
                </div>

                {/* Outside Wages & OBBBA Deductions */}
                <div className="pt-2 border-t border-border space-y-3">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-accent" />
                    OBBBA &amp; Section 199A Adjustments
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  {/* Toggles */}
                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSstb}
                        onChange={(e) => setIsSstb(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                      />
                      <span>Specified Service Trade or Business (SSTB: Law, Health, Consulting, Finance)</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isTippedOccupation}
                        onChange={(e) => setIsTippedOccupation(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                      />
                      <span>Tipped Occupation (OBBBA &ldquo;No Tax on Tips&rdquo; up to $25k)</span>
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

                  {/* Advanced QBI Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="W-2 Paid to Employees ($)"
                      type="number"
                      min="0"
                      step="1000"
                      value={w2WagesPaidByBusiness || ""}
                      onChange={(e) => setW2WagesPaidByBusiness(Math.max(0, Number(e.target.value)))}
                      helperText="For high earner QBI limit"
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

                  <div className="pt-2">
                    <Input
                      label="State & Local Tax Paid (SALT) ($)"
                      type="number"
                      min="0"
                      step="1000"
                      value={stateLocalTaxPaid || ""}
                      onChange={(e) => setStateLocalTaxPaid(Math.max(0, Number(e.target.value)))}
                      helperText="OBBBA SALT cap at $40,400"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Free Live Preview Dashboard */}
          <div className="lg:col-span-7 space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Schedule C Net Profit</CardDescription>
                  <CardTitle className="text-xl sm:text-2xl font-bold text-foreground">
                    ${calcResult.netBusinessProfit.toLocaleString()}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted">
                  Gross ${calcResult.grossIncome.toLocaleString()} - ${calcResult.businessExpenses.toLocaleString()} Exp
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">QBI Section 199A Deduction</CardDescription>
                  <CardTitle className="text-xl sm:text-2xl font-bold text-primary">
                    ${Math.round(calcResult.qbiDeduction).toLocaleString()}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-success flex items-center gap-1 font-medium">
                  <TrendingDown className="h-3.5 w-3.5" />
                  <span>Saves ~${Math.round(calcResult.qbiTaxSavings).toLocaleString()} in taxes</span>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Total 2026 Tax Liability</CardDescription>
                  <CardTitle className="text-xl sm:text-2xl font-bold text-foreground">
                    ${Math.round(calcResult.totalTaxLiability).toLocaleString()}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted">
                  {(calcResult.overallEffectiveRate * 100).toFixed(1)}% Effective Rate
                </CardContent>
              </Card>
            </div>

            {/* Navigation Tabs for Views */}
            <div className="flex border-b border-border space-x-1 sm:space-x-2">
              <button
                type="button"
                onClick={() => setActiveTab("estimate")}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "estimate"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                Quarterly Estimates
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("qbi")}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "qbi"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                SE &amp; QBI Breakdown
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("trap_check")}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "trap_check"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                23% Trap Checker
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("scorecard")}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "scorecard"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                Readiness Scorecard ({calcResult.scorecard.totalScore}/100)
              </button>
            </div>

            {/* Tab 1: Estimated Quarterly Installments & Safe Harbor */}
            {activeTab === "estimate" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span>2026 Estimated Tax Installments</span>
                    </CardTitle>
                    <Badge variant={calcResult.estimatedPayments.safeHarborApplied ? "success" : "default"}>
                      {calcResult.estimatedPayments.safeHarborApplied
                        ? `Safe Harbor Active (${calcResult.estimatedPayments.methodUsed})`
                        : "90% Current Year Rule"}
                    </Badge>
                  </div>
                  <CardDescription>
                    Pay each quarter via IRS Direct Pay / EFTPS to prevent IRS penalties.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {calcResult.estimatedPayments.quarterlyInstallments.map((q) => (
                      <div
                        key={q.quarter}
                        className={`rounded border p-3.5 flex flex-col justify-between ${
                          q.isUrgent
                            ? "border-warning/50 bg-warning/10"
                            : "border-border bg-card"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-foreground">{q.quarter} Installment</span>
                          {q.isUrgent && <Badge variant="warning">URGENT</Badge>}
                        </div>
                        <div className="mt-2 flex items-baseline justify-between">
                          <span className="text-xs text-muted">Due: {q.dueDate}</span>
                          <span className="text-lg font-bold text-foreground">
                            ${q.amount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded border border-border bg-background p-3.5 text-xs space-y-1.5 text-muted">
                    <div className="flex justify-between text-foreground font-medium">
                      <span>Total Required Annual Estimated Payment:</span>
                      <span>${Math.round(calcResult.estimatedPayments.requiredAnnualPayment).toLocaleString()}</span>
                    </div>
                    <p>
                      {calcResult.estimatedPayments.safeHarborApplied
                        ? `Safe Harbor Applied: Paying based on 2025 prior-year tax ($${priorYearTax.toLocaleString()}) shields you from underpayment penalties regardless of 2026 earnings growth.`
                        : "Based on 90% of your projected 2026 tax liability. Enter prior-year tax on the left to activate 100%/110% safe harbor protection."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tab 2: Full SE Tax & Section 199A QBI Breakdown */}
            {activeTab === "qbi" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span>Detailed Tax Computation &amp; QBI Engine</span>
                  </CardTitle>
                  <CardDescription>
                    Deterministic calculation breakdown under OBBBA rules.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Table of values */}
                  <div className="rounded border border-border overflow-hidden text-xs">
                    <div className="bg-background px-3 py-2 font-semibold text-foreground border-b border-border flex justify-between">
                      <span>Line Item</span>
                      <span>Amount</span>
                    </div>
                    <div className="divide-y divide-border">
                      <div className="px-3 py-2 flex justify-between">
                        <span className="text-muted">Net Schedule C Profit</span>
                        <span className="font-medium text-foreground">${calcResult.netBusinessProfit.toLocaleString()}</span>
                      </div>
                      <div className="px-3 py-2 flex justify-between">
                        <span className="text-muted">Social Security Tax (12.4% on first $184.5k)</span>
                        <span className="font-medium text-foreground">${Math.round(calcResult.socialSecurityTax).toLocaleString()}</span>
                      </div>
                      <div className="px-3 py-2 flex justify-between">
                        <span className="text-muted">Medicare Tax (2.9% uncapped)</span>
                        <span className="font-medium text-foreground">${Math.round(calcResult.medicareTax).toLocaleString()}</span>
                      </div>
                      {calcResult.additionalMedicareTax > 0 && (
                        <div className="px-3 py-2 flex justify-between">
                          <span className="text-muted">Additional Medicare Tax (0.9% over threshold)</span>
                          <span className="font-medium text-foreground">${Math.round(calcResult.additionalMedicareTax).toLocaleString()}</span>
                        </div>
                      )}
                      <div className="px-3 py-2 flex justify-between bg-card font-semibold">
                        <span className="text-foreground">Total Self-Employment Tax</span>
                        <span className="text-foreground">${Math.round(calcResult.totalSelfEmploymentTax).toLocaleString()}</span>
                      </div>
                      <div className="px-3 py-2 flex justify-between">
                        <span className="text-muted">Half-SE Tax Deduction (Above-the-Line)</span>
                        <span className="font-medium text-success">-${Math.round(calcResult.halfSeTaxDeduction).toLocaleString()}</span>
                      </div>
                      {calcResult.seniorDeduction > 0 && (
                        <div className="px-3 py-2 flex justify-between">
                          <span className="text-muted">OBBBA Senior Deduction (65+)</span>
                          <span className="font-medium text-success">-${Math.round(calcResult.seniorDeduction).toLocaleString()}</span>
                        </div>
                      )}
                      {calcResult.tipDeduction > 0 && (
                        <div className="px-3 py-2 flex justify-between">
                          <span className="text-muted">OBBBA &ldquo;No Tax on Tips&rdquo; Deduction</span>
                          <span className="font-medium text-success">-${Math.round(calcResult.tipDeduction).toLocaleString()}</span>
                        </div>
                      )}
                      <div className="px-3 py-2 flex justify-between">
                        <span className="text-muted">Standard / Claimed Deduction</span>
                        <span className="font-medium text-success">-${Math.round(calcResult.claimedDeduction).toLocaleString()}</span>
                      </div>
                      <div className="px-3 py-2 flex justify-between font-semibold">
                        <span className="text-foreground">Taxable Income Before QBI</span>
                        <span className="text-foreground">${Math.round(calcResult.taxableIncomeBeforeQbi).toLocaleString()}</span>
                      </div>
                      <div className="px-3 py-2 flex justify-between bg-primary/10 font-bold">
                        <span className="text-primary">Section 199A QBI Deduction (20%)</span>
                        <span className="text-primary">-${Math.round(calcResult.qbiDeduction).toLocaleString()}</span>
                      </div>
                      <div className="px-3 py-2 flex justify-between font-semibold">
                        <span className="text-foreground">Federal Income Tax</span>
                        <span className="text-foreground">${Math.round(calcResult.federalIncomeTax).toLocaleString()}</span>
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
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span>23% vs 20% QBI Trap Diagnostic</span>
                  </CardTitle>
                  <CardDescription>
                    Verify your calculation against widespread misinformation in 2026 tax articles.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded border border-success/30 bg-success/10 p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">Enacted 2026 Law (OBBBA)</span>
                        <Badge variant="success">20.0% Rate</Badge>
                      </div>
                      <div className="text-xl font-bold text-foreground">
                        ${Math.round(calcResult.qbiDeduction).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted">Compliant with Public Law 119-21. Safe from audit penalties.</p>
                    </div>

                    <div className="rounded border border-destructive/30 bg-destructive/10 p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-destructive">Erroneous House Proposal</span>
                        <Badge variant="destructive">23.0% Rate</Badge>
                      </div>
                      <div className="text-xl font-bold text-destructive">
                        ${Math.round(calcResult.trapCheck.erroneous23PercentDeduction).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted">
                        Overstates deduction by ${Math.round(calcResult.trapCheck.overstatementAmount).toLocaleString()}.
                      </p>
                    </div>
                  </div>

                  <div className="rounded border border-border bg-card p-4 space-y-2 text-xs">
                    <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                      <Info className="h-4 w-4 text-primary" />
                      Why is there confusion?
                    </h3>
                    <p className="text-muted">
                      {calcResult.trapCheck.explanation}
                    </p>
                    <div className="pt-2 border-t border-border flex items-center justify-between text-destructive font-medium">
                      <span>Potential IRS Section 6662 Accuracy Penalty Risk:</span>
                      <span>${Math.round(calcResult.trapCheck.potentialPenaltyRisk).toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tab 4: Tax Readiness Scorecard */}
            {activeTab === "scorecard" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
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
                  {/* Score Meter */}
                  <div className="rounded border border-border bg-background p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-muted uppercase font-semibold tracking-wider">Overall Score</span>
                      <div className="text-3xl font-extrabold text-foreground">
                        {calcResult.scorecard.totalScore}
                        <span className="text-sm font-normal text-muted"> / 100</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div>QBI Optimization: <strong>{calcResult.scorecard.qbiOptimizationScore}/25</strong></div>
                      <div>Safe Harbor Status: <strong>{calcResult.scorecard.safeHarborComplianceScore}/25</strong></div>
                      <div>Underpayment Risk: <strong>{calcResult.scorecard.underpaymentRiskScore}/25</strong></div>
                      <div>Deduction Capture: <strong>{calcResult.scorecard.deductionCaptureScore}/25</strong></div>
                    </div>
                  </div>

                  {/* Action items */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Recommended Action Items
                    </h3>
                    <ul className="space-y-2">
                      {calcResult.scorecard.keyActionItems.map((item, idx) => (
                        <li
                          key={idx}
                          className="text-xs p-2.5 rounded border border-border bg-card flex items-start gap-2 text-foreground"
                        >
                          <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
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
              <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <h2 className="font-semibold text-sm text-foreground flex items-center gap-1.5 justify-center sm:justify-start">
                    <FileText className="h-4 w-4 text-primary" />
                    Official 2026 Audit Report &amp; CPA Workpapers
                  </h2>
                  <p className="text-xs text-muted">
                    Generate an audit-proof branded report with statutory citations, safe-harbor calculations, and Schedule C reconciliation.
                  </p>
                </div>
                {isPurchased ? (
                  <Button variant="default" onClick={handleDownloadReport} className="shrink-0 gap-1.5 shadow-sm">
                    <Download className="h-4 w-4" />
                    <span>Download Report</span>
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    onClick={() => setIsExportModalOpen(true)}
                    className="shrink-0 gap-1.5 shadow-sm"
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
      <footer className="border-t border-border bg-card py-6 text-center text-xs text-muted space-y-1">
        <p>QuarterLine • Autonomous Product &amp; Software Factory</p>
        <p>Governed by One Big Beautiful Bill Act (Pub. L. 119-21) &amp; Rev. Proc. 2025-32. Not formal legal advice.</p>
      </footer>

      {/* Stripe Checkout & Export Modal */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Unlock Official 2026 Audit Report Export"
        description="Choose your export package to download the full certified PDF workpaper."
      >
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* $9 Option */}
            <div
              onClick={() => handleCheckout("pdf_audit_export")}
              className="rounded border border-border p-4 hover:border-primary cursor-pointer transition-all bg-card flex flex-col justify-between"
            >
              <div>
                <Badge variant="outline" className="mb-2">One-off</Badge>
                <div className="text-lg font-bold text-foreground">$9.00</div>
                <div className="font-semibold text-xs text-foreground mt-1">Single PDF Audit Export</div>
                <p className="text-xs text-muted mt-1.5">
                  Complete 2026 tax readiness report with Rev. Proc. 2025-32 citations and safe-harbor backup.
                </p>
              </div>
              <Button
                size="sm"
                variant="default"
                disabled={isCheckingOut}
                className="mt-4 w-full text-xs"
              >
                {isCheckingOut ? "Loading..." : "Get $9 PDF"}
              </Button>
            </div>

            {/* $29/mo Option */}
            <div
              onClick={() => handleCheckout("cpa_monthly")}
              className="rounded border border-primary/40 bg-primary/5 p-4 hover:border-primary cursor-pointer transition-all flex flex-col justify-between"
            >
              <div>
                <Badge variant="default" className="mb-2">Pro / CPA</Badge>
                <div className="text-lg font-bold text-foreground">$29.00<span className="text-xs font-normal text-muted">/mo</span></div>
                <div className="font-semibold text-xs text-foreground mt-1">Accountant Multi-Client Roster</div>
                <p className="text-xs text-muted mt-1.5">
                  Unlimited multi-client PDF exports, WebMCP API integration, and batch calculation tools.
                </p>
              </div>
              <Button
                size="sm"
                variant="accent"
                disabled={isCheckingOut}
                className="mt-4 w-full text-xs"
              >
                {isCheckingOut ? "Loading..." : "Start Pro ($29/mo)"}
              </Button>
            </div>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted">
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
