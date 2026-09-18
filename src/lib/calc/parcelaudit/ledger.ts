/**
 * The recovery ledger: audits every invoice line against its shipment record and assembles the
 * report + the per-carrier dispute packet.
 *
 * Invariants (PRD §2):
 * - Every flagged delta is reproducible from the inputs: `recomputedTotalCents = billedTotalCents −
 *   Σ finding deltas`, and each finding carries the evidence fields it was derived from.
 * - A line whose money cannot be priced from the customer's own contract rate card is counted as
 *   **unverifiable**, never as a zero-dollar overcharge.
 * - A line that cannot be audited at all (missing/invalid required field, no shipment record,
 *   unsupported carrier/service, ship date outside the rule table) is a `blocking` finding with its
 *   rule id and field path. The audit of the other lines still completes.
 *
 * Finding order is part of the contract (the vitest vectors assert exact lists): per line, in input
 * order — weight, surcharges (billed order), service commitment, dispute clock, rate verification,
 * zone mismatch, service/carrier mismatch — then record-level findings in record order.
 */
import { csvRow } from "./csv";
import { daysBetween, isoDatePart, parseIsoDate } from "./dates";
import { diagnoseWeightMismatch, recomputeBillableWeight } from "./dimWeight";
import { disputeWindowFor } from "./disputeClock";
import { assertRateCard, resolveContractRate } from "./rateCard";
import { evaluateServiceCommitment } from "./serviceCommitment";
import { assessSurcharge } from "./surcharges";
import {
  ParcelAuditFieldError,
  type AuditFinding,
  type AuditInput,
  type AuditReport,
  type Carrier,
  type CarrierRollup,
  type DisputeWindow,
  type ExposureSummary,
  type InvoiceLine,
  type LineAudit,
  type RateVerification,
  type RuleRollup,
  type ServiceCode,
  type ShipmentRecord,
  type SurchargeAssessment,
  type WeightResolution,
} from "./types";
import { buildCoverage } from "./coverage";

/** Fixed-locale money formatting — the audit never renders a locale-dependent number. */
export function formatUsd(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  return `${sign}$${Math.floor(absolute / 100).toLocaleString("en-US")}.${String(absolute % 100).padStart(2, "0")}`;
}

export function centsToUsdString(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

export function formatLb(value: number | null): string {
  return value === null ? "—" : `${value} lb`;
}

/** Below this many days of invoices, an annualised run-rate would be an invented number. */
export const ANNUALISATION_MIN_WINDOW_DAYS = 7;

const SURCHARGE_LABELS: Record<string, string> = {
  ahs_dimension: "AHS-Dimension",
  ahs_weight: "AHS-Weight",
  oversize: "Oversize / large-package",
  residential: "Residential delivery",
  address_correction: "Address correction",
  fuel: "Fuel surcharge",
  unmapped: "Unmapped accessorial",
};

const WEIGHT_CAUSE_RULES = {
  divisor: "pp-dim-divisor",
  threshold: "pp-dim-threshold",
  measurement: "pp-dim-measurement",
  under: "pp-billing-under",
} as const;

function requireText(value: unknown, fieldPath: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ParcelAuditFieldError(
      "pp-field-missing",
      fieldPath,
      `a required text value is missing (received ${JSON.stringify(value) ?? "undefined"}).`,
    );
  }
  return value.trim();
}

function requireFiniteNumber(value: unknown, fieldPath: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ParcelAuditFieldError(
      "pp-field-invalid",
      fieldPath,
      `a required numeric value is missing or not a number (received ${JSON.stringify(value) ?? "undefined"}).`,
    );
  }
  return value;
}

interface FindingInput {
  ruleId: string;
  severity: AuditFinding["severity"];
  fieldPath: string;
  tracking: string;
  message: string;
  fix: string;
  deltaCents?: number;
  trigger?: string;
  evidence: AuditFinding["evidence"];
}

function makeFinding(input: FindingInput): AuditFinding {
  const finding: AuditFinding = {
    ruleId: input.ruleId,
    severity: input.severity,
    fieldPath: input.fieldPath,
    tracking: input.tracking,
    message: input.message,
    fix: input.fix,
    evidence: input.evidence,
  };
  if (input.deltaCents !== undefined) finding.deltaCents = input.deltaCents;
  if (input.trigger !== undefined) finding.trigger = input.trigger;
  return finding;
}

function surchargeRuleId(assessment: SurchargeAssessment): string {
  if (assessment.verdict === "unsupported") {
    return assessment.kind === "unmapped"
      ? "pp-sur-unsupported"
      : `pp-sur-${assessment.kind.replace(/_/g, "-")}`;
  }
  if (assessment.verdict === "unverifiable") {
    return assessment.kind === "fuel" ? "pp-sur-fuel-unverifiable" : "pp-sur-unverifiable";
  }
  return `pp-sur-${assessment.kind.replace(/_/g, "-")}`;
}

