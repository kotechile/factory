/**
 * Accessorial eligibility, recomputed from the shipment record rather than taken from the invoice.
 *
 * A surcharge the carrier billed is only legitimate when the record satisfies the carrier's own
 * trigger. This module evaluates every v1 trigger and returns the verdict **plus the trigger
 * condition that failed**, so the dispute packet states a rule instead of an opinion.
 *
 * v1 triggers (PRD §2, and the tariff numbers the PRD cites):
 * | kind                  | UPS              | FedEx            | USPS |
 * |-----------------------|------------------|------------------|------|
 * | AHS-Dimension         | longest side > 96 in | longest side > 48 in | not assessed |
 * | AHS-Weight            | actual weight > 50 lb | actual weight > 50 lb | not assessed |
 * | Oversize / Large Pkg  | longest side > 96 in AND length+girth > 130 in | same | not assessed |
 * | Residential           | record says residential | same | not assessed |
 * | Address correction    | record says corrected | same | not assessed |
 * | Fuel                  | no published table in v1 → unverifiable | same | same |
 *
 * Eligibility that cannot be decided from the record (`residential` / `addressCorrection` not
 * supplied) is reported **unverifiable** — never guessed in either direction, and never passed
 * silently (factory rule 5).
 *
 * Note on the two AHS-Dimension thresholds: the PRD assigns 96 in to UPS and 48 in to FedEx, so
 * FedEx's trigger is strictly more aggressive than UPS's and a 40 in parcel is ineligible at both.
 * The table below is exactly the PRD's, with each carrier's number in one place so a corrected
 * tariff is a one-line change.
 */
import type {
  Carrier,
  SurchargeAssessment,
  ShipmentRecord,
  WeightResolution,
} from "./types";

export type SurchargeKind =
  | "ahs_dimension"
  | "ahs_weight"
  | "oversize"
  | "residential"
  | "address_correction"
  | "fuel";

export const SURCHARGE_KINDS: readonly SurchargeKind[] = [
  "ahs_dimension",
  "ahs_weight",
  "oversize",
  "residential",
  "address_correction",
  "fuel",
];

/** Longest-side trigger, in inches; `null` = the carrier does not assess this surcharge in v1. */
export const AHS_DIMENSION_LONGEST_SIDE_IN: Record<Carrier, number | null> = {
  ups: 96,
  fedex: 48,
  usps: null,
};

/** Actual-weight trigger, in pounds; `null` = not assessed. */
export const AHS_WEIGHT_ACTUAL_LB: Record<Carrier, number | null> = {
  ups: 50,
  fedex: 50,
  usps: null,
};

export const OVERSIZE_LONGEST_SIDE_IN = 96;
export const OVERSIZE_LENGTH_PLUS_GIRTH_IN = 130;

export const CARRIER_SURCHARGE_SUPPORT: Record<Carrier, readonly SurchargeKind[]> = {
  ups: ["ahs_dimension", "ahs_weight", "oversize", "residential", "address_correction", "fuel"],
  fedex: ["ahs_dimension", "ahs_weight", "oversize", "residential", "address_correction", "fuel"],
  usps: [],
};

/** Billed code → canonical kind. Anything absent here is `pp-sur-unsupported`, never assumed. */
const CODE_ALIASES: Record<string, SurchargeKind> = {
  ahsdim: "ahs_dimension",
  ahsdimension: "ahs_dimension",
  additionalhandlingdimension: "ahs_dimension",
  additionalhandlingdims: "ahs_dimension",
  additionalhandlinglargepackage: "ahs_dimension",
  dimension: "ahs_dimension",
  ahswt: "ahs_weight",
  ahsweight: "ahs_weight",
  additionalhandlingweight: "ahs_weight",
  oversize: "oversize",
  oversizepackage: "oversize",
  largepackage: "oversize",
  largepackagesurcharge: "oversize",
  residential: "residential",
  residentialdelivery: "residential",
  resdel: "residential",
  homedelivery: "residential",
  addresscorrection: "address_correction",
  addrcorr: "address_correction",
  addresscorrectionfee: "address_correction",
  fuel: "fuel",
  fuelsurcharge: "fuel",
  fuelcharge: "fuel",
  fuelpct: "fuel",
};

