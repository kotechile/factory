/**
 * The rule machinery: one object per check, ordered, deterministic.
 *
 * Every check returns the findings it raised (empty array = the rule passed). A rule never
 * "repairs" input: it reports what is wrong and what to change. Reconciliation-dependent rules
 * (`requiresReconciliation`) are skipped when the document is too incomplete to recompute — the
 * blocking findings raised elsewhere already state which field is missing, so skipping is not a
 * silent pass.
 */
import type {
  EinvoiceInput,
  Finding,
  Reconciliation,
  Severity,
  TargetCountry,
  TargetFormat,
} from "../types";

export interface RuleContext {
  input: EinvoiceInput;
  country: TargetCountry;
  format: TargetFormat;
  reconciliation: Reconciliation | null;
}

export interface RuleFinding {
  fieldPath?: string;
  message?: string;
  fix?: string;
}

export interface Rule {
  ruleId: string;
  severity: Severity;
  fieldPath: string;
  message: string;
  fix: string;
  requiresReconciliation?: boolean;
  check: (ctx: RuleContext) => RuleFinding[];
}

export function runRules(rules: readonly Rule[], ctx: RuleContext): Finding[] {
  const findings: Finding[] = [];
  for (const rule of rules) {
    if (rule.requiresReconciliation && ctx.reconciliation === null) continue;
    for (const raised of rule.check(ctx)) {
      findings.push({
        ruleId: rule.ruleId,
        severity: rule.severity,
        fieldPath: raised.fieldPath ?? rule.fieldPath,
        message: raised.message ?? rule.message,
        fix: raised.fix ?? rule.fix,
      });
    }
  }
  return findings;
}

export function isFilled(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}
