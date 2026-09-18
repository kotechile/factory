/**
 * Billable weight: `max(actual, ceil(L) × ceil(W) × ceil(H) ÷ divisor)`.
 *
 * The divisor is resolved by **carrier × service × ship date** (PRD §2):
 * - UPS domestic parcel — 139 (all v1 services; DIM applies at every parcel size).
 * - FedEx domestic parcel — 139 (Ground / Home Delivery bill DIM only above 1,728 cubic inches).
 * - USPS domestic parcel  — **166 before 2026-07-12, 139 from 2026-07-12** (Priority Mail Express,
 *   Priority Mail, Ground Advantage, Parcel Select), DIM only above 1,728 cubic inches.
 *
 * The 2026-07-12 USPS change also rounds every fractional package dimension **up** to the next
 * whole inch, which is why the round-up is applied to the recomputed weight for every carrier
 * here: a parcel measured at 11.2″ is billed from 12″. A line billed from *truncated* dimensions
 * is therefore an under-bill, not an overcharge — the engine says so explicitly instead of
 * inventing a recovery (see `diagnoseWeightMismatch`).
 *
 * Nothing is defaulted: an unmapped carrier/service throws with `pp-dim-unsupported-service`, a
 * ship date no rule covers throws with `pp-dim-date-out-of-range`, and a non-finite dimension
 * throws with `pp-field-invalid`. The audit turns each thrown error into an explicit `blocking`
 * finding for that line — it never falls back to a divisor.
 */
import {
  ParcelAuditFieldError,
  type Carrier,
  type Dimensions,
  type ServiceCode,
  type WeightResolution,
} from "./types";

export interface DimRule {
  carrier: Carrier;
  service: ServiceCode;
  divisor: number;
  /** Cubic inches above which DIM applies; `0` = DIM applies to every parcel size. */
  cubicInThreshold: number;
  /** Inclusive (ISO 8601). */
  effectiveFrom: string;
  /** Exclusive (ISO 8601); `null` = still in force. */
  effectiveTo: string | null;
  source: string;
}

const UPS_SOURCE = "UPS 2026 published rate/service guide — DIM divisor 139, no cubic-inch minimum";
const FEDEX_SOURCE =
  "FedEx 2026 published rates — DIM divisor 139; FedEx Ground bills DIM above 1,728 cu in";
const USPS_PRE_SOURCE = "USPS DIM divisor 166 (in force before 2026-07-12), DIM above 1,728 cu in";
const USPS_POST_SOURCE =
  "USPS DIM divisor 139 effective 2026-07-12, DIM above 1,728 cu in, fractional dimensions round up";