interface LineContext {
  input: AuditInput;
  asOfDate: string;
  line: InvoiceLine;
  lineIndex: number;
  record: ShipmentRecord | null;
  recordIndex: number | null;
  duplicateRecordIndexes: number[];
}

interface LineResult {
  audit: LineAudit;
  /** Valid invoice dates seen on this line, for the observed-window calculation. */
  invoiceDate: string | null;
}

function unauditedLine(args: {
  tracking: string;
  carrier: Carrier | null;
  service: ServiceCode | null;
  zone: { record: string | null; invoice: string | null; match: boolean };
  billedWeightLb: number | null;
  billedBaseCents: number;
  billedTotalCents: number;
  findings: AuditFinding[];
  disputeWindow: DisputeWindow | null;
  reason: string;
}): LineAudit {
  return {
    tracking: args.tracking,
    carrier: args.carrier,
    service: args.service,
    audited: false,
    unauditedReason: args.reason,
    zone: args.zone,
    billedWeightLb: args.billedWeightLb,
    recomputedWeightLb: null,
    weightDeltaLb: null,
    weight: null,
    billedBaseCents: args.billedBaseCents,
    recomputedBaseCents: null,
    billedTotalCents: args.billedTotalCents,
    recomputedTotalCents: args.billedTotalCents,
    rateVerification: "unverifiable-rate",
    findings: args.findings,
    deltaCents: 0,
    claimableCents: 0,
    expiredCents: 0,
    underBilledCents: 0,
    surcharges: [],
    serviceCommitment: null,
    disputeWindow: args.disputeWindow,
  };
}

