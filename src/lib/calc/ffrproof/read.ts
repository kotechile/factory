/**
 * The input reader for FFRProof's declared path.
 *
 * The report (the SF-425 worksheet) is caller-declared — the human assembled it, so a missing or
 * malformed line is a loud validation error, not an `unstated` extraction finding. The award terms
 * and drawdown statement are DECLARED fields (from extraction, or pasted as declared JSON); the GL
 * export and approved budget are parsed deterministically from CSV.
 *
 * Money in the report is integer cents (a JSON number) or a plain dollar string (a JSON string such
 * as "$95,000.00") — a dollar string is parsed exactly, never rounded silently.
 */
import { parseApprovedBudgetCsv, parseGlExportCsv } from "./csv";
import { readAwardTermsRecord, readDrawdownRecord } from "./extraction";
import { FFRProofFieldError, parseUsdToCents, requireInteger } from "./money";
import type {
  ApprovedBudget,
  AwardTerms,
  DrawdownStatement,
  FfrAuditInput,
  FfrReport,
  GlExport,
} from "./types";

function readCents(value: unknown, fieldPath: string): number {
  if (typeof value === "string") return parseUsdToCents(value, fieldPath);
  return requireInteger(value, fieldPath);
}

function readRequiredString(value: unknown, fieldPath: string): string {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  throw new FFRProofFieldError(
    "ffr-field-invalid",
    fieldPath,
    `\`${fieldPath}\` is required and must be a non-empty string; received ${JSON.stringify(value)}. Nothing was audited.`,
  );
}

function readOptionalBoolean(value: unknown, fieldPath: string): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "boolean") return value;
  throw new FFRProofFieldError(
    "ffr-field-invalid",
    fieldPath,
    `\`${fieldPath}\` must be a boolean; received ${JSON.stringify(value)}. Nothing was audited.`,
  );
}

/** Validates the SF-425 worksheet (lines 10a–10k) into an `FfrReport`. */
export function readReport(raw: unknown): FfrReport {
  const r = (raw ?? {}) as Record<string, unknown>;
  const cents = (key: string) => readCents(r[key], key);
  return {
    cashReceiptsCents: cents("cashReceiptsCents"),
    cashDisbursementsCents: cents("cashDisbursementsCents"),
    cashOnHandCents: cents("cashOnHandCents"),
    totalFederalAwardCents: cents("totalFederalAwardCents"),
    federalExpendituresCents: cents("federalExpendituresCents"),
    unliquidatedObligationsCents: cents("unliquidatedObligationsCents"),
    federalShareCents: cents("federalShareCents"),
    unobligatedBalanceCents: cents("unobligatedBalanceCents"),
    requiredRecipientShareCents: cents("requiredRecipientShareCents"),
    recipientShareProvidedCents: cents("recipientShareProvidedCents"),
    remainingRecipientShareCents: cents("remainingRecipientShareCents"),
    periodEnd: readRequiredString(r.periodEnd, "periodEnd"),
    isFinal: readOptionalBoolean(r.isFinal, "isFinal"),
  };
}

export interface CompositeInput {
  report: FfrReport;
  awardTerms: AwardTerms;
  drawdown: DrawdownStatement;
  glExport: GlExport;
  approvedBudget: ApprovedBudget;
  priorReport: FfrReport | null;
  labels: string[];
  awardTermsFindings: import("./types").Finding[];
  drawdownFindings: import("./types").Finding[];
}

/**
 * Reads the full declared composite: report + declared award terms + declared drawdown statement +
 * GL CSV + approved-budget CSV (+ optional prior report). The deterministic path — no model.
 */
export function readCompositeInput(raw: unknown): CompositeInput {
  const root = (raw ?? {}) as Record<string, unknown>;

  const report = readReport(root.report);

  const awardRecord = readAwardTermsRecord(root.awardTerms);
  const drawdownRecord = readDrawdownRecord(root.drawdown);

  const glText = typeof root.glCsv === "string" ? root.glCsv : "";
  if (!glText.trim()) {
    throw new FFRProofFieldError(
      "ffr-gl-missing",
      "glCsv",
      "The GL export is required (as `glCsv` text). Nothing was audited.",
    );
  }
  const budgetText = typeof root.budgetCsv === "string" ? root.budgetCsv : "";
  if (!budgetText.trim()) {
    throw new FFRProofFieldError(
      "ffr-budget-missing",
      "budgetCsv",
      "The approved budget is required (as `budgetCsv` text). Nothing was audited.",
    );
  }
  const gl = parseGlExportCsv(glText).glExport;
  const budget = parseApprovedBudgetCsv(budgetText).approvedBudget;

  const priorReport =
    root.priorReport === null || root.priorReport === undefined ? null : readReport(root.priorReport);

  return {
    report,
    awardTerms: awardRecord.awardTerms,
    drawdown: drawdownRecord.drawdown,
    glExport: gl,
    approvedBudget: budget,
    priorReport,
    labels: [...awardRecord.labels, ...drawdownRecord.labels],
    awardTermsFindings: awardRecord.findings,
    drawdownFindings: drawdownRecord.findings,
  };
}

/** Builds the engine input from a composite. */
export function toAuditInput(composite: CompositeInput): FfrAuditInput {
  return {
    report: composite.report,
    drawdown: composite.drawdown,
    awardTerms: composite.awardTerms,
    glExport: composite.glExport,
    approvedBudget: composite.approvedBudget,
    priorReport: composite.priorReport,
  };
}
