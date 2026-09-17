/**
 * Totals reconciliation — the invariant that earns trust.
 *
 * Every figure is recomputed from the invoice lines in integer cents; the document's declared
 * totals are never used to fill a gap. `delta` is the exact drift (computed − declared) in
 * currency units, reported rather than corrected.
 *
 * Country rounding (PRD §2): an aggregate VAT amount must be rounded the way the destination
 * regime rounds it. EN 16931 core behaviour is per line; Polish KSeF rounds VAT only at the total.
 * A line whose net amount is absent is derived from quantity × item net price — and if neither is
 * present the engine throws `EinvoiceFieldError` naming the rule id it violates instead of
 * inventing a value.
 *
 * v1 expects non-negative line amounts (credit-note documents with negative amounts are P1).
 */
import {
  EinvoiceFieldError,
  type EinvoiceInput,
  type InvoiceLine,
  type Reconciliation,
  type ReconciledVatGroup,
  type TargetCountry,
  type VatCategory,
  type VatRoundingPolicy,
} from "./types";
import { isFiniteNumber } from "./rules/engine";

export function toCents(value: number): number {
  return Math.round(value * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/** Half-up rounding to `decimals` places, applied to non-negative money amounts. */
export function roundHalfUp(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) {
    throw new EinvoiceFieldError("BR-FG-10", "value", `cannot round a non-finite value (${value}).`);
  }
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export const VAT_ROUNDING_POLICY: Record<TargetCountry, VatRoundingPolicy> = {
  FR: "per-line",
  BE: "per-line",
  DE: "per-line",
  PL: "total",
};

export function roundingPolicyFor(country: TargetCountry): VatRoundingPolicy {
  return VAT_ROUNDING_POLICY[country];
}

/** BT-131 in cents: declared when present, otherwise derived from quantity × item net price. */
export function lineNetCents(line: InvoiceLine, index: number): number {
  const allowances = isFiniteNumber(line.allowances) ? toCents(line.allowances) : 0;
  const charges = isFiniteNumber(line.charges) ? toCents(line.charges) : 0;
  if (isFiniteNumber(line.lineNetAmount)) return toCents(line.lineNetAmount);
  if (isFiniteNumber(line.quantity) && isFiniteNumber(line.unitPrice)) {
    return Math.round(line.quantity * line.unitPrice * 100) - allowances + charges;
  }
  throw new EinvoiceFieldError(
    "BR-24",
    `invoice.lines[${index}].lineNetAmount`,
    "the line net amount is absent and cannot be derived — neither the quantity nor the item net price is present. No default is invented.",
  );
}

interface GroupAccumulator {
  category: VatCategory;
  rate: number;
  taxableCents: number;
  taxCents: number;
}

export function reconcileInvoice(input: EinvoiceInput, country: TargetCountry): Reconciliation {
  const lines = input.invoice?.lines ?? [];
  if (lines.length === 0) {
    throw new EinvoiceFieldError("BR-16", "invoice.lines", "the invoice has no lines — there is nothing to reconcile.");
  }

  const policy = roundingPolicyFor(country);
  const nets = lines.map((line, index) => lineNetCents(line, index));
  const lineNetSumCents = nets.reduce((sum, value) => sum + value, 0);

  const lineAllowancesCents = lines.reduce(
    (sum, line) => sum + (isFiniteNumber(line.allowances) ? toCents(line.allowances) : 0),
    0,
  );
  const lineChargesCents = lines.reduce(
    (sum, line) => sum + (isFiniteNumber(line.charges) ? toCents(line.charges) : 0),
    0,
  );

  const groups = new Map<string, GroupAccumulator>();
  lines.forEach((line, index) => {
    if (!line.vatCategory) {
      throw new EinvoiceFieldError(
        "BR-FG-01",
        `invoice.lines[${index}].vatCategory`,
        "the line has no VAT category code (BT-151); a VAT breakdown cannot be derived from it.",
      );
    }
    if (!isFiniteNumber(line.vatRate)) {
      throw new EinvoiceFieldError(
        "BR-FG-02",
        `invoice.lines[${index}].vatRate`,
        "the line has no VAT rate (BT-152); the rate is not assumed to be 0.",
      );
    }
    const key = `${line.vatCategory}@${line.vatRate}`;
    const current = groups.get(key) ?? { category: line.vatCategory, rate: line.vatRate, taxableCents: 0, taxCents: 0 };
    current.taxableCents += nets[index];
    if (policy === "per-line") {
      current.taxCents += Math.round((nets[index] * line.vatRate) / 100);
    }
    groups.set(key, current);
  });

  const declaredBreakdown = input.invoice?.vatBreakdown ?? [];
  const vatByBreakdown: ReconciledVatGroup[] = [...groups.values()].map((group) => {
    const taxCents =
      policy === "per-line" ? group.taxCents : Math.round((group.taxableCents * group.rate) / 100);
    const declared = declaredBreakdown.find(
      (entry) => entry.category === group.category && isFiniteNumber(entry.rate) && entry.rate === group.rate,
    );
    const reconciled: ReconciledVatGroup = {
      category: group.category,
      rate: group.rate,
      taxableAmount: fromCents(group.taxableCents),
      taxAmount: fromCents(taxCents),
    };
    if (declared?.exemptionReason) reconciled.exemptionReason = declared.exemptionReason;
    return reconciled;
  });

  const declared = input.invoice?.totals ?? {};
  const allowancesCents = isFiniteNumber(declared.allowances)
    ? toCents(declared.allowances)
    : lineAllowancesCents;
  const chargesCents = isFiniteNumber(declared.charges) ? toCents(declared.charges) : lineChargesCents;

  const taxExclusiveCents = lineNetSumCents - allowancesCents + chargesCents;
  const vatTotalCents = vatByBreakdown.reduce((sum, group) => sum + toCents(group.taxAmount), 0);
  const grandTotalCents = taxExclusiveCents + vatTotalCents;
  const declaredGrandTotal = isFiniteNumber(declared.grandTotal) ? declared.grandTotal : null;

  return {
    roundingPolicy: policy,
    lineNetSum: fromCents(lineNetSumCents),
    allowances: fromCents(allowancesCents),
    charges: fromCents(chargesCents),
    taxExclusive: fromCents(taxExclusiveCents),
    vatByBreakdown,
    vatTotal: fromCents(vatTotalCents),
    grandTotal: fromCents(grandTotalCents),
    declaredGrandTotal,
    delta: declaredGrandTotal === null ? 0 : fromCents(grandTotalCents - toCents(declaredGrandTotal)),
  };
}
