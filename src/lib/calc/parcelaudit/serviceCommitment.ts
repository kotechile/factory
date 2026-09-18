/**
 * Service-commitment (money-back guarantee) eligibility.
 *
 * Input: the carrier's committed date for the service on the record (`promisedDate`) versus the
 * actual delivery (`deliveredAt`). Output: whether the delivery was late, whether the service
 * carries a money-back guarantee at all, and whether the claim is still inside the carrier's
 * filing window as of `asOfDate`.
 *
 * Two deliberate conservatisms:
 * 1. A late delivery on a service **without** a guarantee is reported as such
 *    (`late-not-covered`) and refunds nothing — v1 does not assert a claim it cannot support.
 * 2. The refundable amount is the line's **base (transportation) charge only**. Accessorials and
 *    fuel are not refunded under a money-back guarantee, so they are excluded rather than counted.
 *
 * USPS: only Priority Mail Express carries the guarantee in v1's table; Priority Mail, Ground
 * Advantage and Parcel Select are treated as not covered (stated in the coverage panel, never
 * silently claimed).
 */
import { addDays, daysBetween, parseIsoDate } from "./dates";
import {
  ParcelAuditFieldError,
  type Carrier,
  type ServiceCode,
  type ServiceCommitmentResult,
} from "./types";

export interface CommitmentRule {
  carrier: Carrier;
  service: ServiceCode;
  /** True when the service carries a money-back guarantee. */
  guaranteed: boolean;
  /** Days from delivery in which a guarantee claim must be filed. */
  moneyBackDays: number;
  source: string;
}

const UPS_AIR_SOURCE = "UPS money-back guarantee, air/express services — claim window ≈30 days";
const FEDEX_EXPRESS_SOURCE = "FedEx money-back guarantee, Express services — claim window ≈21 days";
const USPS_PME_SOURCE = "USPS Priority Mail Express money-back guarantee — 30-day claim window";
const NO_GUARANTEE_SOURCE =
  "no money-back guarantee on this service, so a late delivery refunds nothing (v1 asserts no claim)";

export const COMMITMENT_RULES: readonly CommitmentRule[] = [
  { carrier: "ups", service: "ups_ground", guaranteed: false, moneyBackDays: 30, source: NO_GUARANTEE_SOURCE },
  { carrier: "ups", service: "ups_air", guaranteed: true, moneyBackDays: 30, source: UPS_AIR_SOURCE },
  { carrier: "ups", service: "ups_express_saver", guaranteed: true, moneyBackDays: 30, source: UPS_AIR_SOURCE },
  {
    carrier: "fedex",
    service: "fedex_ground",
    guaranteed: false,
    moneyBackDays: 21,
    source: NO_GUARANTEE_SOURCE,
  },
  {
    carrier: "fedex",
    service: "fedex_home_delivery",
    guaranteed: false,
    moneyBackDays: 21,
    source: NO_GUARANTEE_SOURCE,
  },
  {
    carrier: "fedex",
    service: "fedex_express",
    guaranteed: true,
    moneyBackDays: 21,
    source: FEDEX_EXPRESS_SOURCE,
  },
  {
    carrier: "usps",
    service: "usps_priority_mail_express",
    guaranteed: true,
    moneyBackDays: 30,
    source: USPS_PME_SOURCE,
  },
  {
    carrier: "usps",
    service: "usps_priority_mail",
    guaranteed: false,
    moneyBackDays: 30,
    source: NO_GUARANTEE_SOURCE,
  },
  {
    carrier: "usps",
    service: "usps_ground_advantage",
    guaranteed: false,
    moneyBackDays: 30,
    source: NO_GUARANTEE_SOURCE,
  },
  {
    carrier: "usps",
    service: "usps_parcel_select",
    guaranteed: false,
    moneyBackDays: 30,
    source: NO_GUARANTEE_SOURCE,
  },
];

export function resolveCommitmentRule(
  carrier: Carrier,
  service: ServiceCode,
  fieldPath: string,
): CommitmentRule {
  const rule = COMMITMENT_RULES.find(
    (candidate) => candidate.carrier === carrier && candidate.service === service,
  );
  if (!rule) {
    throw new ParcelAuditFieldError(
      "pp-svc-unsupported-service",
      fieldPath,
      `no commitment rule in v1 for ${carrier}/${service}.`,
    );
  }
  return rule;
}

