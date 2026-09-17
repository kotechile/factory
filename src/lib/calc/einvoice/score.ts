/**
 * Pre-send readiness score (0–100) and verdict.
 *
 * Weights are deliberately simple and auditable: a blocking finding is a documented platform
 * rejection (the €50/invoice class), an advisory is a warning that does not stop submission.
 */
import type { Finding, Verdict } from "./types";

export const SCORE_WEIGHTS = { blocking: 20, advisory: 5 } as const;

export function scoreInvoice(findings: readonly Finding[]): number {
  const blocking = findings.filter((f) => f.severity === "blocking").length;
  const advisory = findings.filter((f) => f.severity === "advisory").length;
  const penalty = blocking * SCORE_WEIGHTS.blocking + advisory * SCORE_WEIGHTS.advisory;
  return Math.max(0, 100 - penalty);
}

export function verdictFor(score: number, findings: readonly Finding[]): Verdict {
  if (findings.some((f) => f.severity === "blocking")) return "blocked";
  return score === 100 ? "ready" : "ready-with-advisories";
}

export function countBySeverity(findings: readonly Finding[]): { blocking: number; advisory: number } {
  return {
    blocking: findings.filter((f) => f.severity === "blocking").length,
    advisory: findings.filter((f) => f.severity === "advisory").length,
  };
}
