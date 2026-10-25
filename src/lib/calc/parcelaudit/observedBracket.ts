/**
 * Pricing a line WITHOUT a contract rate card — from the carrier's own charges on the same invoice.
 *
 * The product's blocker was never the weight proof; it was that the money hook ("recover $X") needed
 * a contract rate card most shippers cannot export as CSV. This module closes that gap without
 * inventing a rate: it reads the price the carrier itself charged, on this invoice, for a parcel of
 * the same carrier/service/zone and the same billed weight, and uses THAT as the price of the
 * recomputed weight. The number on the report is therefore a charge the carrier has already billed
 * for — an observation, not an estimate.
 *
 * What it refuses to do, deliberately:
 *  - it never interpolates or extrapolates between weights (a stepped rate table is not a straight
 *    line, so a fitted rate would be a guess wearing a number's clothes);
 *  - it never uses an observation whose charges disagree — if two parcels of the same weight in the
 *    same lane were billed different base charges, the lane is not homogeneous (a freight-inclusive
 *    line, a minimum charge, a mixed rate base) and the observation is dropped, leaving the line
 *    `unmapped` and therefore unpriced;
 *  - it never covers a lane with no observation: no observation means no claim, exactly as before.
 *
 * Weights are matched on whole pounds because that is the granularity carriers bill base charges at.
 * The audit's own recomputed billable weight is rounded the same way before lookup (see
 * `resolveContractRate`), so a 12.4 lb parcel is priced from the carrier's 12 lb charge in that lane.
 */
import type { Carrier, InvoiceLine, RateCard, RateCardRow, ServiceCode } from "./types";

export interface ObservedBracketDiagnostics {
  /** Observations (lane + weight groups) that survived the homogeneity check. */
  observations: number;
  /** Invoice lines that fed an observation. */
  linesObserved: number;
  /** Lines that could not be attributed to a lane at all (no carrier/service/zone on the line). */
  linesUnattributed: number;
  /** Lane + weight groups dropped because their charges disagreed. */
  dropped: Array<{
    carrier: string;
    service: string;
    zone: string;
    weightLb: number;
    charges: number;
    spreadCents: number;
  }>;
}

export interface ObservedBracketResult {
  card: RateCard;
  diagnostics: ObservedBracketDiagnostics;
}

/** Charges at one weight in one lane must agree within this fraction of their median to be a price. */
export const OBSERVED_TOLERANCE_FRACTION = 0.02;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function laneKey(carrier: Carrier, service: ServiceCode, zone: string, pounds: number): string {
  return `${carrier}|${service}|${zone}|${pounds}`;
}

/**
 * Derives a rate card from the invoice's own charges. Deterministic and pure: the same line set
 * always yields the same rows, and the rows are the median charge of each homogeneous group.
 */
export function deriveObservedBracketCard(lines: InvoiceLine[]): ObservedBracketResult {
  const groups = new Map<
    string,
    { carrier: Carrier; service: ServiceCode; zone: string; pounds: number; charges: number[] }
  >();
  let linesObserved = 0;
  let linesUnattributed = 0;

  lines.forEach((line) => {
    const carrier = line?.carrier;
    const service = line?.service;
    const zone = typeof line?.zone === "string" ? line.zone.trim() : "";
    const weight = line?.billedWeightLb;
    const baseCents = line?.baseChargeCents;
    if (
      !carrier ||
      !service ||
      !zone ||
      typeof weight !== "number" ||
      !Number.isFinite(weight) ||
      weight <= 0 ||
      typeof baseCents !== "number" ||
      !Number.isFinite(baseCents) ||
      baseCents <= 0
    ) {
      linesUnattributed += 1;
      return;
    }
    const pounds = Math.round(weight);
    if (pounds <= 0) {
      linesUnattributed += 1;
      return;
    }
    const key = laneKey(carrier, service, zone, pounds);
    const existing = groups.get(key);
    if (existing) {
      existing.charges.push(baseCents);
    } else {
      groups.set(key, { carrier, service, zone, pounds, charges: [baseCents] });
    }
    linesObserved += 1;
  });

  const rows: RateCardRow[] = [];
  const dropped: ObservedBracketDiagnostics["dropped"] = [];
  Array.from(groups.values())
    .sort((a, b) =>
      a.carrier === b.carrier
        ? a.service === b.service
          ? a.zone === b.zone
            ? a.pounds - b.pounds
            : a.zone.localeCompare(b.zone)
          : a.service.localeCompare(b.service)
        : a.carrier.localeCompare(b.carrier),
    )
    .forEach((group) => {
      const price = median(group.charges);
      const lowest = Math.min(...group.charges);
      const highest = Math.max(...group.charges);
      const spreadCents = highest - lowest;
      if (spreadCents > Math.round(price * OBSERVED_TOLERANCE_FRACTION)) {
        dropped.push({
          carrier: group.carrier,
          service: group.service,
          zone: group.zone,
          weightLb: group.pounds,
          charges: group.charges.length,
          spreadCents,
        });
        return;
      }
      rows.push({
        carrier: group.carrier,
        service: group.service,
        zone: group.zone,
        minWeightLb: group.pounds,
        maxWeightLb: group.pounds,
        rateCents: price,
      });
    });

  return {
    card: {
      rows,
      kind: "observed-bracket",
      source: "charges the carrier itself billed on this invoice (same lane, same whole-pound weight)",
    },
    diagnostics: {
      observations: rows.length,
      linesObserved,
      linesUnattributed,
      dropped,
    },
  };
}
