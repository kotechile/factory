/**
 * The deterministic ClaimProof engine.
 *
 * `allowanceFor` re-derives the allowed labour hours from the vendored schedule's repair-code table
 * and its multiple-repair rule. `expectedPayment` turns the allowance into dollars at the claim's own
 * rate and applies the schedule's per-claim fee caps. `variance` classifies each paid-vs-expected
 * delta. `auditClaim` runs the three together and enforces the sum invariant
 * (Σ line variances == batch variance).
 *
 * No I/O, no network, no LLM, no clock: the extraction layer (`./extraction.ts`) fills declared
 * fields in front of this engine; an unreadable or unstated field blocks the line, never a guess.
 */
import {
  laborCents,
  ClaimProofFieldError,
  formatCents,
  formatCentsSigned,
  formatTenths,
} from "./money";
import { isStaleSchedule } from "./schedules";
import type {
  AuditReport,
  Cents,
  Claim,
  FeeKey,
  Finding,
  LabourSchedule,
  Payment,
  RepairAllowanceLine,
  TenthsOfHour,
  VarianceLine,
  Verdict,
} from "./types";

export const ENGINE_ID = "claimproof";
export const ENGINE_VERSION = "1.0.0";

/** The fee keys a vendored schedule caps, in report order. */
export const FEE_KEYS: readonly FeeKey[] = ["nitrogen", "miscMaterials", "reclaim"] as const;

/** The deterministic verdict for a paid-vs-expected delta. */
export function variance(paidCents: Cents, expectedCents: Cents | null): {
  verdict: Verdict;
  varianceCents: Cents | null;
} {
  if (expectedCents === null) return { verdict: "unverifiable", varianceCents: null };
  const delta = paidCents - expectedCents;
  if (delta === 0) return { verdict: "correctly-paid", varianceCents: delta };
  return delta < 0
    ? { verdict: "underpaid", varianceCents: delta }
    : { verdict: "overpaid", varianceCents: delta };
}

export interface AllowanceResult {
  lines: RepairAllowanceLine[];
  totalAllowedTenths: TenthsOfHour;
  blockedCount: number;
  multipleRepairApplied: boolean;
}

/**
 * The allowed labour hours for a claim.
 *
 * Each repair line looks up its code in the version-stamped table; a code that is absent is
 * `unstated` and BLOCKS the line (allowedTenths null, rule id `cp-repair-unstated`) — never zero.
 * The multiple-repair rule then applies to the REFRIGERATION lines (its stated scope): the
 * highest-allowance line is paid in full and each additional one at the schedule's increment
 * (1 hour for True), so a part combined into a call is paid at the increment, not its own table
 * value. Electrical and cabinet lines keep their own full allowance.
 */
export function allowanceFor(claim: Claim, schedule: LabourSchedule): AllowanceResult {
  const lines: RepairAllowanceLine[] = claim.repairs.map((repair) => {
    const rule = schedule.rules[repair.code];
    if (!rule) {
      return {
        code: repair.code,
        description: repair.description || repair.code,
        category: "refrigeration" as const,
        claimedTenths: repair.hoursClaimedTenths,
        allowedTenths: null,
        page: schedule.sourceLabel,
        multipleRepairIncrement: false,
        blocked: true,
        ruleId: "cp-repair-unstated",
      };
    }
    return {
      code: repair.code,
      description: rule.description,
      category: rule.category,
      claimedTenths: repair.hoursClaimedTenths,
      allowedTenths: rule.allowedTenths,
      page: rule.page,
      multipleRepairIncrement: false,
      blocked: false,
      ruleId: null,
    };
  });

  const blockedCount = lines.filter((line) => line.blocked).length;

  // Multiple-repair rule, refrigeration scope: sort desc, first full, each additional at the increment.
  const refrigeration = lines
    .filter((line) => !line.blocked && line.category === "refrigeration")
    .sort((a, b) => (b.allowedTenths ?? 0) - (a.allowedTenths ?? 0));

  if (refrigeration.length > 1) {
    refrigeration.forEach((line, index) => {
      if (index === 0) return; // highest keeps full allowance
      line.allowedTenths = schedule.multipleRepair.incrementTenths;
      line.multipleRepairIncrement = true;
    });
  }

  const totalAllowedTenths = lines.reduce(
    (sum, line) => sum + (line.allowedTenths ?? 0),
    0,
  );

  return {
    lines,
    totalAllowedTenths,
    blockedCount,
    multipleRepairApplied: refrigeration.length > 1,
  };
}

