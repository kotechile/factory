/**
 * FacturGate engine entry points.
 *
 * `validateEinvoice` is the single deterministic gate: it runs the EN 16931 core rules (plus the
 * CIUS-FR overlay when the target country is France), recomputes every total from the lines, scores
 * the document, and — only when nothing blocks — emits the compliant CII or UBL artifact.
 *
 * No I/O, no network, no LLM. Every failure names a rule id; nothing is defaulted silently. The
 * only defaults are the *request* defaults, which are declared in the WebMCP schemas and rejected
 * loudly when an out-of-scope value is given.
 */
import { buildCoverage } from "./coverage";
import { serializeCii } from "./emit/facturx";
import { serializeUbl } from "./emit/ubl";
import { readEinvoiceXml } from "./read/xml";
import { reconcileInvoice } from "./reconcile";
import { CIUS_FR_RULES } from "./rules/ciusFr";
import { EN16931_RULES } from "./rules/en16931";
import { runRules, type RuleContext } from "./rules/engine";
import { scoreInvoice, verdictFor } from "./score";
import { TARGET_COUNTRIES } from "./vat";
import {
  EinvoiceFieldError,
  type EinvoiceInput,
  type EinvoiceReport,
  type EmittedDocument,
  type Finding,
  type Reconciliation,
  type TargetCountry,
  type TargetFormat,
} from "./types";

export const ENGINE_METADATA = {
  id: "einvoice_en16931_gate",
  name: "FacturGate — EU e-invoice pre-send gate & format converter",
  version: "1.0.0",
  description:
    "Deterministic EN 16931 / CIUS-FR pre-send validation, totals reconciliation and Factur-X (CII) / UBL 2.1 emission with a 0-100 readiness score.",
} as const;

/** Documented request defaults — part of the tool contract, never inferred from the document. */
export const DEFAULT_TARGET_FORMAT: TargetFormat = "facturx";
export const DEFAULT_TARGET_COUNTRY: TargetCountry = "FR";

const TARGET_FORMATS: readonly TargetFormat[] = ["facturx", "cii", "ubl"];

export function implementedRuleIds(): string[] {
  return [
    ...new Set([...EN16931_RULES.map((rule) => rule.ruleId), ...CIUS_FR_RULES.map((rule) => rule.ruleId)]),
  ];
}

export interface ResolvedTarget {
  format: TargetFormat;
  country: TargetCountry;
}

/**
 * Resolves the requested target. An out-of-scope country/format is an explicit error, never a
 * silent fall-back to the default (PRD §5 scope guard: rule sets exist for FR/PL/BE/DE only).
 */
export function resolveTarget(input: EinvoiceInput): ResolvedTarget {
  const format = input.targetFormat ?? DEFAULT_TARGET_FORMAT;
  const country = input.targetCountry ?? DEFAULT_TARGET_COUNTRY;
  if (!TARGET_FORMATS.includes(format)) {
    throw new EinvoiceFieldError(
      "BR-FG-11",
      "targetFormat",
      `"${format}" is not a target format v1 emits (${TARGET_FORMATS.join(", ")}).`,
    );
  }
  if (!TARGET_COUNTRIES.includes(country)) {
    throw new EinvoiceFieldError(
      "BR-FG-11",
      "targetCountry",
      `"${country}" has no rule set in v1 (${TARGET_COUNTRIES.join(", ")}).`,
    );
  }
  return { format, country };
}

function coverageNote() {
  const coverage = buildCoverage(implementedRuleIds());
  return {
    ...coverage,
    note:
      `${coverage.note} The BR-FR-* overlay applies when targetCountry is "FR"; the EN 16931 core ` +
      "rules apply to every target country.",
  };
}

function reportFor(
  findings: Finding[],
  reconciliation: Reconciliation | null,
  emitted?: EmittedDocument,
): EinvoiceReport {
  const blocking = findings.some((finding) => finding.severity === "blocking");
  const score = scoreInvoice(findings);
  const report: EinvoiceReport = {
    valid: !blocking,
    score,
    verdict: verdictFor(score, findings),
    findings,
    reconciliation,
    coverage: coverageNote(),
  };
  if (emitted) report.emitted = emitted;
  return report;
}

export function emitDocument(
  input: EinvoiceInput,
  reconciliation: Reconciliation,
  format: TargetFormat,
  country: TargetCountry,
): EmittedDocument {
  const serialized = format === "ubl" ? serializeUbl(input, country, reconciliation) : serializeCii(input, country, reconciliation);
  return {
    format,
    profile: serialized.profile,
    customizationId: serialized.customizationId,
    profileId: serialized.profileId,
    xml: serialized.xml,
    note: serialized.note,
  };
}