/** Every divisor rule v1 knows. Order is irrelevant; resolution is by carrier+service+date. */
export const DIM_RULES: readonly DimRule[] = [
  {
    carrier: "ups",
    service: "ups_ground",
    divisor: 139,
    cubicInThreshold: 0,
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    source: UPS_SOURCE,
  },
  {
    carrier: "ups",
    service: "ups_air",
    divisor: 139,
    cubicInThreshold: 0,
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    source: UPS_SOURCE,
  },
  {
    carrier: "ups",
    service: "ups_express_saver",
    divisor: 139,
    cubicInThreshold: 0,
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    source: UPS_SOURCE,
  },
  {
    carrier: "fedex",
    service: "fedex_ground",
    divisor: 139,
    cubicInThreshold: 1728,
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    source: FEDEX_SOURCE,
  },
  {
    carrier: "fedex",
    service: "fedex_home_delivery",
    divisor: 139,
    cubicInThreshold: 1728,
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    source: FEDEX_SOURCE,
  },
  {
    carrier: "fedex",
    service: "fedex_express",
    divisor: 139,
    cubicInThreshold: 0,
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    source: FEDEX_SOURCE,
  },
  {
    carrier: "usps",
    service: "usps_ground_advantage",
    divisor: 166,
    cubicInThreshold: 1728,
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-07-12",
    source: USPS_PRE_SOURCE,
  },
  {
    carrier: "usps",
    service: "usps_ground_advantage",
    divisor: 139,
    cubicInThreshold: 1728,
    effectiveFrom: "2026-07-12",
    effectiveTo: null,
    source: USPS_POST_SOURCE,
  },
  {
    carrier: "usps",
    service: "usps_priority_mail",
    divisor: 166,
    cubicInThreshold: 1728,
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-07-12",
    source: USPS_PRE_SOURCE,
  },
  {
    carrier: "usps",
    service: "usps_priority_mail",
    divisor: 139,
    cubicInThreshold: 1728,
    effectiveFrom: "2026-07-12",
    effectiveTo: null,
    source: USPS_POST_SOURCE,
  },
  {
    carrier: "usps",
    service: "usps_priority_mail_express",
    divisor: 166,
    cubicInThreshold: 1728,
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-07-12",
    source: USPS_PRE_SOURCE,
  },
  {
    carrier: "usps",
    service: "usps_priority_mail_express",
    divisor: 139,
    cubicInThreshold: 1728,
    effectiveFrom: "2026-07-12",
    effectiveTo: null,
    source: USPS_POST_SOURCE,
  },
  {
    carrier: "usps",
    service: "usps_parcel_select",
    divisor: 166,
    cubicInThreshold: 1728,
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-07-12",
    source: USPS_PRE_SOURCE,
  },
  {
    carrier: "usps",
    service: "usps_parcel_select",
    divisor: 139,
    cubicInThreshold: 1728,
    effectiveFrom: "2026-07-12",
    effectiveTo: null,
    source: USPS_POST_SOURCE,
  },
];

export const CARRIERS: readonly Carrier[] = ["ups", "fedex", "usps"];

export const SERVICES_BY_CARRIER: Record<Carrier, readonly ServiceCode[]> = {
  ups: ["ups_ground", "ups_air", "ups_express_saver"],
  fedex: ["fedex_ground", "fedex_home_delivery", "fedex_express"],
  usps: [
    "usps_ground_advantage",
    "usps_priority_mail",
    "usps_priority_mail_express",
    "usps_parcel_select",
  ],
};

export function isCarrier(value: string): value is Carrier {
  return (CARRIERS as readonly string[]).includes(value);
}

export function isServiceCode(value: string): value is ServiceCode {
  return Object.values(SERVICES_BY_CARRIER).some((services) =>
    (services as readonly string[]).includes(value),
  );
}

export function serviceBelongsToCarrier(service: ServiceCode, carrier: Carrier): boolean {
  return (SERVICES_BY_CARRIER[carrier] as readonly string[]).includes(service);
}

/**
 * Resolves the divisor rule in force for a carrier/service/ship-date triple.
 * Throws — never defaults — when no rule covers the request (factory rule 5).
 */
export function resolveDimRule(
  carrier: Carrier,
  service: ServiceCode,
  shipDate: string,
): DimRule {
  if (!isServiceCode(service)) {
    throw new ParcelAuditFieldError(
      "pp-dim-unsupported-service",
      "service",
      `"${service}" has no divisor rule in v1 (UPS/FedEx/USPS domestic parcel only: ${CARRIERS.map(
        (c) => SERVICES_BY_CARRIER[c].join(", "),
      ).join(" | ")}). LTL, ocean, international and returns services are out of scope.`,
    );
  }
  if (!serviceBelongsToCarrier(service, carrier)) {
    throw new ParcelAuditFieldError(
      "pp-dim-unsupported-service",
      "service",
      `service "${service}" is not a ${carrier} service in v1 (${SERVICES_BY_CARRIER[carrier].join(", ")}).`,
    );
  }
  const forService = DIM_RULES.filter(
    (rule) => rule.carrier === carrier && rule.service === service,
  );
  const match = forService.find(
    (rule) =>
      shipDate >= rule.effectiveFrom && (rule.effectiveTo === null || shipDate < rule.effectiveTo),
  );
  if (!match) {
    const windows = forService
      .map((rule) => `[${rule.effectiveFrom} → ${rule.effectiveTo ?? "open"}) divisor ${rule.divisor}`)
      .join(", ");
    throw new ParcelAuditFieldError(
      "pp-dim-date-out-of-range",
      "shipDate",
      `no divisor rule covers ${carrier}/${service} shipped ${shipDate} (v1 covers: ${windows}). ` +
        "A prior-year tariff is not extrapolated — re-audit against the year's own rule table.",
    );
  }
  return match;
}