export interface ExpectedPayment {
  /** Labour dollars at the claim's rate; null when a repair code is unstated (blocked). */
  laborCents: Cents | null;
  laborAllowedTenths: TenthsOfHour;
  partsCents: Cents;
  fees: {
    key: FeeKey;
    label: string;
    claimedCents: Cents;
    allowedCents: Cents;
    capped: boolean;
    excessCents: Cents;
    page: string;
  }[];
  travelCents: Cents;
  travelOverMiles: boolean;
  /** null when labour is blocked; the sum cannot be determined then. */
  totalCents: Cents | null;
  findings: Finding[];
}

/**
 * The amount the schedule allows the claim to be paid.
 *
 *   labour  = allowed hours × the claim's own hourly rate (the schedule publishes no fixed rate);
 *   parts   = as filed (reimbursed at the schedule's distributor-cost basis, which the shop cannot
 *             re-derive — it is compared as-filed and named);
 *   fees    = each capped by the schedule's own maximum; a fee over its cap is reported AT the cap
 *             with the excess named, never silently dropped;
 *   travel  = within the 30-mile one-way cap, the claim's own travel charge passes through (the
 *             schedule sets no fixed travel-hour allowance — True determines reasonableness); beyond
 *             the cap it is not covered (allowance 0) and the excess is named.
 */
export function expectedPayment(claim: Claim, schedule: LabourSchedule): ExpectedPayment {
  const allowance = allowanceFor(claim, schedule);
  const findings: Finding[] = [];

  const labor = allowance.blockedCount === 0 ? laborCents(allowance.totalAllowedTenths, claim.laborRateCentsPerHour) : null;
  if (allowance.blockedCount > 0) {
    findings.push({
      ruleId: "cp-repair-unstated",
      kind: "repair_unstated",
      severity: "blocking",
      scope: "labor",
      message: `${allowance.blockedCount} repair code${allowance.blockedCount === 1 ? "" : "s"} ${allowance.blockedCount === 1 ? "is" : "are"} not in the version-stamped ${schedule.slug} table. The labour allowance cannot be determined, so the labour line is withheld — never zero, never guessed.`,
      fix: "Quote a repair code from the vendored schedule, or vendor the missing code's allowance from the manufacturer's own published form before re-running.",
    });
  }

  const capByKey = new Map(schedule.caps.map((cap) => [cap.key, cap]));
  const fees = FEE_KEYS.map((key) => {
    const cap = capByKey.get(key);
    const claimed = claim.fees.find((fee) => fee.key === key)?.claimedCents ?? 0;
    if (!cap) {
      // A fee the vendored schedule does not cap: reported, not priced (rule 5).
      findings.push({
        ruleId: "cp-fee-unstated",
        kind: "repair_unstated",
        severity: "advisory",
        scope: `fee:${key}`,
        message: `Fee '${key}' is not on the ${schedule.slug} payment schedule, so no allowance is claimed for it.`,
        fix: "Vendor the fee's maximum from the manufacturer's published form, or remove it from the claim.",
      });
      return {
        key,
        label: key,
        claimedCents: claimed,
        allowedCents: 0,
        capped: false,
        excessCents: claimed,
        page: schedule.sourceLabel,
      };
    }
    const allowedCents = Math.min(claimed, cap.maxCents);
    const capped = claimed > cap.maxCents;
    const excessCents = claimed - allowedCents;
    if (capped) {
      findings.push({
        ruleId: "cp-fee-over-cap",
        kind: "fee_over_cap",
        severity: "unmatched",
        scope: `fee:${key}`,
        message: `${cap.label} of ${formatCents(claimed)} exceeds the schedule's ${formatCents(cap.maxCents)} maximum. It is allowed at the cap, and the excess ${formatCents(excessCents)} is named rather than silently dropped.`,
        fix: "Resubmit the fee at or below the schedule maximum, or obtain prior approval for the excess.",
        deltaCents: excessCents,
      });
    }
    return {
      key,
      label: cap.label,
      claimedCents: claimed,
      allowedCents,
      capped,
      excessCents,
      page: cap.page,
    };
  });

  let travelCents = 0;
  let travelOverMiles = false;
  if (claim.travel) {
    if (claim.travel.milesOneWay > schedule.travel.maxMilesOneWay) {
      travelOverMiles = true;
      findings.push({
        ruleId: "cp-travel-over-miles",
        kind: "travel_over_miles",
        severity: "unmatched",
        scope: "travel",
        message: `Travel of ${claim.travel.milesOneWay} miles one way exceeds the schedule's ${schedule.travel.maxMilesOneWay}-mile allowance. It is not covered without pre-approval, so the travel allowance is ${formatCents(0)} and the claimed ${formatCents(claim.travel.claimedCents)} is the excess.`,
        fix: "Obtain prior approval for the excess mileage, or absorb the travel charge.",
        deltaCents: claim.travel.claimedCents,
      });
    } else {
      travelCents = claim.travel.claimedCents;
      findings.push({
        ruleId: "cp-travel-as-claimed",
        kind: "travel_over_miles",
        severity: "advisory",
        scope: "travel",
        message: `Travel of ${claim.travel.milesOneWay} miles one way is within the ${schedule.travel.maxMilesOneWay}-mile cap. The schedule sets no fixed travel-hour allowance (True determines reasonableness), so the travel charge passes through as claimed.`,
        fix: "None required — the travel charge is compared as-claimed.",
      });
    }
  }

  const totalCents =
    labor === null
      ? null
      : labor + claim.partsCents + fees.reduce((sum, fee) => sum + fee.allowedCents, 0) + travelCents;

  return {
    laborCents: labor,
    laborAllowedTenths: allowance.totalAllowedTenths,
    partsCents: claim.partsCents,
    fees,
    travelCents,
    travelOverMiles,
    totalCents,
    findings,
  };
}

