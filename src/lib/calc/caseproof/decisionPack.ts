/**
 * The decision pack — the deliverable that leaves the tool (PRD §2 `decisionPack`).
 *
 * v1 ships the **CSV** decision pack: the assumption scoresheet with break-evens, the vendor-vs-buyer
 * payback chain, the by-tax-year cash flow and the ranked list to confirm in writing. It is built from
 * the same numbers the page shows, so a committee reading the pack and a buyer reading the page cannot
 * be looking at different arithmetic. A branded PDF is not built here — see `coverage.ts`.
 */
import type { CaseAudit, DecisionPack } from "./types";
import { formatUsd } from "./money";
import { formatLeverValue } from "./money";

const HEADERS = [
  "section",
  "field",
  "label",
  "buyer_value",
  "vendor_value",
  "break_even_value",
  "verdict",
  "headroom_pct",
  "detail",
];

function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function row(cells: (string | number | null | undefined)[]): string {
  return cells.map(csvCell).join(",");
}

export function buildDecisionPack(input: { audit: CaseAudit; label: string | null }): DecisionPack {
  const { audit, label } = input;
  const lines: string[] = [];

  // No clock in the deterministic core: the pack carries the case's own provenance (label, engine
  // version, tax year), never a generation timestamp, so two runs of a case are byte-identical.
  lines.push(row(["#decision_pack", label ?? "automation business case", "tax_year", audit.buyerRun.depreciation.rule.taxYear]));
  lines.push(row(["#verdict", audit.verdict.status, audit.verdict.headline]));
  for (const reason of audit.verdict.reasons) lines.push(row(["#verdict_reason", reason]));
  lines.push("");

  lines.push(row(HEADERS));
  for (const finding of audit.findings) {
    lines.push(
      row([
        "assumption",
        finding.field,
        finding.label,
        finding.buyerValue === null ? "unstated" : formatLeverValue(finding.buyerValue, finding.unit),
        finding.vendorValue === null ? "not stated" : formatLeverValue(finding.vendorValue, finding.unit),
        finding.breakEvenValue === null ? "unverifiable" : formatLeverValue(finding.breakEvenValue, finding.unit),
        finding.verdict,
        finding.headroomPct ?? "",
        finding.message,
      ]),
    );
  }
  for (const field of audit.unstated) {
    lines.push(row(["unstated", field.field, field.label, "unstated", "", "", "unstated", "", field.detail]));
  }
  lines.push("");

  lines.push(
    row([
      "payback",
      "vendor_basis",
      audit.vendorRun.result ? `${audit.vendorRun.result.paybackMonths ?? "never"}` : "",
      audit.vendorRun.reason ?? "the vendor's own assumptions re-run through the same engine",
    ]),
  );
  lines.push(
    row([
      "payback",
      "buyer_basis",
      audit.buyerRun.paybackMonths ?? "never",
      audit.buyerRun.paybackBasis,
    ]),
  );
  for (const driver of audit.drivers) {
    lines.push(
      row([
        "driver",
        driver.field,
        driver.label,
        formatLeverValue(driver.fromValue, driver.unit),
        formatLeverValue(driver.toValue, driver.unit),
        driver.paybackAfterMonths ?? "never",
        driver.addedMonths === null ? "" : `added ${driver.addedMonths} months`,
        driver.detail,
      ]),
    );
  }
  lines.push("");

  lines.push(row(["#cash_flow", "year", "tax_year", "net", "cumulative", "labour", "downtime", "error", "maintenance", "software", "debt_service", "lease_raas", "outlay", "tax_benefit"]));
  for (const year of audit.buyerRun.years) {
    lines.push(
      row([
        "cash_flow",
        year.year,
        year.taxYear,
        formatUsd(year.netCents),
        formatUsd(year.cumulativeCents),
        formatUsd(year.labourSavingCents),
        formatUsd(year.downtimeCents),
        formatUsd(year.errorSavingCents),
        formatUsd(year.maintenanceCents),
        formatUsd(year.softwareCents),
        formatUsd(year.debtServiceCents),
        formatUsd(year.leasePaymentCents),
        formatUsd(year.outlayCents),
        formatUsd(year.taxBenefitCents),
      ]),
    );
  }
  lines.push("");

  for (const year of audit.buyerRun.depreciation.years) {
    lines.push(
      row([
        "depreciation",
        year.taxYear,
        `section179 ${formatUsd(year.section179Cents)}`,
        `bonus ${formatUsd(year.bonusCents)}`,
        `straight_line ${formatUsd(year.straightLineCents)}`,
        `total ${formatUsd(year.totalCents)}`,
        audit.buyerRun.depreciation.rule.source,
      ]),
    );
  }
  lines.push("");

  lines.push(row(["#metrics", "payback_months", audit.buyerRun.paybackMonths ?? "never"]));
  lines.push(row(["#metrics", "npv_at_hurdle", formatUsd(audit.buyerRun.npvCents)]));
  lines.push(row(["#metrics", "irr_pct", audit.buyerRun.irrPct ?? "undefined", audit.buyerRun.irrBasis]));
  lines.push(row(["#metrics", "upfront_outlay", formatUsd(audit.buyerRun.upfrontCents)]));
  lines.push(row(["#metrics", "note", audit.buyerRun.labour.notes.join(" ")]));
  lines.push("");

  lines.push(row(["#coverage_implemented", audit.coverage.implementedRuleIds.join(" ")]));
  lines.push(row(["#coverage_excluded", audit.coverage.unsupportedFamilies.join(" | ")]));

  return {
    csv: `${lines.join("\n")}\n`,
    formats: ["csv"],
    note:
      "CSV decision pack. It carries the assumption scoresheet with break-evens, the vendor-vs-buyer " +
      "payback chain, the by-tax-year cash flow and the coverage disclosure, so a committee can " +
      "re-derive every number. A branded PDF export is not part of v1.",
  };
}