export function cubicInches(dims: Dimensions): number {
  return dims.length * dims.width * dims.height;
}

export function assertDimensions(dims: Dimensions, fieldPath: string): void {
  for (const side of ["length", "width", "height"] as const) {
    const value = dims[side];
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      throw new ParcelAuditFieldError(
        "pp-field-invalid",
        `${fieldPath}.${side}`,
        `a package side must be a positive finite number of inches (received ${JSON.stringify(value)}).`,
      );
    }
  }
}

export function assertWeight(weightLb: number, fieldPath: string): void {
  if (typeof weightLb !== "number" || !Number.isFinite(weightLb) || weightLb <= 0) {
    throw new ParcelAuditFieldError(
      "pp-field-invalid",
      fieldPath,
      `a weight must be a positive finite number of pounds (received ${JSON.stringify(weightLb)}).`,
    );
  }
}

export interface BillableWeightRequest {
  carrier: Carrier;
  service: ServiceCode;
  shipDate: string;
  dims: Dimensions;
  actualWeightLb: number;
}

/**
 * The deterministic core of the WebMCP `compute_billable_weight` tool and the first step of every
 * line audit. Pure: same input, same output, no clock, no I/O.
 */
export function recomputeBillableWeight(request: BillableWeightRequest): WeightResolution {
  const { carrier, service, shipDate, dims, actualWeightLb } = request;
  const rule = resolveDimRule(carrier, service, shipDate);
  assertDimensions(dims, "dims");
  assertWeight(actualWeightLb, "actualWeightLb");

  const roundedDims: Dimensions = {
    length: Math.ceil(dims.length),
    width: Math.ceil(dims.width),
    height: Math.ceil(dims.height),
  };
  const roundUpApplied =
    roundedDims.length !== dims.length ||
    roundedDims.width !== dims.width ||
    roundedDims.height !== dims.height;

  const volume = cubicInches(roundedDims);
  const dimApplied = volume > rule.cubicInThreshold;
  const dimWeightRawLb = dimApplied ? volume / rule.divisor : 0;
  const dimWeightLb = dimApplied ? Math.ceil(dimWeightRawLb) : 0;
  const billableWeightLb = Math.ceil(Math.max(actualWeightLb, dimWeightRawLb));

  return {
    carrier,
    service,
    divisor: rule.divisor,
    divisorRuleEffectiveFrom: rule.effectiveFrom,
    thresholdCuIn: rule.cubicInThreshold,
    cubicInches: volume,
    rawDims: { ...dims },
    roundedDims,
    roundUpApplied,
    dimApplied,
    dimWeightRawLb,
    dimWeightLb,
    actualWeightLb,
    billableWeightLb,
    basis: dimApplied && dimWeightRawLb >= actualWeightLb ? "dimensional" : "actual",
  };
}

export type WeightMismatchCause = "divisor" | "measurement" | "threshold" | "under";

export interface WeightMismatchDiagnosis {
  cause: WeightMismatchCause;
  trigger: string;
  evidence: Record<string, string | number | boolean | null>;
}

/**
 * Explains *why* a billed weight differs from the recomputed one, from the tariff's own terms.
 * The purpose is to name the failed condition in the dispute packet rather than asserting a bare
 * discrepancy — and to refuse to invent a cause when none of the documented rules explains it
 * (`measurement`: the carrier re-measured the parcel).
 */