function auditLine(context: LineContext): LineResult {
  const { input, asOfDate, line, lineIndex, record, recordIndex } = context;
  const linePath = `invoiceLines[${lineIndex}]`;
  const recordPath = recordIndex === null ? "shipmentRecords[?]" : `shipmentRecords[${recordIndex}]`;

  // ---- Phase A: read every field we can, collecting all problems at once -------------------
  const errors: ParcelAuditFieldError[] = [];
  const capture = <T,>(fn: () => T, fallback: T): T => {
    try {
      return fn();
    } catch (error) {
      if (error instanceof ParcelAuditFieldError) {
        errors.push(error);
        return fallback;
      }
      throw error;
    }
  };

  const tracking = capture(() => requireText(line.tracking, `${linePath}.tracking`), "—");
  const billedWeightLb = capture(
    () => requireFiniteNumber(line.billedWeightLb, `${linePath}.billedWeightLb`),
    null,
  );
  const billedBaseCents = capture(
    () => requireFiniteNumber(line.baseChargeCents, `${linePath}.baseChargeCents`),
    0,
  );
  const billedTotalCents = capture(
    () => requireFiniteNumber(line.totalCents, `${linePath}.totalCents`),
    0,
  );
  const invoiceZone = capture(() => requireText(line.zone, `${linePath}.zone`), null);
  const invoiceDate = capture(() => {
    const value = requireText(line.invoiceDate, `${linePath}.invoiceDate`);
    parseIsoDate(value, `${linePath}.invoiceDate`);
    return isoDatePart(value);
  }, null);

  // The carrier/service come from the shipment record (the shipper's own manifest), falling back to
  // the invoice line only when the record does not name them. An orphan line is reported as such in
  // Phase B rather than as a pair of missing fields.
  const carrierValue = record?.carrier ?? line.carrier;
  const serviceValue = record?.service ?? line.service;
  const carrier: Carrier | null =
    typeof carrierValue === "string" && carrierValue.trim() ? (carrierValue as Carrier) : null;
  const service: ServiceCode | null =
    typeof serviceValue === "string" && serviceValue.trim() ? (serviceValue as ServiceCode) : null;
  if (record !== null) {
    if (!carrier) {
      errors.push(
        new ParcelAuditFieldError(
          "pp-field-missing",
          `${recordPath}.carrier`,
          "neither the shipment record nor the invoice line names the carrier, so no divisor rule can be resolved.",
        ),
      );
    }
    if (!service) {
      errors.push(
        new ParcelAuditFieldError(
          "pp-field-missing",
          `${recordPath}.service`,
          "neither the shipment record nor the invoice line names the service, so no divisor rule can be resolved.",
        ),
      );
    }
  }

  const disputeWindow =
    carrier && invoiceDate ? disputeWindowFor(carrier, invoiceDate, asOfDate) : null;

  const zoneState = {
    record: record?.zone ?? null,
    invoice: invoiceZone,
    match: Boolean(record && invoiceZone && record.zone === invoiceZone),
  };

  const blockingFindings = errors.map((error) =>
    makeFinding({
      ruleId: error.ruleId,
      severity: "blocking",
      fieldPath: error.fieldPath,
      tracking,
      message: error.message,
      fix: "Supply the missing/valid value from the carrier invoice or your own manifest — the audit will not substitute a default (factory rule 5).",
      evidence: { thrownRuleId: error.ruleId },
    }),
  );

  if (errors.length > 0) {
    return {
      audit: unauditedLine({
        tracking,
        carrier,
        service,
        zone: zoneState,
        billedWeightLb,
        billedBaseCents,
        billedTotalCents,
        findings: blockingFindings,
        disputeWindow,
        reason: `the line could not be audited: ${errors.map((error) => error.ruleId).join(", ")}`,
      }),
      invoiceDate,
    };
  }

  // ---- Phase B: an orphan line cannot be recomputed ------------------------------------------
  if (!record) {
    const duplicates = context.duplicateRecordIndexes.length > 0;
    blockingFindings.push(
      makeFinding({
        ruleId: "pp-line-orphan",
        severity: "blocking",
        fieldPath: `${linePath}.tracking`,
        tracking,
        message: duplicates
          ? `tracking ${tracking} matches only duplicate shipment records, so the line's declared dimensions and ship date are ambiguous.`
          : `no shipment record has tracking ${tracking}, so there is nothing to recompute the line against.`,
        fix: "Export the shipment records for the same period as the invoice (the audit needs the declared dims, weight and ship date per tracking number).",
        evidence: { tracking, duplicateRecordIndexes: context.duplicateRecordIndexes.join("|") },
      }),
    );
    return {
      audit: unauditedLine({
        tracking,
        carrier,
        service,
        zone: zoneState,
        billedWeightLb,
        billedBaseCents,
        billedTotalCents,
        findings: blockingFindings,
        disputeWindow,
        reason: "no matching shipment record",
      }),
      invoiceDate,
    };
  }

  // ---- Phase C: the carrier filter is explicit, never a silent skip ---------------------------
  if (input.carrier && carrier !== input.carrier) {
    return {
      audit: unauditedLine({
        tracking,
        carrier,
        service,
        zone: zoneState,
        billedWeightLb,
        billedBaseCents,
        billedTotalCents,
        findings: [
          makeFinding({
            ruleId: "pp-carrier-out-of-scope",
            severity: "advisory",
            fieldPath: `${linePath}.carrier`,
            tracking,
            message: `this line is ${carrier} but the audit was scoped to ${input.carrier}, so it was not audited.`,
            fix: `Re-run the audit without the carrier filter, or with carrier="${carrier}", to include this line.`,
            evidence: { lineCarrier: carrier, auditCarrier: input.carrier },
          }),
        ],
        disputeWindow,
        reason: `out of the requested carrier scope (${input.carrier})`,
      }),
      invoiceDate,
    };
  }

  const findings: AuditFinding[] = [];
  let resolution: WeightResolution;
  try {
    resolution = recomputeBillableWeight({
      carrier: carrier as Carrier,
      service: service as ServiceCode,
      shipDate: record.shipDate,
      dims: record.dims,
      actualWeightLb: record.actualWeightLb,
    });
  } catch (error) {
    if (error instanceof ParcelAuditFieldError) {
      findings.push(
        makeFinding({
          ruleId: error.ruleId,
          severity: "blocking",
          fieldPath: error.fieldPath === "shipDate" ? `${recordPath}.shipDate` : `${recordPath}.${error.fieldPath}`,
          tracking,
          message: error.message,
          fix: "Correct the shipment record (or the audit scope) — no divisor rule is assumed when none covers this shipment.",
          evidence: { thrownRuleId: error.ruleId, service, carrier, shipDate: record.shipDate },
        }),
      );
      return {
        audit: unauditedLine({
          tracking,
          carrier,
          service,
          zone: zoneState,
          billedWeightLb,
          billedBaseCents,
          billedTotalCents,
          findings,
          disputeWindow,
          reason: error.ruleId,
        }),
        invoiceDate,
      };
    }
    throw error;
  }

  // ---- Phase D: pricing (contract rate card) -------------------------------------------------
  const rateCard = input.rateCard;
  const rate = resolveContractRate({
    rateCard,
    carrier: carrier as Carrier,
    service: service as ServiceCode,
    zone: record.zone,
    weightLb: resolution.billableWeightLb,
  });
  const recomputedBaseCents = rate.rateCents;
  const rateVerification: RateVerification = rate.status;

  // ---- 1. weight ----------------------------------------------------------------------------
  if (billedWeightLb !== null && billedWeightLb !== resolution.billableWeightLb) {
    const diagnosis = diagnoseWeightMismatch({
      resolution,
      billedWeightLb,
      shipDate: record.shipDate,
      ...(line.billedDims ? { billedDims: line.billedDims } : {}),
    });
    const over = diagnosis.cause !== "under";
    const priced = recomputedBaseCents !== null;
    const deltaCents = priced ? billedBaseCents - (recomputedBaseCents as number) : undefined;
    const ruleId = WEIGHT_CAUSE_RULES[diagnosis.cause];
    // "recoverable" is reserved for a proven overcharge with a priceable amount; a real weight
    // defect that cannot be priced stays advisory so the ledger never implies money it cannot show.
    const claimable = over && deltaCents !== undefined && deltaCents > 0;
    findings.push(
      makeFinding({
        ruleId,
        severity: over ? (claimable ? "recoverable" : "advisory") : "advisory",
        fieldPath: `${linePath}.billedWeightLb`,
        tracking,
        message: over
          ? `billed ${billedWeightLb} lb against a recomputed ${resolution.billableWeightLb} lb — ${diagnosis.trigger}.`
          : `billed ${billedWeightLb} lb against a recomputed ${resolution.billableWeightLb} lb — ${diagnosis.trigger} (the carrier under-billed; nothing is claimed).`,
        fix: over
          ? priced
            ? `Dispute the base-charge difference of ${formatUsd(deltaCents as number)} on ${tracking}, quoting: ${diagnosis.trigger}.`
            : `Supply your contract rate card so this over-billing can be priced — the weight proof is complete but the amount is not provable without your own rates.`
          : `No action — recorded so the ledger reconciles rather than silently dropping a discrepancy.`,
        ...(deltaCents === undefined ? {} : { deltaCents }),
        trigger: diagnosis.trigger,
        evidence: { ...diagnosis.evidence, cause: diagnosis.cause, billedBaseCents, recomputedBaseCents },
      }),
    );
  }

  // ---- 2. surcharges ------------------------------------------------------------------------
  const surcharges: SurchargeAssessment[] = [];
  (line.surcharges ?? []).forEach((surcharge, index) => {
    const amount = requireFiniteNumber(
      surcharge.amountCents,
      `${linePath}.surcharges[${index}].amountCents`,
    );
    const assessment = assessSurcharge({
      code: requireText(surcharge.code, `${linePath}.surcharges[${index}].code`),
      amountCents: amount,
      context: { carrier: carrier as Carrier, record, resolution },
    });
    surcharges.push(assessment);
    const label = SURCHARGE_LABELS[assessment.kind] ?? assessment.kind;
    if (assessment.verdict === "eligible") return;

    const fieldPath = `${linePath}.surcharges[${index}].amountCents`;
    const evidence = {
      code: assessment.code,
      kind: assessment.kind,
      amountCents: amount,
      verdict: assessment.verdict,
      trigger: assessment.trigger,
      billedLinesLikeThis: 1,
      longestSideIn: Math.max(
        resolution.roundedDims.length,
        resolution.roundedDims.width,
        resolution.roundedDims.height,
      ),
      actualWeightLb: record.actualWeightLb,
      cubicInches: resolution.cubicInches,
    };

    if (assessment.verdict === "ineligible") {
      findings.push(
        makeFinding({
          ruleId: surchargeRuleId(assessment),
          severity: "recoverable",
          fieldPath,
          tracking,
          message: `${label} of ${formatUsd(amount)} was billed on ${tracking}, but the parcel does not meet the carrier's trigger: ${assessment.trigger}.`,
          fix: `Dispute the ${label} charge of ${formatUsd(amount)} quoting the failed trigger: ${assessment.trigger}.`,
          deltaCents: amount,
          trigger: assessment.trigger,
          evidence,
        }),
      );
      return;
    }

    findings.push(
      makeFinding({
        ruleId: surchargeRuleId(assessment),
        severity: "advisory",
        fieldPath,
        tracking,
        message: `${label} of ${formatUsd(amount)} cannot be verified from the record: ${assessment.trigger}.`,
        fix:
          assessment.verdict === "unsupported"
            ? "Report the code to the carrier for the tariff basis — v1 treats an unmapped accessorial as neither an overcharge nor as benign."
            : "Add the missing record field (or the carrier's measurement evidence) before paying or disputing this line; no amount is claimed either way.",
        trigger: assessment.trigger,
        evidence,
      }),
    );
  });

  // ---- 3. service commitment ------------------------------------------------------------------
  const commitment = evaluateServiceCommitment({
    carrier: carrier as Carrier,
    service: service as ServiceCode,
    ...(record.promisedDate === undefined ? {} : { promisedDate: record.promisedDate }),
    ...(record.deliveredAt === undefined ? {} : { deliveredAt: record.deliveredAt }),
    baseChargeCents: billedBaseCents,
    asOfDate,
    fieldPath: recordPath,
  });
  if (commitment.status === "late-claimable") {
    findings.push(
      makeFinding({
        ruleId: "pp-svc-late",
        severity: "recoverable",
        fieldPath: `${recordPath}.deliveredAt`,
        tracking,
        message: `the ${service} commitment was missed by ${commitment.daysLate} day(s): ${commitment.note}.`,
        fix: `File the money-back claim for ${tracking} before ${commitment.claimDeadline} — ${commitment.claimDaysRemaining} day(s) left.`,
        deltaCents: commitment.refundableCents,
        trigger: `delivered ${commitment.deliveredAt} against a ${commitment.promisedDate} commitment, within the ${commitment.moneyBackDays}-day guarantee window`,
        evidence: {
          promisedDate: commitment.promisedDate,
          deliveredAt: commitment.deliveredAt,
          daysLate: commitment.daysLate,
          moneyBackDays: commitment.moneyBackDays,
          claimDeadline: commitment.claimDeadline,
          refundableCents: commitment.refundableCents,
        },
      }),
    );
  } else if (
    commitment.status === "late-window-closed" ||
    commitment.status === "late-not-covered" ||
    commitment.status === "unverifiable"
  ) {
    const ruleId =
      commitment.status === "late-window-closed"
        ? "pp-svc-late-expired"
        : commitment.status === "late-not-covered"
          ? "pp-svc-not-covered"
          : "pp-svc-unverifiable";
    findings.push(
      makeFinding({
        ruleId,
        severity: "advisory",
        fieldPath:
          commitment.status === "unverifiable"
            ? `${recordPath}.promisedDate`
            : `${recordPath}.deliveredAt`,
        tracking,
        message: `${commitment.note}.`,
        fix:
          ruleId === "pp-svc-late-expired"
            ? "No refund is claimable on this window; fix the process so the next late delivery is filed before the guarantee window closes."
            : ruleId === "pp-svc-not-covered"
              ? `No action — if you expected a guarantee on ${service}, confirm the contracted service level with the carrier.`
              : "Add promised/delivered dates to the shipment records so commitment performance is verifiable.",
        trigger: commitment.note,
        evidence: {
          promisedDate: commitment.promisedDate,
          deliveredAt: commitment.deliveredAt,
          daysLate: commitment.daysLate,
          moneyBackDays: commitment.moneyBackDays,
          claimDeadline: commitment.claimDeadline,
        },
      }),
    );
  }

  // ---- 4. dispute clock -----------------------------------------------------------------------
  const positiveDelta = findings
    .filter((finding) => (finding.deltaCents ?? 0) > 0)
    .reduce((total, finding) => total + (finding.deltaCents ?? 0), 0);
  if (disputeWindow && positiveDelta > 0) {
    if (disputeWindow.status === "expired") {
      findings.push(
        makeFinding({
          ruleId: "pp-clk-expired",
          severity: "advisory",
          fieldPath: `${linePath}.invoiceDate`,
          tracking,
          message: `${formatUsd(positiveDelta)} of over-billing on this line is proven, but the ${disputeWindow.carrier.toUpperCase()} dispute window (${disputeWindow.windowDays} days from ${disputeWindow.invoiceDate}) closed on ${disputeWindow.deadline}.`,
          fix: "Not claimable on this invoice — move these lines to a same-week audit cadence; the finding stays on the record so the exposure is measured.",
          trigger: `deadline ${disputeWindow.deadline}; today ${asOfDate}`,
          evidence: {
            windowDays: disputeWindow.windowDays,
            invoiceDate: disputeWindow.invoiceDate,
            deadline: disputeWindow.deadline,
            daysRemaining: disputeWindow.daysRemaining,
            provenCents: positiveDelta,
          },
        }),
      );
    } else if (disputeWindow.status === "expiring") {
      findings.push(
        makeFinding({
          ruleId: "pp-clk-expiring",
          severity: "advisory",
          fieldPath: `${linePath}.invoiceDate`,
          tracking,
          message: `${formatUsd(positiveDelta)} of over-billing on this line is claimable only until ${disputeWindow.deadline} (${disputeWindow.daysRemaining} day(s) left).`,
          fix: `File the dispute for ${tracking} now — the window closes in ${disputeWindow.daysRemaining} day(s).`,
          trigger: `deadline ${disputeWindow.deadline}; today ${asOfDate}`,
          evidence: {
            windowDays: disputeWindow.windowDays,
            invoiceDate: disputeWindow.invoiceDate,
            deadline: disputeWindow.deadline,
            daysRemaining: disputeWindow.daysRemaining,
            provenCents: positiveDelta,
          },
        }),
      );
    }
  }

  // ---- 5. rate verification --------------------------------------------------------------------
  if (rate.status === "unverifiable-rate") {
    findings.push(
      makeFinding({
        ruleId: "pp-rate-unverifiable",
        severity: "advisory",
        fieldPath: `${linePath}.baseChargeCents`,
        tracking,
        message: `no contract rate card was supplied, so the recomputed weight (${resolution.billableWeightLb} lb) cannot be priced — this line is unverifiable, not verified.`,
        fix: "Supply your contract rate card (carrier, service, zone, weight bracket, rate) to price this line; until then no overcharge amount is claimed.",
        evidence: {
          recomputedWeightLb: resolution.billableWeightLb,
          billedWeightLb,
          zone: record.zone,
          billedBaseCents,
        },
      }),
    );
  } else if (rate.status === "unmapped") {
    findings.push(
      makeFinding({
        ruleId: "pp-rate-unmapped",
        severity: "advisory",
        fieldPath: "rateCard.rows",
        tracking,
        message: `the rate card has no row for ${carrier}/${service}/zone ${record.zone} at ${resolution.billableWeightLb} lb, so this line cannot be priced — ${rate.note}.`,
        fix: `Add the missing contract rate row (${carrier}, ${service}, zone ${record.zone}, ${resolution.billableWeightLb} lb) or correct the zone/reservice on the shipment record.`,
        evidence: {
          carrier,
          service,
          zone: record.zone,
          recomputedWeightLb: resolution.billableWeightLb,
          rateCardRows: rateCard?.rows.length ?? 0,
        },
      }),
    );
  }

  // ---- 6. zone mismatch ------------------------------------------------------------------------
  if (invoiceZone && record.zone !== invoiceZone) {
    findings.push(
      makeFinding({
        ruleId: "pp-zone-mismatch",
        severity: "advisory",
        fieldPath: `${linePath}.zone`,
        tracking,
        message: `the invoice bills zone ${invoiceZone} while the shipment record says ${record.zone}; the audit priced this line from the shipment record's zone.`,
        fix: `Confirm the contracted zone with the carrier — a zone the shipper did not ship to is a rate error even when the weight is right.`,
        trigger: `invoice zone ${invoiceZone} ≠ record zone ${record.zone}`,
        evidence: { invoiceZone, recordZone: record.zone },
      }),
    );
  }

  // ---- 7. carrier / service mismatch ------------------------------------------------------------
  if (line.carrier !== undefined && line.carrier !== record.carrier) {
    findings.push(
      makeFinding({
        ruleId: "pp-service-mismatch",
        severity: "advisory",
        fieldPath: `${linePath}.carrier`,
        tracking,
        message: `the invoice line bills ${line.carrier} while the shipment record says ${record.carrier}; the audit used the record's carrier.`,
        fix: "Reconcile the carrier on the invoice line and the manifest — the divisor table is carrier-specific, so the audit cannot be trusted until they agree.",
        evidence: { invoiceCarrier: line.carrier, recordCarrier: record.carrier },
      }),
    );
  }
  if (line.service !== undefined && line.service !== record.service) {
    findings.push(
      makeFinding({
        ruleId: "pp-service-mismatch",
        severity: "advisory",
        fieldPath: `${linePath}.service`,
        tracking,
        message: `the invoice line bills ${line.service} while the shipment record says ${record.service}; the audit used the record's service.`,
        fix: "Reconcile the service level on the invoice line and the manifest — the divisor, threshold and money-back rules are service-specific.",
        evidence: { invoiceService: line.service, recordService: record.service },
      }),
    );
  }

  // ---- ledger ------------------------------------------------------------------------------------
  const positive = findings
    .filter((finding) => (finding.deltaCents ?? 0) > 0)
    .reduce((total, finding) => total + (finding.deltaCents ?? 0), 0);
  const negative = findings
    .filter((finding) => (finding.deltaCents ?? 0) < 0)
    .reduce((total, finding) => total + Math.abs(finding.deltaCents ?? 0), 0);
  const deltaCents = findings.reduce((total, finding) => total + (finding.deltaCents ?? 0), 0);
  const expired = disputeWindow?.status === "expired";

  return {
    audit: {
      tracking,
      carrier,
      service,
      audited: true,
      unauditedReason: null,
      zone: { record: record.zone, invoice: invoiceZone, match: zoneState.match },
      billedWeightLb,
      recomputedWeightLb: resolution.billableWeightLb,
      weightDeltaLb: billedWeightLb === null ? null : billedWeightLb - resolution.billableWeightLb,
      weight: resolution,
      billedBaseCents,
      recomputedBaseCents,
      billedTotalCents,
      recomputedTotalCents: billedTotalCents - deltaCents,
      rateVerification,
      findings,
      deltaCents,
      claimableCents: expired ? 0 : positive,
      expiredCents: expired ? positive : 0,
      underBilledCents: negative,
      surcharges,
      serviceCommitment: commitment,
      disputeWindow,
    },
    invoiceDate,
  };
}

