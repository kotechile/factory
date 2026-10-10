/**
 * The declared rate card — as the INVOICE states it, and nowhere else.
 *
 * SpendProof never holds a price list. There is no provider table, no cached tariff and no lookup:
 * the only rate the engine knows for a line is the rate that line declares. That is what makes the
 * recompute reproducible after the fact — a year later the reader can re-derive every figure from
 * the invoice they still have.
 *
 * The one thing this module DOES decide is when the invoice stops being a usable rate card: when
 * the same service/model/SKU carries more than one declared price inside the period, the ledger
 * cannot be recomputed at a single rate, and the honest answer is `price_drift` — not a variance
 * manufactured by picking one of the two rates.
 */
import type { InvoiceLine } from "./types";

/** The reconciliation unit: service/model/SKU (the granularity a provider bill can be recomputed at). */
export function lineKey(line: Pick<InvoiceLine, "service" | "model" | "sku">): string {
  return `${line.service}|${line.model}|${line.sku}`;
}

export interface DeclaredRateGroup {
  key: string;
  service: string;
  model: string;
  sku: string;
  lines: InvoiceLine[];
  /** The distinct declared prices for this key, ascending. More than one = a mid-period change. */
  unitPrices: number[];
  quantity: number;
  amountMicroUsd: number;
  /** The single declared rate, or null when the invoice declared more than one. */
  unitPriceMicroUsdPerThousandUnits: number | null;
}

/**
 * Groups the invoice's lines by reconciliation unit and reads the rate card off them.
 * Preserves first-appearance order so two runs of the same invoice produce the same report.
 */
export function buildDeclaredRateCard(lines: readonly InvoiceLine[]): DeclaredRateGroup[] {
  const groups = new Map<string, DeclaredRateGroup>();

  for (const line of lines) {
    const key = lineKey(line);
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        key,
        service: line.service,
        model: line.model,
        sku: line.sku,
        lines: [line],
        unitPrices: [line.unitPriceMicroUsdPerThousandUnits],
        quantity: line.quantity,
        amountMicroUsd: line.amountMicroUsd,
        unitPriceMicroUsdPerThousandUnits: line.unitPriceMicroUsdPerThousandUnits,
      });
      continue;
    }
    existing.lines.push(line);
    existing.quantity += line.quantity;
    existing.amountMicroUsd += line.amountMicroUsd;
    if (!existing.unitPrices.includes(line.unitPriceMicroUsdPerThousandUnits)) {
      existing.unitPrices.push(line.unitPriceMicroUsdPerThousandUnits);
    }
  }

  for (const group of groups.values()) {
    group.unitPrices.sort((a, b) => a - b);
    group.unitPriceMicroUsdPerThousandUnits =
      group.unitPrices.length === 1 ? group.unitPrices[0] : null;
  }

  return [...groups.values()];
}
