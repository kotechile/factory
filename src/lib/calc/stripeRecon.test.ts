import { describe, it, expect } from "vitest";
import {
  reconcileStripePayout,
  stripeReconEngine,
  categorizeTransaction,
  journalToCsv,
  normalizeStripeExport,
  GL_ACCOUNTS,
  type PayoutInput,
} from "./stripeRecon";
import { executeCalculation } from "./index";
import { smallSampleFixture, workedExampleFixture } from "./stripeRecon.fixtures";

describe("LedgerLink — Stripe Payout → GL Reconciliation Engine", () => {
  it("reconciles the small hand-checked sample and maps categories to expected accounts", () => {
    const { payout, balanceTransactions } = smallSampleFixture();
    const result = reconcileStripePayout(payout, balanceTransactions);

    // Invariant: Σ(net) == payout.amount exactly.
    expect(result.reconciled).toBe(true);
    expect(result.delta).toBe(0);
    expect(result.sumNet).toBe(6678);
    expect(result.payout.amount).toBe(6678);

    // Category buckets map to the expected GL accounts (pence).
    expect(result.summary.revenue).toBe(9000); // gross charge credit
    expect(result.summary.fees).toBe(620); // 180 + 90 (charge fees) + 350 (fee txn)
    expect(result.summary.refunds).toBe(-1200); // contra-revenue (negative per spec)
    expect(result.summary.chargebacks).toBe(540); // dispute 500 gross + 40 fee
    expect(result.summary.clearings).toBe(38); // FX/adjustment remainder

    expect(result.counts.charges).toBe(2);
    expect(result.counts.refunds).toBe(1);
    expect(result.counts.chargebacks).toBe(1);
    expect(result.counts.fees).toBe(1);
    expect(result.counts.adjustments).toBe(1);

    // Journal lines: 2 charges × (revenue + fee) + 1 refund + 1 chargeback + 1 fee + 1 adjustment.
    expect(result.journalLines).toHaveLength(8);

    const accounts = result.journalLines.map((l) => l.account);
    expect(accounts.filter((a) => a === GL_ACCOUNTS.REVENUE)).toHaveLength(2);
    expect(accounts.filter((a) => a === GL_ACCOUNTS.STRIPE_FEES)).toHaveLength(3);
    expect(accounts.filter((a) => a === GL_ACCOUNTS.REFUNDS)).toHaveLength(1);
    expect(accounts.filter((a) => a === GL_ACCOUNTS.CHARGEBACKS)).toHaveLength(1);
    expect(accounts.filter((a) => a === GL_ACCOUNTS.CLEARING)).toHaveLength(1);
  });

  it("reconciles the £4,378.21 worked example (87 charges + 4 refunds + 3 chargebacks + 162 fees + 1 FX)", () => {
    const { payout, balanceTransactions } = workedExampleFixture();
    const result = reconcileStripePayout(payout, balanceTransactions);

    expect(result.reconciled).toBe(true);
    expect(result.delta).toBe(0);
    expect(result.sumNet).toBe(437821); // £4,378.21 in pence
    expect(result.payout.amount).toBe(437821);

    // Exact GL totals (known-answer vectors).
    expect(result.summary.revenue).toBe(396191);
    expect(result.summary.fees).toBe(113107);
    expect(result.summary.refunds).toBe(-7700);
    expect(result.summary.chargebacks).toBe(11350);
    expect(result.summary.clearings).toBe(173787);

    // Composition matches the real worked example.
    expect(result.counts.charges).toBe(87);
    expect(result.counts.refunds).toBe(4);
    expect(result.counts.chargebacks).toBe(3);
    expect(result.counts.fees).toBe(162);
    expect(result.counts.adjustments).toBe(1);

    // Revenue − fees − |refunds| − chargebacks + clearings == payout net.
    const s = result.summary;
    const identity = s.revenue - s.fees - Math.abs(s.refunds) - s.chargebacks + s.clearings;
    expect(identity).toBe(437821);
  });

  it("the journal lines' net sums to the payout amount (debit/credit balance)", () => {
    const { payout, balanceTransactions } = workedExampleFixture();
    const result = reconcileStripePayout(payout, balanceTransactions);

    const lineNet = result.journalLines.reduce((sum, l) => sum + (l.credit - l.debit), 0);
    expect(lineNet).toBe(payout.amount);
  });

  it("surfaces a mismatch with a non-zero delta instead of a silent fallback", () => {
    const { balanceTransactions } = smallSampleFixture();
    const badPayout: PayoutInput = {
      id: "po_bad",
      amount: 6678 + 100, // off by £1.00
      currency: "gbp",
      arrivalDate: "2026-08-01",
    };
    const result = reconcileStripePayout(badPayout, balanceTransactions);
    expect(result.reconciled).toBe(false);
    expect(result.delta).toBe(100);
  });

  it("categorizes a standalone fee transaction into the Stripe Fees account", () => {
    const allocations = categorizeTransaction(
      { id: "txn_fe", type: "fee", amount: -350, net: -350, created: 1752000000 },
      "2026-08-01",
    );
    expect(allocations.allocations).toHaveLength(1);
    expect(allocations.allocations[0].account).toBe(GL_ACCOUNTS.STRIPE_FEES);
    expect(allocations.allocations[0].amount).toBe(-350);
  });

  it("exports a Xero/QB-ready journal CSV", () => {
    const { payout, balanceTransactions } = smallSampleFixture();
    const result = reconcileStripePayout(payout, balanceTransactions);
    const csv = journalToCsv(result.journalLines);

    const lines = csv.split("\n");
    expect(lines[0]).toBe("Date,Account,Debit,Credit,Reference");
    expect(lines).toHaveLength(result.journalLines.length + 1);
    expect(csv).toContain('"Revenue"');
    expect(csv).toContain('"Stripe Fees"');
    // A charge line: gross credit on Revenue (60.00), £0.00 debit.
    expect(csv).toContain('60.00');
  });

  it("normalizes a pasted Stripe JSON export into engine inputs", () => {
    const { payout, balanceTransactions } = smallSampleFixture();
    const exportJson = {
      payout: { ...payout, amount: 6678 },
      balance_transactions: balanceTransactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        fee: t.fee,
        net: t.net,
        created: t.created,
      })),
    };
    const normalized = normalizeStripeExport(exportJson);
    expect(normalized.payout.amount).toBe(6678);
    expect(normalized.balanceTransactions).toHaveLength(balanceTransactions.length);

    const result = reconcileStripePayout(normalized.payout, normalized.balanceTransactions);
    expect(result.reconciled).toBe(true);
    expect(result.delta).toBe(0);
  });

  it("rejects an invalid export with an explicit error (no silent fallback)", () => {
    expect(() => normalizeStripeExport({ payout: { amount: 100 } })).toThrow(
      /balance_transactions/,
    );
    expect(() => normalizeStripeExport({ balance_transactions: [] })).toThrow(/payout/);
  });

  it("conforms to the factory CalculationEngine contract", () => {
    const { payout, balanceTransactions } = smallSampleFixture();
    const res = executeCalculation(stripeReconEngine, { payout, balanceTransactions });
    expect(res.success).toBe(true);
    expect(res.data?.reconciled).toBe(true);
    expect(res.data?.delta).toBe(0);
  });

  it("fails validation cleanly on malformed input", () => {
    const validation = stripeReconEngine.validate({
      payout: { id: "po_x", amount: Number.NaN, currency: "gbp" },
      balanceTransactions: [],
    });
    expect(validation.valid).toBe(false);
    expect(validation.errors?.[0]).toContain("payout.amount");
  });
});