export function diagnoseWeightMismatch(args: {
  resolution: WeightResolution;
  billedWeightLb: number;
  shipDate: string;
  billedDims?: Dimensions;
}): WeightMismatchDiagnosis {
  const { resolution, billedWeightLb, shipDate, billedDims } = args;
  const roundedVolume = resolution.cubicInches;
  const evidence: Record<string, string | number | boolean | null> = {
    billedWeightLb,
    recomputedWeightLb: resolution.billableWeightLb,
    divisor: resolution.divisor,
    divisorRuleEffectiveFrom: resolution.divisorRuleEffectiveFrom,
    shipDate,
    thresholdCuIn: resolution.thresholdCuIn,
    cubicInches: roundedVolume,
    roundedDims: `${resolution.roundedDims.length}x${resolution.roundedDims.width}x${resolution.roundedDims.height}`,
    actualWeightLb: resolution.actualWeightLb,
  };
  if (billedDims) {
    evidence.billedDims = `${billedDims.length}x${billedDims.width}x${billedDims.height}`;
  }

  if (billedWeightLb < resolution.billableWeightLb) {
    return {
      cause: "under",
      trigger: `billed ${billedWeightLb} lb; the contract rule (divisor ${resolution.divisor}, rounded dims ${evidence.roundedDims}) gives ${resolution.billableWeightLb} lb`,
      evidence,
    };
  }

  // 1. DIM billed on a parcel the carrier's own tariff exempts below the cubic-inch threshold.
  const sameServiceRules = DIM_RULES.filter(
    (rule) => rule.carrier === resolution.carrier && rule.service === resolution.service,
  );
  const exemptingThreshold = Math.max(
    0,
    ...sameServiceRules.map((rule) => rule.cubicInThreshold),
  );
  const dimWeightWhyExempt = Math.ceil(
    Math.max(resolution.actualWeightLb, roundedVolume / resolution.divisor),
  );
  if (
    !resolution.dimApplied &&
    exemptingThreshold > 0 &&
    roundedVolume <= exemptingThreshold &&
    billedWeightLb === dimWeightWhyExempt
  ) {
    return {
      cause: "threshold",
      trigger: `${resolution.carrier.toUpperCase()} bills DIM only above ${exemptingThreshold.toLocaleString("en-US")} cu in; this parcel is ${roundedVolume.toLocaleString("en-US")} cu in`,
      evidence: { ...evidence, dimAppliedByRule: false, wouldBeBilledWeightLb: resolution.billableWeightLb },
    };
  }

  // 2. A divisor the tariff does not use for this ship date.
  const documentedDivisors = [
    ...new Set(DIM_RULES.map((rule) => rule.divisor).filter((d) => d !== resolution.divisor)),
  ];
  for (const candidate of documentedDivisors) {
    if (candidate > resolution.divisor) continue; // a larger divisor cannot produce a heavier bill
    const candidateWeight = Math.ceil(
      Math.max(resolution.actualWeightLb, roundedVolume / candidate),
    );
    if (candidateWeight === billedWeightLb && !resolution.dimApplied) continue;
    if (candidateWeight === billedWeightLb) {
      return {
        cause: "divisor",
        trigger: `divisor ${candidate} was applied; the rule in force on ${shipDate} is ${resolution.divisor} → ${resolution.billableWeightLb} lb`,
        evidence: { ...evidence, divisorApplied: candidate, weightWithBilledDivisor: candidateWeight },
      };
    }
  }

  // 3. Nothing documented explains it — say so.
  return {
    cause: "measurement",
    trigger: `billed ${billedWeightLb} lb matches no divisor or threshold rule for ${resolution.carrier}/${resolution.service} on ${shipDate} (rule gives ${resolution.billableWeightLb} lb) — the carrier's measurement differs from the record`,
    evidence: { ...evidence, dimAppliedByRule: resolution.dimApplied },
  };
}
