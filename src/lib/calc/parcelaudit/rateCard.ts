/**
 * Contract rate-card verification (the `unverifiable-rate` rule).
 *
 * The audit can prove a weight is wrong without any rate card. It cannot prove *what the line
 * should have cost* — only the customer's own contracted rates can. So:
 *
 * - No rate card supplied → the line's money is `unverifiable-rate`: flagged (advisory), never
 *   guessed, and explicitly **not** counted as a zero-dollar overcharge.
 * - Rate card supplied but no row matches the carrier/service/zone/weight bracket →
 *   `unmapped`: also flagged, also never guessed.
 * - A matching row → the base charge is recomputed and the delta becomes claimable.
 *
 * Zones are never derived in v1 (zone-matrix derivation is P1): a mismatch between the record's
 * zone and the invoice's zone is reported as `pp-zone-mismatch` and priced from the **record's**
 * zone, which is the shipper's own manifest.
 */
import {
  ParcelAuditFieldError,
  type Carrier,
  type RateCard,
  type RateCardRow,
  type RateVerification,
  type ServiceCode,
} from "./types";
import { isCarrier, isServiceCode } from "./dimWeight";

export interface RateResolution {
  status: RateVerification;
  rateCents: number | null;
  rowIndex: number | null;
  weightLb: number;
  zone: string;
  note: string;
}

function assertRateCardRow(row: RateCardRow, fieldPath: string): void {
  if (!isCarrier(row.carrier)) {
    throw new ParcelAuditFieldError(
      "pp-field-invalid",
      `${fieldPath}.carrier`,
      `unknown carrier ${JSON.stringify(row.carrier)}.`,
    );
  }
  if (!isServiceCode(row.service)) {
    throw new ParcelAuditFieldError(
      "pp-field-invalid",
      `${fieldPath}.service`,
      `unknown service ${JSON.stringify(row.service)}.`,
    );
  }
  if (typeof row.zone !== "string" || !row.zone.trim()) {
    throw new ParcelAuditFieldError("pp-field-missing", `${fieldPath}.zone`, "a rate row needs a zone.");
  }
  if (typeof row.minWeightLb !== "number" || !Number.isFinite(row.minWeightLb) || row.minWeightLb < 0) {
    throw new ParcelAuditFieldError(
      "pp-field-invalid",
      `${fieldPath}.minWeightLb`,
      "a rate row needs a finite non-negative minimum weight.",
    );
  }
  if (
    row.maxWeightLb !== null &&
    (typeof row.maxWeightLb !== "number" || !Number.isFinite(row.maxWeightLb) || row.maxWeightLb < row.minWeightLb)
  ) {
    throw new ParcelAuditFieldError(
      "pp-field-invalid",
      `${fieldPath}.maxWeightLb`,
      "max weight must be null (= and above) or a finite number >= min weight.",
    );
  }
  if (typeof row.rateCents !== "number" || !Number.isFinite(row.rateCents) || row.rateCents <= 0) {
    throw new ParcelAuditFieldError(
      "pp-field-invalid",
      `${fieldPath}.rateCents`,
      "a rate row needs a positive rate.",
    );
  }
}

export function assertRateCard(rateCard: RateCard): void {
  if (!Array.isArray(rateCard.rows)) {
    throw new ParcelAuditFieldError("pp-field-invalid", "rateCard.rows", "rateCard.rows must be an array.");
  }
  rateCard.rows.forEach((row, index) => assertRateCardRow(row, `rateCard.rows[${index}]`));
}

export function resolveContractRate(args: {
  rateCard?: RateCard;
  carrier: Carrier;
  service: ServiceCode;
  zone: string;
  weightLb: number;
}): RateResolution {
  const { rateCard, carrier, service, zone, weightLb } = args;
  if (!rateCard) {
    return {
      status: "unverifiable-rate",
      rateCents: null,
      rowIndex: null,
      weightLb,
      zone,
      note:
        "no contract rate card was supplied, so the recomputed weight cannot be priced — the line is reported unverifiable rather than assumed correct",
    };
  }
  const candidates = rateCard.rows
    .map((row, index) => ({ row, index }))
    .filter(
      (entry) =>
        entry.row.carrier === carrier && entry.row.service === service && entry.row.zone === zone,
    );
  if (candidates.length === 0) {
    return {
      status: "unmapped",
      rateCents: null,
      rowIndex: null,
      weightLb,
      zone,
      note: `the rate card has no ${carrier}/${service}/zone ${zone} row`,
    };
  }
  const bracket = candidates.find(
    (entry) =>
      weightLb >= entry.row.minWeightLb &&
      (entry.row.maxWeightLb === null || weightLb <= entry.row.maxWeightLb),
  );
  if (!bracket) {
    return {
      status: "unmapped",
      rateCents: null,
      rowIndex: null,
      weightLb,
      zone,
      note: `no ${carrier}/${service}/zone ${zone} rate row covers ${weightLb} lb`,
    };
  }
  return {
    status: "verified",
    rateCents: bracket.row.rateCents,
    rowIndex: bracket.index,
    weightLb,
    zone,
    note: `contract rate for ${carrier}/${service}/zone ${zone} at ${weightLb} lb`,
  };
}