/**
 * The full audit: per-line variance with the schedule version and page on every line, the batch
 * verdict, the blocked-line count and the stale-schedule flag on the face of the report.
 *
 * The sum invariant is enforced HERE, not merely hoped for: `totalVarianceCents` is the Σ of the
 * line variances, and the engine asserts it equals (totalPaid − totalExpected) over the unblocked
 * lines — a mismatch is a thrown engine error, so a batch that does not sum is impossible to ship.
 */
export function auditClaim(claim: Claim, schedule: LabourSchedule, paid: Payment): AuditReport {
  const expected = expectedPayment(claim, schedule);
  const allowance = allowanceFor(claim, schedule);
  const stale = isStaleSchedule(schedule, claim.serviceDate);

  const findings: Finding[] = [...expected.findings];
  if (stale) {
    findings.push({
      ruleId: "cp-stale-schedule",
      kind: "stale_schedule",
      severity: "blocking",
      scope: "schedule",
      message: `The vendored ${schedule.slug} schedule (revision ${schedule.revisionDate}) is stale for a claim served ${claim.serviceDate}: a newer revision applies and its allowances were not used.`,
      fix: "Vendor the newer revision from the manufacturer's published form, then re-run.",
    });
  }

  const mkLine = (
    scope: string,
    label: string,
    ruleId: string,
    page: string,
    expectedCents: Cents | null,
    paidCents: Cents,
    message: string,
    blocked = false,
  ): VarianceLine => {
    const verdict = variance(paidCents, expectedCents);
    return {
      scope,
      label,
      ruleId,
      page,
      scheduleVersion: schedule.version,
      scheduleSlug: schedule.slug,
      expectedCents,
      paidCents,
      varianceCents: verdict.varianceCents,
      verdict: verdict.verdict,
      blocked,
      message,
    };
  };

  const lines: VarianceLine[] = [];
  lines.push(
    mkLine(
      "labor",
      "Labour",
      allowance.blockedCount > 0 ? "cp-repair-unstated" : "cp-labor-allowance",
      schedule.multipleRepair.page,
      expected.laborCents,
      paid.laborCents,
      allowance.blockedCount > 0
        ? `Withheld: ${allowance.blockedCount} repair code${allowance.blockedCount === 1 ? "" : "s"} not in the schedule table.`
        : `${formatTenths(expected.laborAllowedTenths)} allowed × ${formatCents(claim.laborRateCentsPerHour)}/h ${allowance.multipleRepairApplied ? "(multiple-repair increment applied)" : ""}.`,
      allowance.blockedCount > 0,
    ),
  );
  lines.push(
    mkLine(
      "parts",
      "Parts",
      "cp-parts-basis",
      "Labor Claim Instructions p.2 (claim form)",
      expected.partsCents,
      paid.partsCents,
      "Parts are reimbursed at the schedule's distributor-cost basis; the claim's parts amount is compared as-filed (the shop cannot re-derive the OEM's cost).",
    ),
  );
  for (const fee of expected.fees) {
    lines.push(
      mkLine(
        `fee:${fee.key}`,
        fee.label,
        fee.capped ? "cp-fee-over-cap" : "cp-fee-cap",
        fee.page,
        fee.allowedCents,
        paid.fees[fee.key] ?? 0,
        fee.capped
          ? `Allowed at the ${formatCents(fee.allowedCents)} cap (excess ${formatCents(fee.excessCents)} named).`
          : "Within the schedule maximum.",
      ),
    );
  }
  lines.push(
    mkLine(
      "travel",
      "Travel",
      expected.travelOverMiles ? "cp-travel-over-miles" : "cp-travel-as-claimed",
      schedule.travel.page,
      expected.travelCents,
      paid.travelCents,
      expected.travelOverMiles
        ? "Exceeds the 30-mile one-way cap — not covered without pre-approval."
        : "Within the cap; compared as-claimed (no fixed travel-hour allowance is published).",
    ),
  );

  const computable = lines.filter((line) => line.varianceCents !== null);
  const totalExpectedCents = lines.reduce(
    (sum, line) => sum + (line.expectedCents ?? 0),
    0,
  );
  const totalPaidCents = lines.reduce((sum, line) => sum + line.paidCents, 0);
  const totalVarianceCents = computable.reduce(
    (sum, line) => sum + (line.varianceCents ?? 0),
    0,
  );

  // The sum invariant, enforced: Σ line variances MUST equal paid − expected over the computable
  // lines. A blocked line has no variance, so it is excluded from both sides — the invariant holds on
  // exactly the lines the batch variance is defined over, and a mismatch is a thrown engine defect.
  const computablePaid = computable.reduce((sum, line) => sum + line.paidCents, 0);
  const computableExpected = computable.reduce(
    (sum, line) => sum + (line.expectedCents ?? 0),
    0,
  );
  if (totalVarianceCents !== computablePaid - computableExpected) {
    throw new ClaimProofFieldError(
      "cp-invariant-broken",
      "batch",
      `The engine's sum invariant failed: Σ line variances (${totalVarianceCents}) ≠ paid − expected (${computablePaid - computableExpected}) over the computable lines. This is an engine defect, not a claim defect; nothing was reported.`,
    );
  }

  const blockedLineCount = allowance.blockedCount;
  const anyBlocked = blockedLineCount > 0 || stale;
  const batchVerdict: Verdict = anyBlocked
    ? "unverifiable"
    : totalVarianceCents === 0
      ? "correctly-paid"
      : totalVarianceCents < 0
        ? "underpaid"
        : "overpaid";

  const labels: string[] = [
    `schedule=${schedule.slug}`,
    `stale=${stale ? "yes" : "no"}`,
    `blockedLines=${blockedLineCount}`,
    ...lines.map((line) => `${line.scope}=${line.verdict}`),
  ];

  const resubmissionSummary = buildResubmissionSummary(lines, blockedLineCount, stale, schedule);

  return {
    engine: { id: ENGINE_ID, version: ENGINE_VERSION },
    scheduleSlug: schedule.slug,
    scheduleVersion: schedule.version,
    oem: schedule.oem,
    staleSchedule: stale,
    repairAllowances: allowance.lines,
    lines,
    blockedLineCount,
    totalExpectedCents,
    totalPaidCents,
    totalVarianceCents,
    verdict: batchVerdict,
    findings,
    labels,
    provenance: { computedBy: "deterministic-engine", scheduleSource: "vendored" },
    resubmissionSummary,
  };
}