/**
 * Audits an invoice against the shipment records behind it. Pure and deterministic: the only clock
 * the engine reads is `input.asOfDate`.
 */
export function auditCarrierInvoice(input: AuditInput): AuditReport {
  if (!input || typeof input !== "object") {
    throw new ParcelAuditFieldError("pp-field-missing", "input", "the audit input is not an object.");
  }
  if (!Array.isArray(input.shipmentRecords) || !Array.isArray(input.invoiceLines)) {
    throw new ParcelAuditFieldError(
      "pp-field-missing",
      "input",
      "both shipmentRecords and invoiceLines must be arrays.",
    );
  }
  parseIsoDate(input.asOfDate, "asOfDate");
  if (input.carrier !== undefined) {
    requireText(input.carrier, "carrier");
  }
  if (input.rateCard) assertRateCard(input.rateCard);

  const recordIndexesByTracking = new Map<string, number[]>();
  input.shipmentRecords.forEach((record, index) => {
    const tracking = typeof record?.tracking === "string" ? record.tracking : "";
    if (!tracking) return;
    const list = recordIndexesByTracking.get(tracking) ?? [];
    list.push(index);
    recordIndexesByTracking.set(tracking, list);
  });

  const billedTrackings = new Set<string>();
  input.invoiceLines.forEach((line) => {
    if (typeof line?.tracking === "string" && line.tracking) billedTrackings.add(line.tracking);
  });

  const lines: LineAudit[] = [];
  const invoiceDates: string[] = [];

  input.invoiceLines.forEach((line, lineIndex) => {
    const tracking = typeof line?.tracking === "string" ? line.tracking : "";
    const recordIndexes = recordIndexesByTracking.get(tracking) ?? [];
    const recordIndex = recordIndexes.length > 0 ? recordIndexes[0] : null;
    const result = auditLine({
      input,
      asOfDate: input.asOfDate,
      line,
      lineIndex,
      record: recordIndex === null ? null : input.shipmentRecords[recordIndex],
      recordIndex,
      duplicateRecordIndexes: recordIndexes.slice(1),
    });
    lines.push(result.audit);
    if (result.invoiceDate) invoiceDates.push(result.invoiceDate);
  });

  // ---- record-level findings (in record order) --------------------------------------------------
  const recordFindings: AuditFinding[] = [];
  input.shipmentRecords.forEach((record: ShipmentRecord, index) => {
    const tracking = typeof record?.tracking === "string" ? record.tracking : "";
    if (tracking && !billedTrackings.has(tracking)) {
      recordFindings.push(
        makeFinding({
          ruleId: "pp-record-unbilled",
          severity: "advisory",
          fieldPath: `shipmentRecords[${index}].tracking`,
          tracking,
          message: `shipment record ${tracking} is not billed on this invoice (no invoice line carries its tracking number), so there is nothing to audit it against.`,
          fix: "Confirm the parcel was billed — if the carrier bills it on a later invoice, re-run the audit against that invoice.",
          evidence: { orderId: record.orderId ?? null, carrier: record.carrier ?? null },
        }),
      );
    }
  });
  recordIndexesByTracking.forEach((indexes, tracking) => {
    indexes.slice(1).forEach((index) => {
      recordFindings.push(
        makeFinding({
          ruleId: "pp-record-duplicate",
          severity: "advisory",
          fieldPath: `shipmentRecords[${index}].tracking`,
          tracking,
          message: `tracking number ${tracking} appears more than once in the shipment records (first at shipmentRecords[${indexes[0]}]); the line was audited against the first record.`,
          fix: "De-duplicate the shipment export — with two records for one tracking number the declared dims/weight are ambiguous.",
          evidence: {
            duplicateIndexes: indexes.join("|"),
            auditedWithIndex: indexes[0] ?? null,
          },
        }),
      );
    });
  });

  const findings = [...lines.flatMap((line) => line.findings), ...recordFindings];

  const observedWindowDays =
    invoiceDates.length > 0
      ? Math.max(
          1,
          daysBetween(invoiceDates.reduce((min, d) => (d < min ? d : min)), invoiceDates.reduce((max, d) => (d > max ? d : max))),
        )
      : 1;

  const claimableCents = lines.reduce((total, line) => total + line.claimableCents, 0);
  const expiringSoonCents = lines
    .filter((line) => line.disputeWindow?.status === "expiring")
    .reduce((total, line) => total + line.claimableCents, 0);
  const expiredTotalCents = lines.reduce((total, line) => total + line.expiredCents, 0);
  const underBilledTotalCents = lines.reduce((total, line) => total + line.underBilledCents, 0);

  const ruleMap = new Map<string, RuleRollup>();
  findings.forEach((finding) => {
    const entry = ruleMap.get(finding.ruleId) ?? { ruleId: finding.ruleId, count: 0, totalCents: 0 };
    entry.count += 1;
    entry.totalCents += finding.deltaCents ?? 0;
    ruleMap.set(finding.ruleId, entry);
  });

  const carrierMap = new Map<Carrier, CarrierRollup>();
  lines.forEach((line) => {
    if (!line.carrier) return;
    const entry =
      carrierMap.get(line.carrier) ??
      ({ carrier: line.carrier, lines: 0, recoverableCents: 0, expiredCents: 0, annualisedRunRateCents: null } as CarrierRollup);
    entry.lines += 1;
    entry.recoverableCents += line.claimableCents;
    entry.expiredCents += line.expiredCents;
    carrierMap.set(line.carrier, entry);
  });
  carrierMap.forEach((entry) => {
    // A window shorter than a week cannot be extrapolated to a year without inventing a rate; the
    // field is null (and labelled as such) rather than a fabricated multiple.
    entry.annualisedRunRateCents =
      observedWindowDays >= ANNUALISATION_MIN_WINDOW_DAYS
        ? Math.round((entry.recoverableCents / observedWindowDays) * 365)
        : null;
  });

  const summary: ExposureSummary = {
    linesAudited: lines.filter((line) => line.audited).length,
    linesUnverifiable: lines.filter((line) => !line.audited).length,
    linesUnpriced: lines.filter((line) => line.audited && line.rateVerification !== "verified").length,
    recordsUnbilled: recordFindings.filter((finding) => finding.ruleId === "pp-record-unbilled").length,
    findings: findings.length,
    recoverableTotalCents: claimableCents,
    expiringSoonCents,
    expiredTotalCents,
    underBilledTotalCents,
    unverifiableCents: 0,
    observedWindowDays,
    byRule: [...ruleMap.values()].sort((a, b) => (a.ruleId < b.ruleId ? -1 : a.ruleId > b.ruleId ? 1 : 0)),
    byCarrier: [...carrierMap.values()].sort((a, b) => (a.carrier < b.carrier ? -1 : 1)),
  };

  const report: AuditReport = {
    clean: findings.length === 0,
    asOfDate: input.asOfDate,
    lines,
    findings,
    disputePacket: "",
    summary,
    coverage: buildCoverage(),
  };
  report.disputePacket = buildDisputeCsv(report);
  return report;
}