export interface CommitmentRequest {
  carrier: Carrier;
  service: ServiceCode;
  promisedDate?: string;
  deliveredAt?: string;
  /** The line's base (transportation) charge — the only refundable component. */
  baseChargeCents: number;
  asOfDate: string;
  /** Path prefix for thrown field errors, e.g. `shipmentRecords[0]`. */
  fieldPath: string;
}

export function evaluateServiceCommitment(request: CommitmentRequest): ServiceCommitmentResult {
  const { carrier, service, promisedDate, deliveredAt, baseChargeCents, asOfDate, fieldPath } = request;
  const rule = resolveCommitmentRule(carrier, service, `${fieldPath}.service`);

  const missing: string[] = [];
  if (promisedDate === undefined) missing.push("promisedDate");
  if (deliveredAt === undefined) missing.push("deliveredAt");
  if (missing.length > 0) {
    return {
      promisedDate: promisedDate ?? null,
      deliveredAt: deliveredAt ?? null,
      late: false,
      daysLate: 0,
      guaranteed: rule.guaranteed,
      moneyBackDays: rule.moneyBackDays,
      claimDaysRemaining: null,
      claimDeadline: null,
      refundableCents: 0,
      status: "unverifiable",
      note: `the shipment record does not carry ${missing.join(" and ")} — the commitment cannot be verified (v1 does not assume on-time delivery)`,
    };
  }

  const promised = promisedDate as string;
  const delivered = deliveredAt as string;
  parseIsoDate(promised, `${fieldPath}.promisedDate`);
  parseIsoDate(delivered, `${fieldPath}.deliveredAt`);
  parseIsoDate(asOfDate, "asOfDate");

  const daysLate = daysBetween(promised, delivered);
  if (daysLate <= 0) {
    return {
      promisedDate: promised,
      deliveredAt: delivered,
      late: false,
      daysLate: 0,
      guaranteed: rule.guaranteed,
      moneyBackDays: rule.moneyBackDays,
      claimDaysRemaining: null,
      claimDeadline: null,
      refundableCents: 0,
      status: "on-time",
      note: `delivered ${delivered}, committed ${promised} — the commitment was met`,
    };
  }

  if (!rule.guaranteed) {
    return {
      promisedDate: promised,
      deliveredAt: delivered,
      late: true,
      daysLate,
      guaranteed: false,
      moneyBackDays: rule.moneyBackDays,
      claimDaysRemaining: null,
      claimDeadline: null,
      refundableCents: 0,
      status: "late-not-covered",
      note: `delivered ${daysLate} day(s) late (${promised} → ${delivered}), but this service carries no money-back guarantee — no refund is claimed`,
    };
  }

  const daysSinceDelivery = daysBetween(delivered, asOfDate);
  const claimDaysRemaining = rule.moneyBackDays - daysSinceDelivery;
  const claimDeadline = addDays(delivered, rule.moneyBackDays);
  if (claimDaysRemaining < 0) {
    return {
      promisedDate: promised,
      deliveredAt: delivered,
      late: true,
      daysLate,
      guaranteed: true,
      moneyBackDays: rule.moneyBackDays,
      claimDaysRemaining,
      claimDeadline,
      refundableCents: 0,
      status: "late-window-closed",
      note: `delivered ${daysLate} day(s) late, but the ${rule.moneyBackDays}-day guarantee claim window closed on ${claimDeadline} (${Math.abs(claimDaysRemaining)} day(s) ago)`,
    };
  }

  return {
    promisedDate: promised,
    deliveredAt: delivered,
    late: true,
    daysLate,
    guaranteed: true,
    moneyBackDays: rule.moneyBackDays,
    claimDaysRemaining,
    claimDeadline,
    refundableCents: baseChargeCents,
    status: "late-claimable",
    note: `delivered ${daysLate} day(s) late (${promised} → ${delivered}) — ${claimDaysRemaining} day(s) left in the ${rule.moneyBackDays}-day guarantee window (closes ${claimDeadline}); the refundable amount is the base charge, not accessorials or fuel`,
  };
}