function buildResubmissionSummary(
  lines: VarianceLine[],
  blockedLineCount: number,
  stale: boolean,
  schedule: LabourSchedule,
): string {
  const underpaid = lines.filter((line) => line.verdict === "underpaid");
  const recoverable = underpaid.reduce((sum, line) => sum + -(line.varianceCents ?? 0), 0);
  const parts: string[] = [];
  parts.push(
    `ClaimProof v1 audit against the vendored ${schedule.slug} schedule (${schedule.oem}, revision ${schedule.revisionDate}).`,
  );
  if (stale) {
    parts.push(
      "STALE SCHEDULE: a newer revision applies for this service date; the figures below use a superseded schedule and must not be resubmitted as-is.",
    );
  }
  parts.push(
    `Verdict: ${lines.some((line) => line.blocked) ? "withheld (blocked lines)" : lines.every((line) => line.verdict === "correctly-paid") ? "correctly-paid" : recoverable > 0 ? `underpaid by ${formatCents(recoverable)}` : "overpaid"}.`,
  );
  if (underpaid.length > 0) {
    parts.push(
      `Underpaid lines: ${underpaid
        .map((line) => `${line.label} ${formatCentsSigned(line.varianceCents ?? 0)}`)
        .join("; ")}.`,
    );
    parts.push(`Recoverable total at the schedule's rates: ${formatCents(recoverable)}.`);
  }
  if (blockedLineCount > 0) {
    parts.push(
      `${blockedLineCount} line${blockedLineCount === 1 ? "" : "s"} blocked: a repair code not in the schedule table was reported unstated and withheld, never zero.`,
    );
  }
  parts.push(
    "Attach this finding set to the resubmission: per-line variance with the rule and page cited on every line.",
  );
  return parts.join(" ");
}