/** Lower-cases a billed code and drops everything that is not a letter or digit. */
export function normalizeSurchargeCode(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** `null` = the code is not mapped in v1 (reported unsupported, never treated as benign). */
export function classifySurcharge(code: string): SurchargeKind | null {
  return CODE_ALIASES[normalizeSurchargeCode(code)] ?? null;
}

export interface SurchargeContext {
  carrier: Carrier;
  /** `null` when the invoice line has no matching shipment record (orphan line). */
  record: ShipmentRecord | null;
  /** Recomputed weight resolution for the parcel; `null` when only the raw record is available. */
  resolution: WeightResolution | null;
}

function longestSideIn(context: SurchargeContext): number | null {
  const { record, resolution } = context;
  if (resolution) {
    const { length, width, height } = resolution.roundedDims;
    return Math.max(length, width, height);
  }
  if (!record) return null;
  return Math.max(record.dims.length, record.dims.width, record.dims.height);
}

function eligibleAssessed(
  kind: SurchargeKind,
  context: SurchargeContext,
): SurchargeAssessment["verdict"] {
  const { record } = context;
  if (kind === "ahs_dimension") {
    const threshold = AHS_DIMENSION_LONGEST_SIDE_IN[context.carrier];
    if (threshold === null) return "unsupported";
    const longest = longestSideIn(context);
    return longest !== null && longest > threshold ? "eligible" : "ineligible";
  }
  if (kind === "ahs_weight") {
    const threshold = AHS_WEIGHT_ACTUAL_LB[context.carrier];
    if (threshold === null) return "unsupported";
    return record && record.actualWeightLb > threshold ? "eligible" : "ineligible";
  }
  if (kind === "oversize") {
    if (CARRIER_SURCHARGE_SUPPORT[context.carrier].length === 0) return "unsupported";
    const longest = longestSideIn(context);
    if (longest === null || !record) return "ineligible";
    const base = context.resolution?.roundedDims ?? record.dims;
    const girth = 2 * (base.width + base.height);
    const lengthPlusGirth = base.length + girth;
    return longest > OVERSIZE_LONGEST_SIDE_IN && lengthPlusGirth > OVERSIZE_LENGTH_PLUS_GIRTH_IN
      ? "eligible"
      : "ineligible";
  }
  if (kind === "residential") {
    if (CARRIER_SURCHARGE_SUPPORT[context.carrier].length === 0) return "unsupported";
    const state = record?.residential;
    if (state === true) return "eligible";
    if (state === false) return "ineligible";
    return "unverifiable";
  }
  if (kind === "address_correction") {
    if (CARRIER_SURCHARGE_SUPPORT[context.carrier].length === 0) return "unsupported";
    const state = record?.addressCorrection;
    if (state === true) return "eligible";
    if (state === false) return "ineligible";
    return "unverifiable";
  }
  // fuel: v1 ships no published fuel-surcharge table (PRD §5 P1) — explicitly unverifiable.
  return "unverifiable";
}

function triggerText(
  kind: SurchargeKind,
  verdict: SurchargeAssessment["verdict"],
  context: SurchargeContext,
): string {
  const longest = longestSideIn(context);
  const record = context.record;
  if (verdict === "unsupported") {
    if (CARRIER_SURCHARGE_SUPPORT[context.carrier].length === 0) {
      return `${context.carrier.toUpperCase()} does not assess a ${kind.replace(/_/g, " ")} surcharge on domestic parcel shipments`;
    }
    return `${kind.replace(/_/g, " ")} is not a surcharge v1 can verify`;
  }
  if (kind === "ahs_dimension") {
    const threshold = AHS_DIMENSION_LONGEST_SIDE_IN[context.carrier];
    return `AHS-Dimension applies when the longest side exceeds ${threshold} in (${context.carrier.toUpperCase()}); this parcel's longest rounded side is ${longest ?? "unknown"} in`;
  }
  if (kind === "ahs_weight") {
    const threshold = AHS_WEIGHT_ACTUAL_LB[context.carrier];
    return `AHS-Weight applies above ${threshold} lb actual weight (${context.carrier.toUpperCase()}); this parcel weighs ${record?.actualWeightLb ?? "unknown"} lb`;
  }
  if (kind === "oversize") {
    const base = context.resolution?.roundedDims ?? record?.dims;
    const lengthPlusGirth = base ? base.length + 2 * (base.width + base.height) : null;
    return `Oversize/large-package applies above ${OVERSIZE_LONGEST_SIDE_IN} in longest side AND ${OVERSIZE_LENGTH_PLUS_GIRTH_IN} in length+girth; this parcel is ${longest ?? "unknown"} in longest side, length+girth ${lengthPlusGirth ?? "unknown"} in`;
  }
  if (kind === "residential") {
    if (verdict === "unverifiable") {
      return "the shipment record does not state whether the delivery address is residential";
    }
    return `a residential surcharge applies to a residential delivery; the shipment record marks this delivery non-residential`;
  }
  if (kind === "address_correction") {
    if (verdict === "unverifiable") {
      return "the shipment record does not state whether an address correction was performed";
    }
    return "an address-correction charge applies to a corrected address; the shipment record marks this parcel as not corrected";
  }
  return "v1 ships no published fuel-surcharge table, so a billed fuel amount cannot be verified (PRD §5 defers it to P1)";
}

/** Recomputes eligibility for one billed surcharge. */
export function assessSurcharge(args: {
  code: string;
  amountCents: number;
  context: SurchargeContext;
}): SurchargeAssessment {
  const { code, amountCents, context } = args;
  const kind = classifySurcharge(code);
  if (!kind) {
    return {
      code,
      kind: "unmapped",
      amountCents,
      eligible: false,
      verdict: "unsupported",
      trigger: `"${code}" is not in v1's surcharge code map — the amount is reported as unsupported, not as an overcharge`,
    };
  }
  const verdict = eligibleAssessed(kind, context);
  return {
    code,
    kind,
    amountCents,
    eligible: verdict === "eligible",
    verdict,
    trigger: triggerText(kind, verdict, context),
  };
}