export const DISPUTE_CSV_HEADER = [
  "tracking",
  "carrier",
  "service",
  "rule_id",
  "severity",
  "scope",
  "field_path",
  "billed_weight_lb",
  "recomputed_weight_lb",
  "billed_total_usd",
  "recomputed_total_usd",
  "delta_usd",
  "window_status",
  "window_deadline",
  "trigger",
  "evidence",
  "fix",
] as const;

/** One row per finding: the dispute packet a shipper sends to the carrier (or files internally). */
export function buildDisputeCsv(report: AuditReport): string {
  const linesByTracking = new Map(report.lines.map((line) => [line.tracking, line]));
  const rows: string[] = [csvRow([...DISPUTE_CSV_HEADER])];
  report.findings.forEach((finding) => {
    const line = linesByTracking.get(finding.tracking);
    const delta = finding.deltaCents ?? 0;
    const scope =
      finding.severity === "blocking"
        ? "blocked"
        : delta > 0
          ? line?.disputeWindow?.status === "expired"
            ? "expired"
            : "claimable"
          : "review";
    rows.push(
      csvRow([
        finding.tracking,
        line?.carrier ?? "",
        line?.service ?? "",
        finding.ruleId,
        finding.severity,
        scope,
        finding.fieldPath,
        line?.billedWeightLb ?? "",
        line?.recomputedWeightLb ?? "",
        line ? centsToUsdString(line.billedTotalCents) : "",
        line ? centsToUsdString(line.recomputedTotalCents) : "",
        finding.deltaCents === undefined ? "" : centsToUsdString(finding.deltaCents),
        line?.disputeWindow?.status ?? "",
        line?.disputeWindow?.deadline ?? "",
        finding.trigger ?? "",
        Object.entries(finding.evidence)
          .map(([key, value]) => `${key}=${value ?? ""}`)
          .join("; "),
        finding.fix,
      ]),
    );
  });
  return `${rows.join("\n")}\n`;
}

export { SURCHARGE_LABELS };
