/**
 * The tax layer (PRD §2 `taxLayer.ts`): §179, then bonus depreciation, then straight-line — applied
 * **by tax year**, never as one blended deduction.
 *
 * The rule table is data with a citation per year, deliberately small: a year the factory can cite
 * from a primary source is present, and a year that is not is an **explicit error**, never a guessed
 * limit, percentage or phase-out threshold. The 2026 entry is the one the recon PRD cites
 * (section179.org 2026 limits: $2,560,000 limit, phase-out from $4,090,000, 100% bonus depreciation
 * under OBBBA, property placed in service by 2026-12-31).
 */
import type {
  DepreciationSchedule,
  DepreciationYear,
  TaxYearRule,
  UnstatedField,
} from "./types";
import { CaseProofInputError, roundCents } from "./money";

export const TAX_YEAR_RULES: TaxYearRule[] = [
  {
    taxYear: 2026,
    section179LimitCents: 256_000_000,
    section179PhaseOutCents: 409_000_000,
    bonusDepreciationPct: 100,
    inServiceDeadline: "2026-12-31",
    bonusNote:
      "100% first-year bonus depreciation on qualifying property acquired and placed in service (OBBBA).",
    source:
      "section179.org — 2026 Section 179 limits ($2,560,000 limit, $4,090,000 phase-out threshold) and the 2026-12-31 placed-in-service deadline; 100% bonus depreciation under OBBBA.",
  },
];

/**
 * Years the factory has no cited rule for. Listed explicitly (rather than omitted) so a caller who
 * asks for them gets a named refusal instead of silence.
 */
export const UNSUPPORTED_TAX_YEARS: { taxYear: number; reason: string }[] = [
  {
    taxYear: 2025,
    reason:
      "No cited §179 limit / phase-out / bonus rate for 2025 is held in this repo, and a guessed one would be indistinguishable from a real one in the output.",
  },
];

/** The cited rule for a tax year, or an explicit refusal naming the years v1 ships. */
export function resolveTaxYear(taxYear: number): TaxYearRule {
  const rule = TAX_YEAR_RULES.find((entry) => entry.taxYear === taxYear);
  if (!rule) {
    throw new CaseProofInputError(
      "cp-tax-year-unsupported",
      "finance.inServiceTaxYear",
      `No cited §179 / bonus-depreciation rule for tax year ${taxYear}. CaseProof v1 ships ` +
        `${TAX_YEAR_RULES.map((entry) => entry.taxYear).join(", ")} ` +
        `(${TAX_YEAR_RULES[0]?.source ?? "no source"}). A year without a cited rule is not estimated.`,
    );
  }
  return rule;
}

export interface DepreciationInput {
  /** Tangible personal property placed in service: equipment + install + freight. */
  qualifyingBasisCents: number;
  /** The §179 amount the buyer elects to expense (0 = an explicit decision to elect nothing). */
  electedCents: number;
  taxYear: number;
  /** Class life for the straight-line residual; only needed when §179 + bonus leave a basis. */
  recoveryYears?: number;
  horizonYears: number;
}

/**
 * The by-tax-year schedule.
 *
 * 1. **§179** — the dollar limit is reduced by $1 for every $1 of qualifying property placed in
 *    service above the phase-out threshold; the election delivers `min(elected, reducedLimit)`.
 * 2. **Bonus** — the cited percentage of what §179 left.
 * 3. **Straight-line** — whatever is left, over the buyer's stated class life. With 2026's 100%
 *    bonus the residual is normally zero, so an unstated class life changes nothing and is only
 *    reported as unstated when it would actually move a number.
 */