/**
 * Validates a canonical invoice model: rule findings + reconciliation + score, and the converted
 * artifact when nothing blocks. Throws `EinvoiceFieldError` only for an out-of-scope target or an
 * unexpected emission failure — a document problem is always reported as a finding.
 */
export function validateEinvoice(input: EinvoiceInput): EinvoiceReport {
  const { format, country } = resolveTarget(input);
  const baseContext: RuleContext = { input, country, format, reconciliation: null };

  const fieldFindings = runRules(EN16931_RULES, baseContext);

  let reconciliation: Reconciliation | null = null;
  let reconcileError: unknown = null;
  try {
    reconciliation = reconcileInvoice(input, country);
  } catch (error) {
    reconcileError = error;
  }

  const arithmeticContext: RuleContext = { ...baseContext, reconciliation };
  const arithmeticFindings = runRules(
    EN16931_RULES.filter((rule) => rule.requiresReconciliation),
    arithmeticContext,
  );
  const nationalFindings = country === "FR" ? runRules(CIUS_FR_RULES, arithmeticContext) : [];

  const findings: Finding[] = [...fieldFindings, ...arithmeticFindings, ...nationalFindings];

  if (reconcileError instanceof EinvoiceFieldError) {
    const alreadyReported = findings.some(
      (finding) => finding.ruleId === reconcileError.ruleId && finding.fieldPath === reconcileError.fieldPath,
    ) || (reconcileError as EinvoiceFieldError).ruleId === "BR-16" && findings.some((f) => f.ruleId === "BR-16");
    if (!alreadyReported) {
      findings.push({
        ruleId: reconcileError.ruleId,
        severity: "blocking",
        fieldPath: reconcileError.fieldPath,
        message: `the document could not be reconciled: ${reconcileError.message}`,
        fix: "Supply the missing field — the engine recomputes every total from the lines and will not substitute a default.",
      });
    }
  } else if (reconcileError) {
    throw reconcileError;
  }

  const emitted =
    reconciliation && !findings.some((finding) => finding.severity === "blocking")
      ? emitDocument(input, reconciliation, format, country)
      : undefined;

  return reportFor(findings, reconciliation, emitted);
}

/** The converter path: the same gate, forced to the Factur-X (CII, EN 16931) artifact. */
export function convertInvoiceToFacturX(input: EinvoiceInput): EinvoiceReport {
  return validateEinvoice({ ...input, targetFormat: "facturx" });
}

/**
 * Validates an existing CII / UBL 2.1 document as-is (read layer). An unreadable document is
 * reported as a blocking BR-FG-10 finding rather than an empty finding list.
 */
export function validateEinvoiceXml(
  xml: string,
  options: { targetFormat?: TargetFormat; targetCountry?: TargetCountry } = {},
): EinvoiceReport {
  try {
    const parsed = readEinvoiceXml(xml);
    return validateEinvoice({ ...parsed, ...options });
  } catch (error) {
    if (error instanceof EinvoiceFieldError) {
      return reportFor(
        [
          {
            ruleId: error.ruleId,
            severity: "blocking",
            fieldPath: error.fieldPath,
            message: `the document could not be read: ${error.message}`,
            fix:
              "Send a CII CrossIndustryInvoice or a UBL 2.1 Invoice. National serializations (PL KSeF FA(3)), PDF/A-3 hybrids and e-reporting messages are out of v1 scope.",
          },
        ],
        null,
      );
    }
    throw error;
  }
}

export * from "./types";
export * from "./coverage";
export * from "./score";
export * from "./vat";
export { reconcileInvoice, roundingPolicyFor, lineNetCents, toCents, fromCents, roundHalfUp, VAT_ROUNDING_POLICY } from "./reconcile";
export { runRules, isFilled, isFiniteNumber, isIsoDate } from "./rules/engine";
export type { Rule, RuleContext, RuleFinding } from "./rules/engine";
export {
  ALL_CATEGORIES,
  BELOW_EN16931,
  CATEGORIES_REQUIRING_EXEMPTION_REASON,
  CATEGORY_RULE_PREFIX,
  EN16931_RULES,
  EN16931_TYPE_CODES,
  PROFILE_LABELS,
  REC20_UNIT_CODES,
  parseSpecificationProfile,
} from "./rules/en16931";
export { CIUS_FR_RULES } from "./rules/ciusFr";
export { serializeCii } from "./emit/facturx";
export type { SerializedXml } from "./emit/facturx";
export { serializeUbl } from "./emit/ubl";
export { readEinvoiceXml } from "./read/xml";