export function buildDepreciationSchedule(input: DepreciationInput): {
  schedule: DepreciationSchedule;
  unstated: UnstatedField[];
} {
  const rule = resolveTaxYear(input.taxYear);
  const basis = Math.max(0, roundCents(input.qualifyingBasisCents));
  const elected = Math.max(0, roundCents(input.electedCents));

  const excess = Math.max(0, basis - rule.section179PhaseOutCents);
  const allowedLimitCents = Math.max(0, rule.section179LimitCents - excess);
  const phaseOutReductionCents = rule.section179LimitCents - allowedLimitCents;
  const allowedCents = Math.min(elected, allowedLimitCents, basis);
  const remainingBasisCents = basis - allowedCents;
  const bonusCents = roundCents(remainingBasisCents * (rule.bonusDepreciationPct / 100));
  const straightLineBasisCents = remainingBasisCents - bonusCents;
  const recoveryYears = input.recoveryYears;

  const unstated: UnstatedField[] = [];
  const notes: string[] = [];

  if (phaseOutReductionCents > 0) {
    notes.push(
      `§179 phase-out binds: $${(excess / 100).toLocaleString("en-US")} of property above the $${(
        rule.section179PhaseOutCents / 100
      ).toLocaleString("en-US")} threshold cut the $${(rule.section179LimitCents / 100).toLocaleString("en-US")} dollar limit to $${(
        allowedLimitCents / 100
      ).toLocaleString("en-US")} (−$${(phaseOutReductionCents / 100).toLocaleString("en-US")}).`,
    );
  }
  if (elected > allowedLimitCents) {
    notes.push(
      `The stated §179 election of $${(elected / 100).toLocaleString("en-US")} exceeds what the year allows; the model expenses $${(
        allowedCents / 100
      ).toLocaleString("en-US")} and depreciates the rest rather than ignoring the limit.`,
    );
  }

  let straightLinePerYear = 0;
  if (straightLineBasisCents > 0) {
    if (recoveryYears === undefined || recoveryYears <= 0) {
      straightLinePerYear = 0;
      unstated.push({
        field: "option.capex.recoveryYears",
        label: "Class life for the straight-line residual",
        detail:
          "§179 and bonus depreciation do not absorb the whole basis, so the residual needs the buyer's class life to be depreciated. It is not assumed.",
      });
      notes.push(
        `$${(straightLineBasisCents / 100).toLocaleString("en-US")} of basis is left after §179 and bonus and is NOT depreciated: no class life was stated.`,
      );
    } else {
      straightLinePerYear = roundCents(straightLineBasisCents / recoveryYears);
    }
  } else {
    notes.push(
      `§179 + ${rule.bonusDepreciationPct}% bonus absorb the whole basis — no class life is needed for this property.`,
    );
  }

  const years: DepreciationYear[] = [];
  let remainingStraightLine = straightLineBasisCents;
  for (let index = 0; index < Math.max(1, Math.floor(input.horizonYears)); index += 1) {
    const isFirst = index === 0;
    // Never depreciate more than the basis: the last year takes what is left.
    const straightLine = Math.min(straightLinePerYear, remainingStraightLine);
    remainingStraightLine -= straightLine;
    years.push({
      taxYear: rule.taxYear + index,
      section179Cents: isFirst ? allowedCents : 0,
      bonusCents: isFirst ? bonusCents : 0,
      straightLineCents: straightLine,
      totalCents: (isFirst ? allowedCents + bonusCents : 0) + straightLine,
    });
  }
  if (remainingStraightLine > 0) {
    notes.push(
      `$${(remainingStraightLine / 100).toLocaleString("en-US")} of the remaining basis is not depreciated inside the ${Math.floor(
        input.horizonYears,
      )}-year horizon — a longer horizon carries it.`,
    );
  }

  return {
    schedule: {
      taxYear: rule.taxYear,
      qualifyingBasisCents: basis,
      electedCents: elected,
      allowedLimitCents,
      phaseOutReductionCents,
      allowedCents,
      remainingBasisCents,
      bonusPct: rule.bonusDepreciationPct,
      years,
      rule,
      notes,
    },
    unstated,
  };
}

/** The in-service deadline for the case's tax year — surfaced in the report, not buried. */
export function inServiceDeadline(taxYear: number): string {
  return resolveTaxYear(taxYear).inServiceDeadline;
}
